import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCycleRange, getLogicalCyclePeriod, getRangeForLogicalPeriod } from '@/lib/cycle';
import { requireUser } from '@/lib/requireUser';
import { calculateStreaks } from '@/lib/streaks';

export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = user.id;
    const filter = searchParams.get('filter') || 'current'; // current, last, last3, last6, custom
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // 1. Calculate & cache streaks dynamically
    const { streakLevel1, streakLevel2, limit: streakLimit } = await calculateStreaks(userId);
    await db.user.update({
      where: { id: userId },
      data: {
        streakLevel1,
        streakLevel2
      }
    });

    const cycleDate = user.salaryCycleDate;
    const now = new Date();

    let startDate;
    let endDate;

    // Determine date boundaries based on salary cycle configuration
    if (filter === 'current') {
      const range = getCycleRange(now, cycleDate);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filter === 'last') {
      // One month ago
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const range = getCycleRange(prevMonthDate, cycleDate);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filter === 'last3') {
      // Starts 3 cycles ago, ends at current cycle end
      const currentRange = getCycleRange(now, cycleDate);
      endDate = currentRange.endDate;
      const threeMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      const startRange = getCycleRange(threeMonthsAgoDate, cycleDate);
      startDate = startRange.startDate;
    } else if (filter === 'last6') {
      // Starts 6 cycles ago, ends at current cycle end
      const currentRange = getCycleRange(now, cycleDate);
      endDate = currentRange.endDate;
      const sixMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      const startRange = getCycleRange(sixMonthsAgoDate, cycleDate);
      startDate = startRange.startDate;
    } else if (filter === 'custom') {
      if (!customStart || !customEnd) {
        return NextResponse.json({ error: 'Missing custom start or end date' }, { status: 400 });
      }
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    // 2. Query ALL transactions, salaries, and bonuses for global statistics (Current Balance)
    const allSalaries = await db.salary.findMany({ where: { userId } });
    const allBonuses = await db.bonus.findMany({ where: { userId } });
    const allEntries = await db.financialEntry.findMany({ where: { userId } });

    // Calculate Global Cash-in-Hand (Current Balance)
    // Inflow: Salary, Bonus, Advance, Loan
    // Outflow: Spending, Lending, Savings
    let totalAllTimeSalaries = 0;
    allSalaries.forEach(s => totalAllTimeSalaries += parseFloat(s.amount));

    let totalAllTimeBonuses = 0;
    allBonuses.forEach(b => totalAllTimeBonuses += parseFloat(b.amount));

    let totalAllTimeSpending = 0;
    let totalAllTimeLending = 0;
    let totalAllTimeLoan = 0;
    let totalAllTimeAdvance = 0;
    let totalAllTimeSavings = 0;

    allEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      if (e.type === 'SPENDING') totalAllTimeSpending += amt;
      else if (e.type === 'LENDING') totalAllTimeLending += amt;
      else if (e.type === 'LOAN') totalAllTimeLoan += amt;
      else if (e.type === 'ADVANCE') totalAllTimeAdvance += amt;
      else if (e.type === 'SAVINGS') totalAllTimeSavings += amt;
    });

    const globalCurrentBalance = 
      (totalAllTimeSalaries + totalAllTimeBonuses + totalAllTimeAdvance + totalAllTimeLoan) - 
      (totalAllTimeSpending + totalAllTimeLending + totalAllTimeSavings);

    // 3. Query records in the SELECTED cycle window
    const periodEntries = await db.financialEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { deductions: true },
      orderBy: { date: 'desc' },
    });

    // 4. Calculate period-specific metrics
    let periodSpending = 0;
    let periodLending = 0;
    let periodLoan = 0;
    let periodAdvance = 0;
    let periodSavings = 0;

    periodEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      if (e.type === 'SPENDING') periodSpending += amt;
      else if (e.type === 'LENDING') periodLending += amt;
      else if (e.type === 'LOAN') periodLoan += amt;
      else if (e.type === 'ADVANCE') periodAdvance += amt;
      else if (e.type === 'SAVINGS') periodSavings += amt;
    });

    // 5. Get Salary & Bonus Balance for current period
    const startPeriod = getLogicalCyclePeriod(startDate, cycleDate);
    const endPeriod = getLogicalCyclePeriod(endDate, cycleDate);

    // Find all salaries and bonuses that fall within this logical range
    let periodSalaries = [];
    let periodBonuses = [];
    if (startPeriod.year === endPeriod.year) {
      const whereCond = {
        userId,
        year: startPeriod.year,
        month: {
          gte: startPeriod.month,
          lte: endPeriod.month,
        },
      };
      periodSalaries = await db.salary.findMany({ where: whereCond });
      periodBonuses = await db.bonus.findMany({ where: whereCond });
    } else {
      // Span multiple years
      const orCond = [
        {
          year: startPeriod.year,
          month: { gte: startPeriod.month },
        },
        {
          year: endPeriod.year,
          month: { lte: endPeriod.month },
        },
        {
          year: {
            gt: startPeriod.year,
            lt: endPeriod.year,
          },
        },
      ];
      periodSalaries = await db.salary.findMany({
        where: {
          userId,
          OR: orCond,
        },
      });
      periodBonuses = await db.bonus.findMany({
        where: {
          userId,
          OR: orCond,
        },
      });
    }

    let periodSalaryTotal = 0;
    periodSalaries.forEach(s => periodSalaryTotal += parseFloat(s.amount));

    let periodBonusTotal = 0;
    periodBonuses.forEach(b => periodBonusTotal += parseFloat(b.amount));

    // Calculate deductions for the salaries/bonuses inside this logical range
    // We aggregate all deductions of all time that were marked as "deducted from" these logical months
    let periodDeductions = 0;
    const periodMonths = [
      ...periodSalaries.map(s => ({ month: s.month, year: s.year })),
      ...periodBonuses.map(b => ({ month: b.month, year: b.year }))
    ];

    // Deduplicate
    const uniquePeriodMonths = [];
    const seenMonths = new Set();
    for (const item of periodMonths) {
      const key = `${item.year}-${item.month}`;
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        uniquePeriodMonths.push(item);
      }
    }

    if (uniquePeriodMonths.length > 0) {
      const deductionsQuery = await db.salaryDeduction.findMany({
        where: {
          entry: { userId },
          OR: uniquePeriodMonths.map(m => ({
            month: m.month,
            year: m.year,
          })),
        },
      });
      deductionsQuery.forEach(d => periodDeductions += parseFloat(d.amount));
    }

    // Active salary balance = (Salary + Bonus) - Deductions
    const periodSalaryBalance = (periodSalaryTotal + periodBonusTotal) - periodDeductions;

    const recentTransactions = periodEntries.slice(0, 10);
    const enrichedTransactions = await Promise.all(recentTransactions.map(async (entry) => {
      if (entry.type === 'LENDING') {
        const repayments = await db.financialEntry.findMany({
          where: { parentEntryId: entry.id }
        });
        const totalRepaid = repayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        return {
          ...entry,
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
      return entry;
    }));

    // 6. Return response
    return NextResponse.json({
      startDate,
      endDate,
      cycleDate,
      logicalPeriod: startPeriod,
      streaks: {
        level1: streakLevel1,
        level2: streakLevel2,
        level2Limit: streakLimit
      },
      kpis: {
        currentBalance: globalCurrentBalance,
        spending: periodSpending,
        lending: periodLending,
        loan: periodLoan,
        advance: periodAdvance,
        savings: periodSavings,
        salaryTotal: periodSalaryTotal + periodBonusTotal, // Combined total
        salaryBalance: periodSalaryBalance, // Combined remaining balance
      },
      recentTransactions: enrichedTransactions,
    });
  } catch (error) {
    console.error('Error in /api/dashboard GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
