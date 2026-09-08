import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getMonthlyBalances } from '@/lib/balances';

// POST: Add a new deposit to a saving pot
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
      useSalaryBalance,
      salaryMonth,
      salaryYear,
      isAiGenerated
    } = await req.json();

    if (!potTitle || !potTitle.trim()) {
      return NextResponse.json({ error: 'Saving pot title is required.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid deposit amount is required.' }, { status: 400 });
    }

    const normalizedTitle = potTitle.trim();
    const entryData = {
      userId: user.id,
      amount: parsedAmount,
      title: normalizedTitle,
      type: 'SAVINGS',
      description: description ? description.trim() : `Deposit into savings pot "${normalizedTitle}"`,
      date: date ? new Date(date) : new Date(),
      useSalaryBalance: !!useSalaryBalance,
      isAiGenerated: Boolean(isAiGenerated),
    };

    let deductionsToCreate = [];

    if (useSalaryBalance) {
      if (!salaryMonth || !salaryYear) {
        return NextResponse.json({ error: 'Salary month and year are required when Use Salary Balance is checked.' }, { status: 400 });
      }
      const m = parseInt(salaryMonth);
      const y = parseInt(salaryYear);
      entryData.salaryMonth = m;
      entryData.salaryYear = y;

      const balances = await getMonthlyBalances(user.id);
      const mBal = balances.find(b => b.month === m && b.year === y);
      const salRem = mBal ? mBal.salary.remaining : 0;
      const bonRem = mBal ? mBal.bonus.remaining : 0;

      if (salRem + bonRem < parsedAmount) {
        return NextResponse.json({
          error: 'INSUFFICIENT_SALARY_BALANCE',
          message: `Insufficient salary balance in selected month (${salRem + bonRem} available, ${parsedAmount} required).`
        }, { status: 400 });
      }

      let rem = parsedAmount;
      if (salRem > 0) {
        const deductSal = Math.min(rem, salRem);
        deductionsToCreate.push({ month: m, year: y, amount: deductSal, type: 'SALARY' });
        rem -= deductSal;
      }
      if (rem > 0 && bonRem > 0) {
        const deductBon = Math.min(rem, bonRem);
        deductionsToCreate.push({ month: m, year: y, amount: deductBon, type: 'BONUS' });
        rem -= deductBon;
      }
    }

    const createdEntry = await db.$transaction(async (tx) => {
      const entry = await tx.financialEntry.create({
        data: entryData
      });

      if (useSalaryBalance && deductionsToCreate.length > 0) {
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

    return NextResponse.json({
      success: true,
      entry: createdEntry,
      potTitle: normalizedTitle,
      depositedAmount: parsedAmount
    });
  } catch (error) {
    console.error('Error in /api/savings/deposit POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
