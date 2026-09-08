import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getMonthlyBalances } from '@/lib/balances';

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
function getMonthName(num) {
  return monthNames[num] || `Month ${num}`;
}

// GET: Fetch entries for the authenticated user, optionally filtered by type, date range, or salary month/year
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

    const where = { userId: user.id };

    if (type) {
      where.type = type;
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

    const entries = await db.financialEntry.findMany({
      where,
      include: { deductions: true },
      orderBy: { date: 'desc' },
    });

    const enriched = await Promise.all(entries.map(async (entry) => {
      const isAi = Boolean(entry.isAiGenerated || /logged via ai|ai assistant|gemini/i.test(entry.description || ''));
      if (entry.type === 'LENDING') {
        const repayments = await db.financialEntry.findMany({
          where: { parentEntryId: entry.id }
        });
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
            description: r.description
          }))
        };
      }
      return {
        ...entry,
        isAiGenerated: isAi,
      };
    }));

    return NextResponse.json(enriched);
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
      if (!parentEntry) {
        return NextResponse.json({ error: 'Parent lending entry not found' }, { status: 400 });
      }
      if (parentEntry.type !== 'LENDING') {
        return NextResponse.json({ error: 'Parent entry must be a lending transaction' }, { status: 400 });
      }

      // Check remaining unpaid amount
      const existingRepayments = await db.financialEntry.findMany({
        where: { parentEntryId: parentId }
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

        for (const pd of parentEntry.deductions) {
          if (remainingRepayment <= 0) break;

          const pdAmt = parseFloat(pd.amount);
          let alreadyRefunded = 0;
          for (const prevRepay of existingRepayments) {
            const prevDeductions = await db.salaryDeduction.findMany({
              where: {
                entryId: prevRepay.id,
                month: pd.month,
                year: pd.year,
                type: pd.type
              }
            });
            prevDeductions.forEach(d => alreadyRefunded += Math.abs(parseFloat(d.amount)));
          }

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
      if (!parentEntry) {
        return NextResponse.json({ error: 'Parent lending entry not found' }, { status: 400 });
      }

      // Check remaining unpaid amount (excluding this repayment entry itself)
      const existingRepayments = await db.financialEntry.findMany({
        where: { parentEntryId: parentId, id: { not: existingEntry.id } }
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

        for (const pd of parentEntry.deductions) {
          if (remainingRepayment <= 0) break;

          const pdAmt = parseFloat(pd.amount);
          let alreadyRefunded = 0;
          for (const prevRepay of existingRepayments) {
            const prevDeductions = await db.salaryDeduction.findMany({
              where: {
                entryId: prevRepay.id,
                month: pd.month,
                year: pd.year,
                type: pd.type
              }
            });
            prevDeductions.forEach(d => alreadyRefunded += Math.abs(parseFloat(d.amount)));
          }

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
