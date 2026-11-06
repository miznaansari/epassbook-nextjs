import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getMonthlyBalances } from '@/lib/balances';
import { spendGroupOf } from '@/lib/spendCategories';

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
function getMonthName(num) {
  return monthNames[num] || `Month ${num}`;
}

const ENTRY_TYPES = ['LENDING', 'LOAN', 'SPENDING', 'ADVANCE', 'SAVINGS'];
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
// Newest first; id breaks ties so cursor pagination is stable.
const ENTRY_ORDER = [{ date: 'desc' }, { id: 'desc' }];
// Entries logged by the AI assistant before the isAiGenerated flag existed.
const AI_DESCRIPTION_MARKERS = ['logged via ai', 'ai assistant', 'gemini'];
const AI_DESCRIPTION_RE = /logged via ai|ai assistant|gemini/i;

/**
 * Adds isAiGenerated (normalised) and, for LENDING entries, their repayments and
 * unpaid amount. Repayments for the whole batch come from ONE query.
 */
async function enrichEntries(entries) {
  const lendingIds = entries.filter(e => e.type === 'LENDING').map(e => e.id);
  const repaymentsByParent = new Map();

  if (lendingIds.length > 0) {
    const repayments = await db.financialEntry.findMany({
      where: { parentEntryId: { in: lendingIds } },
      select: { id: true, parentEntryId: true, amount: true, title: true, date: true, description: true },
      orderBy: { id: 'asc' },
    });
    for (const r of repayments) {
      const list = repaymentsByParent.get(r.parentEntryId) || [];
      list.push(r);
      repaymentsByParent.set(r.parentEntryId, list);
    }
  }

  return entries.map((entry) => {
    const isAi = Boolean(entry.isAiGenerated || AI_DESCRIPTION_RE.test(entry.description || ''));
    if (entry.type !== 'LENDING') {
      return { ...entry, isAiGenerated: isAi };
    }
    const repayments = repaymentsByParent.get(entry.id) || [];
    const totalRepaid = repayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    return {
      ...entry,
      isAiGenerated: isAi,
      unpaidAmount: Math.max(0, parseFloat(entry.amount) - totalRepaid),
      repayments: repayments.map(r => ({
        id: r.id,
        amount: parseFloat(r.amount),
        title: r.title,
        date: r.date,
        description: r.description,
      })),
    };
  });
}

/** Key for a salary deduction bucket. */
const refundKey = (d) => `${d.year}-${d.month}-${d.type}`;

/**
 * Amount already refunded per salary bucket by earlier repayments of a lending,
 * in ONE query (previously one query per parent deduction per repayment).
 */
async function refundedByMonth(repaymentIds) {
  const totals = new Map();
  if (repaymentIds.length === 0) return totals;
  const rows = await db.salaryDeduction.findMany({
    where: { entryId: { in: repaymentIds } },
    select: { month: true, year: true, type: true, amount: true },
  });
  for (const d of rows) {
    const key = refundKey(d);
    totals.set(key, (totals.get(key) || 0) + Math.abs(parseFloat(d.amount)));
  }
  return totals;
}

// GET: Fetch entries for the authenticated user, optionally filtered by type, date range, or salary month/year.
//
// Without `limit` the full list is returned as an array (used by reports).
// With `limit` the response is paginated: { items, nextCursor, total }.
//   limit   page size (1-200, default 50)
//   cursor  id of the last entry from the previous page
//   q       search in title / description
//   ai=1    only entries added by the AI assistant
//   type    one type, or several comma-separated (e.g. LOAN,ADVANCE)
// Paginated items also carry `spendGroup` (dashboard category, SPENDING only) and
// `itemKey` (AI item icon key) from the entry's SpendTag.
// `total` is only computed for the first page (no cursor); later pages return null.
export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const salaryMonth = searchParams.get('salaryMonth');
    const salaryYear = searchParams.get('salaryYear');
    const q = (searchParams.get('q') || '').trim().slice(0, 100);
    const aiOnly = searchParams.get('ai') === '1';
    const limitParam = searchParams.get('limit');
    const cursorParam = searchParams.get('cursor');

    const where = { userId: user.id };
    const conditions = [];

    if (type) {
      const types = [...new Set(type.split(',').map(t => t.trim()).filter(Boolean))];
      if (!types.length || types.some(t => !ENTRY_TYPES.includes(t))) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }
      where.type = types.length === 1 ? types[0] : { in: types };
    }

    if (q) {
      // Title, note, AI merchant/item tag ("Family & People", "Atta") and, for a number, the exact amount.
      const match = [
        { title: { contains: q } },
        { description: { contains: q } },
        { spendTag: { is: { merchant: { contains: q } } } },
        { spendTag: { is: { item: { contains: q } } } },
      ];
      const asAmount = q.replace(/[₹,\s]/g, '');
      if (/^\d+(\.\d{1,2})?$/.test(asAmount)) match.push({ amount: { equals: asAmount } });
      conditions.push({ OR: match });
    }
    if (aiOnly) {
      conditions.push({
        OR: [
          { isAiGenerated: true },
          ...AI_DESCRIPTION_MARKERS.map(marker => ({ description: { contains: marker } })),
        ],
      });
    }
    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // Filter by date range (for cycles and dashboard filtering)
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Filter by specific salary balance linked deductions
    if (salaryMonth) where.salaryMonth = parseInt(salaryMonth);
    if (salaryYear) where.salaryYear = parseInt(salaryYear);

    // Unpaginated (legacy) response: the full list as an array.
    if (limitParam === null) {
      const entries = await db.financialEntry.findMany({
        where,
        include: { deductions: true },
        orderBy: ENTRY_ORDER,
      });
      return NextResponse.json(await enrichEntries(entries));
    }

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const cursor = parseInt(cursorParam, 10);
    const hasCursor = Number.isInteger(cursor) && cursor > 0;

    const [rows, total] = await Promise.all([
      db.financialEntry.findMany({
        where,
        include: { deductions: true, spendTag: { select: { merchant: true, merchantSlug: true, item: true, itemKey: true } } },
        orderBy: ENTRY_ORDER,
        take: limit + 1, // one extra row tells us whether another page exists
        ...(hasCursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      hasCursor ? Promise.resolve(null) : db.financialEntry.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const items = (await enrichEntries(page)).map(({ spendTag, ...entry }) => ({
      ...entry,
      spendGroup: entry.type === 'SPENDING' ? spendGroupOf(entry, spendTag) : null,
      itemKey: spendTag?.itemKey || null,
    }));

    return NextResponse.json({
      items,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      total,
    });
  } catch (error) {
    console.error('Error in /api/entries GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new financial entry for the authenticated user
export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      amount,
      title,
      description,
      type,
      useSalaryBalance,
      salaryMonth,
      salaryYear,
      deductions,
      date,
      parentEntryId,
      isAiGenerated,
    } = await req.json();

    if (amount === undefined || !title || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid financial amount' }, { status: 400 });
    }

    const validTypes = ['LENDING', 'LOAN', 'SPENDING', 'ADVANCE', 'SAVINGS'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 });
    }

    const entryData = {
      userId: user.id,
      amount: parsedAmount,
      title,
      description: description || '',
      type,
      useSalaryBalance: !!useSalaryBalance,
      date: date ? new Date(date) : new Date(),
      isAiGenerated: Boolean(isAiGenerated || /logged via ai|ai assistant|gemini/i.test(description || '')),
    };

    let deductionsToCreate = [];

    // If this is a repayment of a lending transaction
    if (parentEntryId) {
      const parentId = parseInt(parentEntryId);
      const parentEntry = await db.financialEntry.findUnique({
        where: { id: parentId },
        include: { deductions: true }
      });
      if (!parentEntry || parentEntry.userId !== user.id) {
        return NextResponse.json({ error: 'Parent lending entry not found' }, { status: 400 });
      }
      if (parentEntry.type !== 'LENDING') {
        return NextResponse.json({ error: 'Parent entry must be a lending transaction' }, { status: 400 });
      }

      // Check remaining unpaid amount
      const existingRepayments = await db.financialEntry.findMany({
        where: { parentEntryId: parentId },
        select: { id: true, amount: true },
      });
      const totalRepaidSoFar = existingRepayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const originalLendingAmt = parseFloat(parentEntry.amount);
      const remainingUnpaid = originalLendingAmt - totalRepaidSoFar;

      if (parsedAmount > remainingUnpaid + 0.01) {
        return NextResponse.json({
          error: 'REPAYMENT_EXCEEDS_UNPAID',
          message: `Repayment amount (${parsedAmount}) exceeds the remaining unpaid amount (${remainingUnpaid.toFixed(2)}).`
        }, { status: 400 });
      }

      entryData.parentEntryId = parentId;

      // Refund to the original deduction months/types
      if (parentEntry.useSalaryBalance) {
        let remainingRepayment = parsedAmount;
        const refundedSoFar = await refundedByMonth(existingRepayments.map(r => r.id));

        for (const pd of parentEntry.deductions) {
          if (remainingRepayment <= 0) break;

          const pdAmt = parseFloat(pd.amount);
          const alreadyRefunded = refundedSoFar.get(refundKey(pd)) || 0;

          const maxRefundable = Math.max(0, pdAmt - alreadyRefunded);
          const refundAmt = Math.min(remainingRepayment, maxRefundable);
          if (refundAmt > 0) {
            deductionsToCreate.push({
              month: pd.month,
              year: pd.year,
              amount: -refundAmt, // Negative deduction credits money back!
              type: pd.type
            });
            remainingRepayment -= refundAmt;
          }
        }

        if (deductionsToCreate.length > 0) {
          entryData.useSalaryBalance = true;
          entryData.salaryMonth = deductionsToCreate[0].month;
          entryData.salaryYear = deductionsToCreate[0].year;
        }
      }
    } else if (useSalaryBalance) {
      if (!deductions || deductions.length === 0) {
        // Simple/automatic split case: deduct from selected month
        if (!salaryMonth || !salaryYear) {
          return NextResponse.json({ error: 'Salary month and year are required when Use Salary Balance is checked' }, { status: 400 });
        }
        const m = parseInt(salaryMonth);
        const y = parseInt(salaryYear);
        entryData.salaryMonth = m;
        entryData.salaryYear = y;

        // Fetch current balances
        const balances = await getMonthlyBalances(user.id);
        const mBal = balances.find(b => b.month === m && b.year === y);
        const salRem = mBal ? mBal.salary.remaining : 0;
        const bonRem = mBal ? mBal.bonus.remaining : 0;

        if (salRem + bonRem < parsedAmount) {
          return NextResponse.json({
            error: 'INSUFFICIENT_BALANCE',
            message: `You don't have enough only in ${getMonthName(m)}.`,
            availableBalances: balances.filter(b => b.salary.remaining > 0 || b.bonus.remaining > 0)
          }, { status: 400 });
        }

        let rem = parsedAmount;
        if (salRem > 0) {
          const deductSal = Math.min(rem, salRem);
          deductionsToCreate.push({
            month: m,
            year: y,
            amount: deductSal,
            type: 'SALARY'
          });
          rem -= deductSal;
        }
        if (rem > 0 && bonRem > 0) {
          const deductBon = Math.min(rem, bonRem);
          deductionsToCreate.push({
            month: m,
            year: y,
            amount: deductBon,
            type: 'BONUS'
          });
          rem -= deductBon;
        }
      } else {
        // Explicit multi-month split deductions provided
        const balances = await getMonthlyBalances(user.id);
        let totalDeducted = 0;

        for (const d of deductions) {
          const parsedAmt = parseFloat(d.amount);
          if (isNaN(parsedAmt) || parsedAmt <= 0) continue;

          const m = parseInt(d.month);
          const y = parseInt(d.year);

          const mBal = balances.find(b => b.month === m && b.year === y);
          const salRem = mBal ? mBal.salary.remaining : 0;
          const bonRem = mBal ? mBal.bonus.remaining : 0;

          if (salRem + bonRem < parsedAmt) {
            return NextResponse.json({ error: `Insufficient balance in ${getMonthName(m)} ${y}` }, { status: 400 });
          }

          let rem = parsedAmt;
          if (salRem > 0) {
            const deductSal = Math.min(rem, salRem);
            deductionsToCreate.push({
              month: m,
              year: y,
              amount: deductSal,
              type: 'SALARY'
            });
            rem -= deductSal;
          }
          if (rem > 0 && bonRem > 0) {
            const deductBon = Math.min(rem, bonRem);
            deductionsToCreate.push({
              month: m,
              year: y,
              amount: deductBon,
              type: 'BONUS'
            });
            rem -= deductBon;
          }
          totalDeducted += parsedAmt;
        }

        if (Math.abs(totalDeducted - parsedAmount) > 0.01) {
          return NextResponse.json({ error: 'Sum of split deductions must equal total transaction amount' }, { status: 400 });
        }

        // Use the first selected month/year as metadata in the transaction entry
        if (deductions.length > 0) {
          entryData.salaryMonth = parseInt(deductions[0].month);
          entryData.salaryYear = parseInt(deductions[0].year);
        }
      }
    }

    // Execute creating entry and deductions inside a database transaction
    const entry = await db.$transaction(async (tx) => {
      const createdEntry = await tx.financialEntry.create({
        data: entryData,
      });

      if (useSalaryBalance && deductionsToCreate.length > 0) {
        await tx.salaryDeduction.createMany({
          data: deductionsToCreate.map(d => ({
            entryId: createdEntry.id,
            month: d.month,
            year: d.year,
            amount: d.amount,
            type: d.type
          }))
        });
      }

      return createdEntry;
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error in /api/entries POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing financial entry for the authenticated user
export async function PUT(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      amount,
      title,
      description,
      type,
      useSalaryBalance,
      salaryMonth,
      salaryYear,
      deductions,
      date,
      isAiGenerated
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    const existingEntry = await db.financialEntry.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEntry || existingEntry.userId !== user.id) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid financial amount' }, { status: 400 });
    }

    const validTypes = ['LENDING', 'LOAN', 'SPENDING', 'ADVANCE', 'SAVINGS'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 });
    }

    // Prepare update data
    const updateData = {
      amount: parsedAmount,
      title,
      description: description || '',
      type,
      useSalaryBalance: !!useSalaryBalance,
      date: date ? new Date(date) : existingEntry.date,
      salaryMonth: null,
      salaryYear: null,
      ...(isAiGenerated !== undefined ? { isAiGenerated: Boolean(isAiGenerated) } : {})
    };

    let deductionsToCreate = [];

    const parentEntryId = existingEntry.parentEntryId;

    if (parentEntryId) {
      const parentId = parseInt(parentEntryId);
      const parentEntry = await db.financialEntry.findUnique({
        where: { id: parentId },
        include: { deductions: true }
      });
      if (!parentEntry || parentEntry.userId !== user.id) {
        return NextResponse.json({ error: 'Parent lending entry not found' }, { status: 400 });
      }

      // Check remaining unpaid amount (excluding this repayment entry itself)
      const existingRepayments = await db.financialEntry.findMany({
        where: { parentEntryId: parentId, id: { not: existingEntry.id } },
        select: { id: true, amount: true },
      });
      const totalRepaidSoFar = existingRepayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const originalLendingAmt = parseFloat(parentEntry.amount);
      const remainingUnpaid = originalLendingAmt - totalRepaidSoFar;

      if (parsedAmount > remainingUnpaid + 0.01) {
        return NextResponse.json({
          error: 'REPAYMENT_EXCEEDS_UNPAID',
          message: `Repayment amount (${parsedAmount}) exceeds the remaining unpaid amount (${remainingUnpaid.toFixed(2)}).`
        }, { status: 400 });
      }

      updateData.parentEntryId = parentId;

      if (parentEntry.useSalaryBalance) {
        let remainingRepayment = parsedAmount;
        const refundedSoFar = await refundedByMonth(existingRepayments.map(r => r.id));

        for (const pd of parentEntry.deductions) {
          if (remainingRepayment <= 0) break;

          const pdAmt = parseFloat(pd.amount);
          const alreadyRefunded = refundedSoFar.get(refundKey(pd)) || 0;

          const maxRefundable = Math.max(0, pdAmt - alreadyRefunded);
          const refundAmt = Math.min(remainingRepayment, maxRefundable);
          if (refundAmt > 0) {
            deductionsToCreate.push({
              month: pd.month,
              year: pd.year,
              amount: -refundAmt,
              type: pd.type
            });
            remainingRepayment -= refundAmt;
          }
        }

        if (deductionsToCreate.length > 0) {
          updateData.useSalaryBalance = true;
          updateData.salaryMonth = deductionsToCreate[0].month;
          updateData.salaryYear = deductionsToCreate[0].year;
        }
      }
    } else if (useSalaryBalance) {
      if (!deductions || deductions.length === 0) {
        // Simple/automatic split case: deduct from selected month
        if (!salaryMonth || !salaryYear) {
          return NextResponse.json({ error: 'Salary month and year are required when Use Salary Balance is checked' }, { status: 400 });
        }
        const m = parseInt(salaryMonth);
        const y = parseInt(salaryYear);
        updateData.salaryMonth = m;
        updateData.salaryYear = y;

        // Fetch current balances (excluding this entry's existing deductions)
        const balances = await getMonthlyBalances(user.id, existingEntry.id);
        const mBal = balances.find(b => b.month === m && b.year === y);
        const salRem = mBal ? mBal.salary.remaining : 0;
        const bonRem = mBal ? mBal.bonus.remaining : 0;

        if (salRem + bonRem < parsedAmount) {
          return NextResponse.json({
            error: 'INSUFFICIENT_BALANCE',
            message: `You don't have enough only in ${getMonthName(m)}.`,
            availableBalances: balances.filter(b => b.salary.remaining > 0 || b.bonus.remaining > 0)
          }, { status: 400 });
        }

        let rem = parsedAmount;
        if (salRem > 0) {
          const deductSal = Math.min(rem, salRem);
          deductionsToCreate.push({
            month: m,
            year: y,
            amount: deductSal,
            type: 'SALARY'
          });
          rem -= deductSal;
        }
        if (rem > 0 && bonRem > 0) {
          const deductBon = Math.min(rem, bonRem);
          deductionsToCreate.push({
            month: m,
            year: y,
            amount: deductBon,
            type: 'BONUS'
          });
          rem -= deductBon;
        }
      } else {
        // Explicit multi-month split deductions provided
        const balances = await getMonthlyBalances(user.id, existingEntry.id);
        let totalDeducted = 0;

        for (const d of deductions) {
          const parsedAmt = parseFloat(d.amount);
          if (isNaN(parsedAmt) || parsedAmt <= 0) continue;

          const m = parseInt(d.month);
          const y = parseInt(d.year);

          const mBal = balances.find(b => b.month === m && b.year === y);
          const salRem = mBal ? mBal.salary.remaining : 0;
          const bonRem = mBal ? mBal.bonus.remaining : 0;

          if (salRem + bonRem < parsedAmt) {
            return NextResponse.json({ error: `Insufficient balance in ${getMonthName(m)} ${y}` }, { status: 400 });
          }

          let rem = parsedAmt;
          if (salRem > 0) {
            const deductSal = Math.min(rem, salRem);
            deductionsToCreate.push({
              month: m,
              year: y,
              amount: deductSal,
              type: 'SALARY'
            });
            rem -= deductSal;
          }
          if (rem > 0 && bonRem > 0) {
            const deductBon = Math.min(rem, bonRem);
            deductionsToCreate.push({
              month: m,
              year: y,
              amount: deductBon,
              type: 'BONUS'
            });
            rem -= deductBon;
          }
          totalDeducted += parsedAmt;
        }

        if (Math.abs(totalDeducted - parsedAmount) > 0.01) {
          return NextResponse.json({ error: 'Sum of split deductions must equal total transaction amount' }, { status: 400 });
        }

        // Use the first selected month/year as metadata in the transaction entry
        if (deductions.length > 0) {
          updateData.salaryMonth = parseInt(deductions[0].month);
          updateData.salaryYear = parseInt(deductions[0].year);
        }
      }
    }

    // Execute editing entry and deductions inside a database transaction
    const entry = await db.$transaction(async (tx) => {
      // 1. Delete all previous deductions for this entry
      await tx.salaryDeduction.deleteMany({
        where: { entryId: existingEntry.id }
      });

      // 2. Create new deductions if using salary balance
      if (useSalaryBalance && deductionsToCreate.length > 0) {
        await tx.salaryDeduction.createMany({
          data: deductionsToCreate.map(d => ({
            entryId: existingEntry.id,
            month: d.month,
            year: d.year,
            amount: d.amount,
            type: d.type
          }))
        });
      }

      // 3. Update entry fields
      const updatedEntry = await tx.financialEntry.update({
        where: { id: existingEntry.id },
        data: updateData,
      });

      return updatedEntry;
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error in /api/entries PUT:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete a financial entry or multiple entries belonging to the authenticated user
export async function DELETE(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let idsToDelete = [];

    if (idsParam) {
      idsToDelete = idsParam
        .split(',')
        .map((val) => parseInt(val.trim(), 10))
        .filter((num) => !isNaN(num));
    } else if (id) {
      const singleId = parseInt(id, 10);
      if (!isNaN(singleId)) {
        idsToDelete.push(singleId);
      }
    } else {
      // Also support JSON body if passed { ids: [1, 2, 3] } or { id: 1 }
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsToDelete = body.ids
            .map((val) => parseInt(val, 10))
            .filter((num) => !isNaN(num));
        } else if (body.id) {
          const parsed = parseInt(body.id, 10);
          if (!isNaN(parsed)) idsToDelete.push(parsed);
        }
      } catch (e) {
        // Request body might be empty, ignore
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Missing entry id or ids' }, { status: 400 });
    }

    // Verify ownership of the financial entries before deleting
    const existingEntries = await db.financialEntry.findMany({
      where: {
        id: { in: idsToDelete },
        userId: user.id,
      },
      select: { id: true },
    });

    if (existingEntries.length === 0) {
      return NextResponse.json(
        { error: 'No matching entries found or forbidden' },
        { status: 404 }
      );
    }

    const validIds = existingEntries.map((e) => e.id);

    // Delete child repayments, deductions, and entries inside a single database transaction
    await db.$transaction(async (tx) => {
      // 1. Delete child repayments for any lending entry being deleted
      await tx.financialEntry.deleteMany({
        where: {
          parentEntryId: { in: validIds },
          userId: user.id,
        },
      });

      // 2. Delete linked salary deductions
      await tx.salaryDeduction.deleteMany({
        where: {
          entryId: { in: validIds },
        },
      });

      // 3. Delete the financial entries
      await tx.financialEntry.deleteMany({
        where: {
          id: { in: validIds },
          userId: user.id,
        },
      });
    });

    return NextResponse.json({ success: true, count: validIds.length });
  } catch (error) {
    console.error('Error in /api/entries DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
