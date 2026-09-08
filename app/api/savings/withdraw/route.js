import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

// POST: Execute a partial or full withdrawal from a saving pot
export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      potTitle,
      amount,
      date,
      description,
      parentEntryId,
      refundSalaryMonth,
      refundSalaryYear,
      isAiGenerated
    } = await req.json();

    if (!potTitle || !potTitle.trim()) {
      return NextResponse.json({ error: 'Saving pot title is required.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid withdrawal amount is required.' }, { status: 400 });
    }

    const normalizedTitle = potTitle.trim();

    // 1. Calculate available balance for this pot
    const savingEntries = await db.financialEntry.findMany({
      where: {
        userId: user.id,
        type: 'SAVINGS',
        title: { equals: normalizedTitle }
      }
    });

    const savingIds = savingEntries.map(e => e.id);
    const totalDeposited = savingEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Fetch existing withdrawals for this pot
    const existingWithdrawals = await db.financialEntry.findMany({
      where: {
        userId: user.id,
        OR: [
          ...(savingIds.length > 0 ? [{ parentEntryId: { in: savingIds } }] : []),
          { description: { contains: `Withdrawal from savings pot "${normalizedTitle}"` } },
          { title: { equals: `Withdrawal: ${normalizedTitle}` } }
        ]
      }
    });

    const totalWithdrawn = existingWithdrawals.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const availableBalance = Math.max(0, totalDeposited - totalWithdrawn);

    if (parsedAmount > availableBalance + 0.01) {
      return NextResponse.json({
        error: 'INSUFFICIENT_SAVINGS_BALANCE',
        message: `Withdrawal amount (${parsedAmount}) exceeds the available pot balance (${availableBalance.toFixed(2)}).`,
        availableBalance
      }, { status: 400 });
    }

    // 2. Determine parent entry linkage if any
    let linkedParentId = null;
    if (parentEntryId) {
      const parsedParentId = parseInt(parentEntryId);
      if (!isNaN(parsedParentId)) linkedParentId = parsedParentId;
    } else if (savingEntries.length > 0) {
      linkedParentId = savingEntries[0].id;
    }

    // 3. Create the withdrawal transaction atomically
    const entryData = {
      userId: user.id,
      amount: parsedAmount,
      title: `Withdrawal: ${normalizedTitle}`,
      type: 'ADVANCE', // Cash-inflow returned to user ledger
      description: description ? description.trim() : `Withdrawal from savings pot "${normalizedTitle}"`,
      date: date ? new Date(date) : new Date(),
      parentEntryId: linkedParentId,
      isAiGenerated: Boolean(isAiGenerated),
    };

    let deductionsToCreate = [];

    // If salary month/year refund is specified, refund (credit) back to salary balance
    if (refundSalaryMonth && refundSalaryYear) {
      const m = parseInt(refundSalaryMonth);
      const y = parseInt(refundSalaryYear);
      entryData.useSalaryBalance = true;
      entryData.salaryMonth = m;
      entryData.salaryYear = y;

      deductionsToCreate.push({
        month: m,
        year: y,
        amount: -parsedAmount, // Negative deduction adds balance back
        type: 'SALARY'
      });
    }

    const createdEntry = await db.$transaction(async (tx) => {
      const entry = await tx.financialEntry.create({
        data: entryData
      });

      if (entryData.useSalaryBalance && deductionsToCreate.length > 0) {
        await tx.salaryDeduction.createMany({
          data: deductionsToCreate.map(d => ({
            entryId: entry.id,
            month: d.month,
            year: d.year,
            amount: d.amount,
            type: d.type
          }))
        });
      }

      return entry;
    });

    const newRemainingBalance = Math.max(0, availableBalance - parsedAmount);

    return NextResponse.json({
      success: true,
      entry: createdEntry,
      potTitle: normalizedTitle,
      withdrawnAmount: parsedAmount,
      newRemainingBalance
    });
  } catch (error) {
    console.error('Error in /api/savings/withdraw POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
