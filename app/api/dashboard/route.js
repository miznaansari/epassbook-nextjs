import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCycleRange, getLogicalCyclePeriod } from '@/lib/cycle';
import { requireUser } from '@/lib/requireUser';
import { calculateStreaks } from '@/lib/streaks';

// Smart Category Classifier
export function categorizeTransaction(title = '', desc = '', type = 'SPENDING') {
  if (type === 'SAVINGS') return 'Investments & Savings';
  if (type === 'LENDING') return 'Lending & Receivables';
  if (type === 'LOAN') return 'Loans & Liabilities';
  if (type === 'ADVANCE') return 'Deposits & Advances';

  const text = `${title} ${desc}`.toLowerCase();

  if (/(swiggy|zomato|restaurant|dinner|lunch|breakfast|snack|cafe|coffee|starbucks|tea|chai|burger|pizza|food|eat|dining|groceries|grocery|blinkit|zepto|instamart|supermarket|vegetable|fruit|milk)/i.test(text)) {
    return 'Food & Dining';
  }
  if (/(uber|ola|cab|taxi|fuel|petrol|diesel|gas|metro|bus|train|flight|parking|toll|auto|rapido|commute|travel|drive)/i.test(text)) {
    return 'Transport & Commute';
  }
  if (/(rent|electricity|water|wifi|internet|broadband|cylinder|gas bill|maintenance|maid|room|flat|house|utility|utilities|society|repair)/i.test(text)) {
    return 'Housing & Utilities';
  }
  if (/(amazon|flipkart|myntra|clothes|shopping|shoes|electronics|apple|gadget|mall|store|zara|h&m|buy|purchase|gear)/i.test(text)) {
    return 'Shopping & Lifestyle';
  }
  if (/(netflix|spotify|youtube|prime|icloud|chatgpt|openai|gemini|subscription|software|hosting|domain|aws|github|recharge|mobile recharge|airtel|jio)/i.test(text)) {
    return 'Subscriptions & Tech';
  }
  if (/(hospital|doctor|medicine|pharmacy|gym|health|clinic|dentist|workout|supplements|fitness|medical|pharma|test|lab)/i.test(text)) {
    return 'Health & Wellness';
  }
  if (/(movie|cinema|game|gaming|steam|party|outing|club|concert|vacation|hotel|trip|resort|leisure|drinks|bar)/i.test(text)) {
    return 'Entertainment & Leisure';
  }
  if (/(sip|stock|mutual fund|gold|crypto|shares|zerodha|groww|invest|saving|deposit|fund)/i.test(text)) {
    return 'Investments & Savings';
  }
  if (/(course|fee|fees|school|college|book|books|education|tuition|class|cert)/i.test(text)) {
    return 'Education & Learning';
  }

  return 'General & Miscellaneous';
}

// 50/30/20 Classification
export function classifyNeedsWants(category) {
  if (['Housing & Utilities', 'Health & Wellness', 'Education & Learning'].includes(category)) return 'NEEDS';
  if (['Food & Dining', 'Transport & Commute'].includes(category)) return 'NEEDS';
  if (['Investments & Savings'].includes(category)) return 'SAVINGS';
  return 'WANTS';
}

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

    // 1. Calculate streaks dynamically
    const { streakLevel1, streakLevel2, limit: streakLimit } = await calculateStreaks(userId);
    await db.user.update({
      where: { id: userId },
      data: { streakLevel1, streakLevel2 }
    });

    const cycleDate = user.salaryCycleDate || 1;
    const now = new Date();

    let startDate;
    let endDate;

    // Determine date boundaries
    if (filter === 'current') {
      const range = getCycleRange(now, cycleDate);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filter === 'last') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const range = getCycleRange(prevMonthDate, cycleDate);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filter === 'last3') {
      const currentRange = getCycleRange(now, cycleDate);
      endDate = currentRange.endDate;
      const threeMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      const startRange = getCycleRange(threeMonthsAgoDate, cycleDate);
      startDate = startRange.startDate;
    } else if (filter === 'last6') {
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

    // 2. Query ALL transactions, salaries, and bonuses for global statistics
    const allSalaries = await db.salary.findMany({ where: { userId } });
    const allBonuses = await db.bonus.findMany({ where: { userId } });
    const allEntries = await db.financialEntry.findMany({ where: { userId } });

    // Identify all savings entries & linked withdrawals (matching /api/savings logic)
    const allSavingsEntries = allEntries.filter(e => e.type === 'SAVINGS');
    const savingIds = new Set(allSavingsEntries.map(e => e.id));

    const allWithdrawalEntries = allEntries.filter(e => 
      (e.parentEntryId && savingIds.has(e.parentEntryId)) ||
      (e.title && e.title.startsWith('Withdrawal: ')) ||
      (e.description && e.description.toLowerCase().includes('withdrawal from savings pot'))
    );

    let totalAllTimeSalaries = 0;
    allSalaries.forEach(s => totalAllTimeSalaries += parseFloat(s.amount));

    let totalAllTimeBonuses = 0;
    allBonuses.forEach(b => totalAllTimeBonuses += parseFloat(b.amount));

    let totalAllTimeSpending = 0;
    let totalAllTimeLending = 0;
    let totalAllTimeLoan = 0;
    let totalAllTimeAdvance = 0;
    let totalAllTimeSavingsDeposited = 0;

    allEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      if (e.type === 'SPENDING') totalAllTimeSpending += amt;
      else if (e.type === 'LENDING') totalAllTimeLending += amt;
      else if (e.type === 'LOAN') totalAllTimeLoan += amt;
      else if (e.type === 'ADVANCE') totalAllTimeAdvance += amt;
      else if (e.type === 'SAVINGS') totalAllTimeSavingsDeposited += amt;
    });

    let totalAllTimeSavingsWithdrawn = 0;
    allWithdrawalEntries.forEach(w => totalAllTimeSavingsWithdrawn += parseFloat(w.amount));

    // Group deposits and withdrawals pot-by-pot matching /api/savings for 100% exact parity
    const potsMap = {};
    const getPot = (rawTitle) => {
      const title = (rawTitle || 'General Savings').trim();
      const key = title.toLowerCase();
      if (!potsMap[key]) {
        potsMap[key] = { key, title, totalDeposited: 0, totalWithdrawn: 0, currentBalance: 0 };
      }
      return potsMap[key];
    };

    allSavingsEntries.forEach(entry => {
      const pot = getPot(entry.title);
      pot.totalDeposited += parseFloat(entry.amount) || 0;
    });

    allWithdrawalEntries.forEach(w => {
      let potTitle = '';
      if (w.parentEntryId) {
        const parent = allSavingsEntries.find(s => s.id === w.parentEntryId);
        if (parent) potTitle = parent.title;
      }
      if (!potTitle && w.title && w.title.startsWith('Withdrawal: ')) {
        potTitle = w.title.replace('Withdrawal: ', '').trim();
      }
      if (!potTitle && w.description) {
        const match = w.description.match(/Withdrawal from savings pot "([^"]+)"/i);
        if (match && match[1]) potTitle = match[1].trim();
      }
      if (!potTitle) {
        potTitle = w.title || 'General Savings';
      }
      const pot = getPot(potTitle);
      pot.totalWithdrawn += parseFloat(w.amount) || 0;
    });

    let netSavingsPotsBalance = 0;
    Object.values(potsMap).forEach(pot => {
      pot.currentBalance = Math.max(0, pot.totalDeposited - pot.totalWithdrawn);
      netSavingsPotsBalance += pot.currentBalance;
    });

    // Global Liquid Cash in Hand:
    // Inflow: Salaries + Bonuses + Advances (including savings withdrawals credited back) + Loans
    // Outflow: Spending + Lending + Active Savings Deposited
    let nonAdvanceWithdrawalSum = 0;
    allWithdrawalEntries.forEach(w => {
      if (w.type !== 'ADVANCE') {
        nonAdvanceWithdrawalSum += parseFloat(w.amount) || 0;
      }
    });

    const globalCurrentBalance = 
      (totalAllTimeSalaries + totalAllTimeBonuses + totalAllTimeAdvance + nonAdvanceWithdrawalSum + totalAllTimeLoan) - 
      (totalAllTimeSpending + totalAllTimeLending + totalAllTimeSavingsDeposited);

    // 3. Query records in SELECTED window
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

    // 4. Period totals
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

    // 5. Logical salary & bonus calculation
    const startPeriod = getLogicalCyclePeriod(startDate, cycleDate);
    const endPeriod = getLogicalCyclePeriod(endDate, cycleDate);

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
      const orCond = [
        { year: startPeriod.year, month: { gte: startPeriod.month } },
        { year: endPeriod.year, month: { lte: endPeriod.month } },
        { year: { gt: startPeriod.year, lt: endPeriod.year } },
      ];
      periodSalaries = await db.salary.findMany({ where: { userId, OR: orCond } });
      periodBonuses = await db.bonus.findMany({ where: { userId, OR: orCond } });
    }

    let periodSalaryTotal = 0;
    periodSalaries.forEach(s => periodSalaryTotal += parseFloat(s.amount));

    let periodBonusTotal = 0;
    periodBonuses.forEach(b => periodBonusTotal += parseFloat(b.amount));

    let periodDeductions = 0;
    const periodMonths = [
      ...periodSalaries.map(s => ({ month: s.month, year: s.year })),
      ...periodBonuses.map(b => ({ month: b.month, year: b.year }))
    ];

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

    const periodSalaryBalance = (periodSalaryTotal + periodBonusTotal) - periodDeductions;
    const totalPeriodInflow = periodSalaryTotal + periodBonusTotal + periodAdvance + periodLoan;

    // 6. Enriched Recent Transactions
    const recentTransactions = periodEntries.slice(0, 15);
    const enrichedTransactions = await Promise.all(recentTransactions.map(async (entry) => {
      const category = categorizeTransaction(entry.title, entry.description, entry.type);
      if (entry.type === 'LENDING') {
        const repayments = await db.financialEntry.findMany({
          where: { parentEntryId: entry.id }
        });
        const totalRepaid = repayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        return {
          ...entry,
          category,
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
      return { ...entry, category };
    }));

    // 7. Daily Spending Breakdown & Daily Rows
    const dailyMap = {};
    const currentCursor = new Date(startDate);
    const endBoundary = new Date(Math.min(endDate.getTime(), now.getTime()));
    
    while (currentCursor <= endBoundary) {
      const ymd = currentCursor.toISOString().split('T')[0];
      const dayName = currentCursor.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = currentCursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullDate = currentCursor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      dailyMap[ymd] = {
        date: ymd,
        dayName,
        displayDate,
        fullDate,
        spending: 0,
        inflow: 0,
        savings: 0,
        count: 0,
        transactions: [],
      };
      currentCursor.setDate(currentCursor.getDate() + 1);
    }

    periodEntries.forEach(e => {
      const ymd = new Date(e.date).toISOString().split('T')[0];
      if (!dailyMap[ymd]) {
        const d = new Date(e.date);
        dailyMap[ymd] = {
          date: ymd,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
          spending: 0,
          inflow: 0,
          savings: 0,
          count: 0,
          transactions: [],
        };
      }

      const amt = parseFloat(e.amount);
      if (e.type === 'SPENDING') {
        dailyMap[ymd].spending += amt;
      } else if (e.type === 'SAVINGS') {
        dailyMap[ymd].savings += amt;
      } else if (e.type === 'ADVANCE' || e.type === 'LOAN') {
        dailyMap[ymd].inflow += amt;
      }

      dailyMap[ymd].count += 1;
      dailyMap[ymd].transactions.push({
        id: e.id,
        title: e.title,
        amount: amt,
        type: e.type,
        category: categorizeTransaction(e.title, e.description, e.type),
        description: e.description,
        isAiGenerated: e.isAiGenerated
      });
    });

    const dailySpending = Object.values(dailyMap).sort((a, b) => new Date(b.date) - new Date(a.date));

    // 8. Spending by Category Grouping & Performance Matrix
    const categoryTotals = {};

    periodEntries.filter(e => e.type === 'SPENDING').forEach(e => {
      const cat = categorizeTransaction(e.title, e.description, e.type);
      const amt = parseFloat(e.amount);
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = {
          category: cat,
          amount: 0,
          count: 0,
        };
      }
      categoryTotals[cat].amount += amt;
      categoryTotals[cat].count += 1;
    });

    const categoryIcons = {
      'Food & Dining': 'Utensils',
      'Transport & Commute': 'Car',
      'Housing & Utilities': 'Home',
      'Shopping & Lifestyle': 'ShoppingBag',
      'Subscriptions & Tech': 'Zap',
      'Health & Wellness': 'HeartPulse',
      'Entertainment & Leisure': 'Film',
      'Investments & Savings': 'TrendingUp',
      'Education & Learning': 'BookOpen',
      'General & Miscellaneous': 'MoreHorizontal'
    };

    const categoryColors = {
      'Food & Dining': '#F59E0B',
      'Transport & Commute': '#3B82F6',
      'Housing & Utilities': '#8B5CF6',
      'Shopping & Lifestyle': '#EC4899',
      'Subscriptions & Tech': '#06B6D4',
      'Health & Wellness': '#10B981',
      'Entertainment & Leisure': '#F43F5E',
      'Investments & Savings': '#6366F1',
      'Education & Learning': '#14B8A6',
      'General & Miscellaneous': '#94A3B8'
    };

    const spendingCategories = Object.values(categoryTotals)
      .map(item => {
        const pct = periodSpending > 0 ? (item.amount / periodSpending) * 100 : 0;
        const segments = Math.max(1, Math.min(20, Math.round((pct / 100) * 20)));
        return {
          category: item.category,
          amount: item.amount,
          count: item.count,
          percentage: Math.round(pct * 10) / 10,
          icon: categoryIcons[item.category] || 'PieChart',
          color: categoryColors[item.category] || '#5E6AD2',
          segments,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // 9. Needs vs Wants vs Savings (50/30/20)
    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = periodSavings;

    periodEntries.filter(e => e.type === 'SPENDING').forEach(e => {
      const cat = categorizeTransaction(e.title, e.description, e.type);
      const classification = classifyNeedsWants(cat);
      const amt = parseFloat(e.amount);
      if (classification === 'NEEDS') needsTotal += amt;
      else if (classification === 'SAVINGS') savingsTotal += amt;
      else wantsTotal += amt;
    });

    const incomeBaseline = (totalPeriodInflow > 0 ? totalPeriodInflow : (periodSpending + periodSavings)) || 1;
    const needsWantsSavings = {
      needs: {
        amount: needsTotal,
        percentage: Math.round((needsTotal / incomeBaseline) * 100),
        targetPercentage: 50,
      },
      wants: {
        amount: wantsTotal,
        percentage: Math.round((wantsTotal / incomeBaseline) * 100),
        targetPercentage: 30,
      },
      savings: {
        amount: savingsTotal,
        percentage: Math.round((savingsTotal / incomeBaseline) * 100),
        targetPercentage: 20,
      },
      incomeBaseline,
    };

    // 10. Financial Structure & Assets Grouping
    const [userSips, stockHoldings, stockPrices] = await Promise.all([
      db.sip.findMany({ where: { userId } }),
      db.stockHolding.findMany({ where: { userId } }),
      db.stockPrice.findMany()
    ]);

    const priceMap = {};
    stockPrices.forEach(p => priceMap[p.symbol] = parseFloat(p.price));

    let totalStockValuation = 0;
    stockHoldings.forEach(h => {
      const currentPrice = priceMap[h.symbol] !== undefined ? priceMap[h.symbol] : parseFloat(h.buyPrice);
      totalStockValuation += (h.quantity * currentPrice);
    });

    let totalSipMonthly = 0;
    userSips.filter(s => s.isActive).forEach(s => totalSipMonthly += parseFloat(s.amount));

    const allLending = allEntries.filter(e => e.type === 'LENDING');
    const allRepayments = allEntries.filter(e => e.parentEntryId !== null);
    const repaymentSumMap = {};
    allRepayments.forEach(r => {
      repaymentSumMap[r.parentEntryId] = (repaymentSumMap[r.parentEntryId] || 0) + parseFloat(r.amount);
    });
    let totalLendingUnpaid = 0;
    allLending.forEach(l => {
      const repaid = repaymentSumMap[l.id] || 0;
      totalLendingUnpaid += Math.max(0, parseFloat(l.amount) - repaid);
    });

    const liquidCapital = Math.max(0, globalCurrentBalance);
    const savingsPotsVal = Math.max(0, netSavingsPotsBalance);
    const totalAssetBase = (liquidCapital + savingsPotsVal + totalStockValuation + totalLendingUnpaid) || 1;

    const financialStructure = {
      liquidCapital: {
        title: 'Liquid Capital',
        amount: liquidCapital,
        percentage: Math.round((liquidCapital / totalAssetBase) * 100),
        color: '#5E6AD2',
      },
      savingsPots: {
        title: 'Savings & Reserves',
        amount: savingsPotsVal,
        percentage: Math.round((savingsPotsVal / totalAssetBase) * 100),
        color: '#10B981',
      },
      stockEquity: {
        title: 'Stock Holdings',
        amount: totalStockValuation,
        percentage: Math.round((totalStockValuation / totalAssetBase) * 100),
        color: '#8B5CF6',
      },
      lendingReceivables: {
        title: 'Lending Receivables',
        amount: totalLendingUnpaid,
        percentage: Math.round((totalLendingUnpaid / totalAssetBase) * 100),
        color: '#06B6D4',
      },
      totalAssetBase,
      activeSipMonthly: totalSipMonthly,
    };

    // 11. Comparison with Previous Cycle for Trend Badges
    const prevMonthDate = new Date(startDate);
    prevMonthDate.setDate(prevMonthDate.getDate() - 1);
    const prevRange = getCycleRange(prevMonthDate, cycleDate);

    const prevEntries = await db.financialEntry.findMany({
      where: {
        userId,
        date: {
          gte: prevRange.startDate,
          lte: prevRange.endDate,
        }
      }
    });

    let prevSpending = 0;
    let prevSavings = 0;
    prevEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      if (e.type === 'SPENDING') prevSpending += amt;
      if (e.type === 'SAVINGS') prevSavings += amt;
    });

    const spendingDeltaPct = prevSpending > 0 
      ? Math.round(((periodSpending - prevSpending) / prevSpending) * 100 * 10) / 10 
      : 0;
    const savingsDeltaPct = prevSavings > 0 
      ? Math.round(((periodSavings - prevSavings) / prevSavings) * 100 * 10) / 10 
      : 0;

    // 12. Multi-series Trend Chart Points (CareOps Wave Chart Format)
    const chronologicalDays = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningNet = globalCurrentBalance;

    chronologicalDays.forEach(day => {
      runningNet -= (day.inflow - day.spending - day.savings);
    });

    let currentAccumulated = runningNet;
    const trendSeries = chronologicalDays.map(day => {
      currentAccumulated += (day.inflow - day.spending - day.savings);
      return {
        date: day.date,
        name: day.displayDate,
        dayName: day.dayName,
        fullDate: day.fullDate,
        Revenue: day.inflow,
        Expenses: day.spending,
        Savings: day.savings,
        Balance: Math.max(0, currentAccumulated),
        Profit: Math.max(0, day.inflow - day.spending),
      };
    });

    // 13. Return unified response
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
        salaryTotal: periodSalaryTotal + periodBonusTotal,
        salaryBalance: periodSalaryBalance,
        totalInflow: totalPeriodInflow,
      },
      trends: {
        spendingDeltaPct,
        savingsDeltaPct,
        inflowDeltaPct: 0,
      },
      trendSeries: trendSeries.length > 0 ? trendSeries : [
        { name: 'Start', Revenue: 0, Expenses: 0, Balance: globalCurrentBalance },
        { name: 'Current', Revenue: totalPeriodInflow, Expenses: periodSpending, Balance: globalCurrentBalance }
      ],
      spendingCategories,
      needsWantsSavings,
      financialStructure,
      dailySpending,
      recentTransactions: enrichedTransactions,
    });
  } catch (error) {
    console.error('Error in /api/dashboard GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
