import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCycleRange, getLogicalCyclePeriod, getRangeForLogicalPeriod } from '@/lib/cycle';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const filter = searchParams.get('filter') || 'current'; // current, last, last3, last6, custom
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // 1. Fetch user to check salary cycle date configuration
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    // 2. Query ALL transactions and salaries for global statistics (Current Balance)
    const allSalaries = await db.salary.findMany({ where: { userId } });
    const allEntries = await db.financialEntry.findMany({ where: { userId } });

    // Calculate Global Cash-in-Hand (Current Balance)
    // Inflow: Salary, Advance, Loan
    // Outflow: Spending, Lending
    let totalAllTimeSalaries = 0;
    allSalaries.forEach(s => totalAllTimeSalaries += parseFloat(s.amount));

    let totalAllTimeSpending = 0;
    let totalAllTimeLending = 0;
    let totalAllTimeLoan = 0;
    let totalAllTimeAdvance = 0;

    allEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      if (e.type === 'SPENDING') totalAllTimeSpending += amt;
      else if (e.type === 'LENDING') totalAllTimeLending += amt;
      else if (e.type === 'LOAN') totalAllTimeLoan += amt;
      else if (e.type === 'ADVANCE') totalAllTimeAdvance += amt;
    });

    const globalCurrentBalance = 
      (totalAllTimeSalaries + totalAllTimeAdvance + totalAllTimeLoan) - 
      (totalAllTimeSpending + totalAllTimeLending);

    // 3. Query records in the SELECTED cycle window
    const periodEntries = await db.financialEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });

    // 4. Calculate period-specific metrics
    let periodSpending = 0;
    let periodLending = 0;
    let periodLoan = 0;
    let periodAdvance = 0;

    periodEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      if (e.type === 'SPENDING') periodSpending += amt;
      else if (e.type === 'LENDING') periodLending += amt;
      else if (e.type === 'LOAN') periodLoan += amt;
      else if (e.type === 'ADVANCE') periodAdvance += amt;
    });

    // 5. Get Salary & Salary Balance for current period
    // The current period represents a list of logical month/years.
    // For single month views ('current' and 'last'), we map it to exactly one logical month.
    // For ranges ('last3', 'last6', 'custom'), we aggregate salaries of all months intersecting this period.
    const startPeriod = getLogicalCyclePeriod(startDate, cycleDate);
    const endPeriod = getLogicalCyclePeriod(endDate, cycleDate);

    // Find all salaries that fall within this logical range
    let periodSalaries = [];
    if (startPeriod.year === endPeriod.year) {
      periodSalaries = await db.salary.findMany({
        where: {
          userId,
          year: startPeriod.year,
          month: {
            gte: startPeriod.month,
            lte: endPeriod.month,
          },
        },
      });
    } else {
      // Span multiple years
      periodSalaries = await db.salary.findMany({
        where: {
          userId,
          OR: [
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
          ],
        },
      });
    }

    let periodSalaryTotal = 0;
    periodSalaries.forEach(s => periodSalaryTotal += parseFloat(s.amount));

    // Calculate deductions for the salaries inside this logical range
    // We aggregate all entries of all time that were marked as "deducted from" these logical months
    let periodDeductions = 0;
    if (periodSalaries.length > 0) {
      const deductionsQuery = await db.financialEntry.findMany({
        where: {
          userId,
          useSalaryBalance: true,
          OR: periodSalaries.map(s => ({
            salaryMonth: s.month,
            salaryYear: s.year,
          })),
        },
      });
      deductionsQuery.forEach(d => periodDeductions += parseFloat(d.amount));
    }
    const periodSalaryBalance = periodSalaryTotal - periodDeductions;

    // 6. Return response
    return NextResponse.json({
      startDate,
      endDate,
      cycleDate,
      logicalPeriod: startPeriod,
      kpis: {
        currentBalance: globalCurrentBalance,
        spending: periodSpending,
        lending: periodLending,
        loan: periodLoan,
        advance: periodAdvance,
        salaryTotal: periodSalaryTotal,
        salaryBalance: periodSalaryBalance,
      },
      recentTransactions: periodEntries.slice(0, 10), // Limit to 10 for dashboard preview
    });
  } catch (error) {
    console.error('Error in /api/dashboard GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
