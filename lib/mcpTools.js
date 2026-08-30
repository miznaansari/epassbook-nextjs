import { db } from './db.js';
import { getCycleRange, getLogicalCyclePeriod } from './cycle.js';
import { getMonthlyBalances } from './balances.js';
import { calculateStreaks } from './streaks.js';

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
function getMonthName(num) {
  return monthNames[num] || `Month ${num}`;
}

/**
 * MCP Protocol Tools Definition
 */
export const MCP_TOOLS = [
  {
    name: 'get_dashboard_summary',
    description: 'Retrieve real-time financial overview for the user, including total current cash-in-hand balance, active cycle spending, lending, loan, savings, salary balance, streaks, and recent entries.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['current', 'last', 'last3', 'last6', 'custom'],
          description: 'Cycle timeframe filter. Defaults to "current" (active salary cycle).',
        },
        startDate: {
          type: 'string',
          description: 'Optional ISO date string (YYYY-MM-DD) for custom cycle filter.',
        },
        endDate: {
          type: 'string',
          description: 'Optional ISO date string (YYYY-MM-DD) for custom cycle filter.',
        },
      },
    },
  },
  {
    name: 'list_transactions',
    description: 'List user financial entries with optional filtering by type (SPENDING, LENDING, LOAN, ADVANCE, SAVINGS), date range, and count limit.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['ALL', 'SPENDING', 'LENDING', 'LOAN', 'ADVANCE', 'SAVINGS'],
          description: 'Filter by transaction category. Leave empty or ALL to get all transactions.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of transactions to return (default 30, max 100).',
        },
        startDate: {
          type: 'string',
          description: 'Filter transactions from this date (ISO string YYYY-MM-DD).',
        },
        endDate: {
          type: 'string',
          description: 'Filter transactions up to this date (ISO string YYYY-MM-DD).',
        },
      },
    },
  },
  {
    name: 'create_transaction',
    description: 'Record a new financial entry (Spending, Lending, Loan, Advance, or Savings) with optional automatic salary balance deduction.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short title or vendor name for the transaction.',
        },
        amount: {
          type: 'number',
          description: 'The transaction amount (positive number).',
        },
        type: {
          type: 'string',
          enum: ['SPENDING', 'LENDING', 'LOAN', 'ADVANCE', 'SAVINGS'],
          description: 'Transaction category.',
        },
        description: {
          type: 'string',
          description: 'Optional additional notes or description.',
        },
        date: {
          type: 'string',
          description: 'Optional ISO date string for when the transaction took place (defaults to now).',
        },
        useSalaryBalance: {
          type: 'boolean',
          description: 'Whether to deduct this transaction directly from the user’s active salary balance.',
        },
        salaryMonth: {
          type: 'number',
          description: 'The salary month (1-12) to deduct from if useSalaryBalance is true.',
        },
        salaryYear: {
          type: 'number',
          description: 'The salary year (e.g. 2026) to deduct from if useSalaryBalance is true.',
        },
        parentEntryId: {
          type: 'number',
          description: 'Optional parent LENDING entry ID if this transaction is a repayment.',
        },
      },
      required: ['title', 'amount', 'type'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Delete a financial transaction entry by its numeric ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The numeric ID of the financial entry to delete.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_monthly_balances',
    description: 'Get salary and bonus remaining balances month-by-month, accounting for all logged deductions.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'add_salary',
    description: 'Record or update the monthly salary for a specific month and year.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Salary amount received.',
        },
        month: {
          type: 'number',
          description: 'Month index (1 to 12).',
        },
        year: {
          type: 'number',
          description: 'Year (e.g. 2026).',
        },
      },
      required: ['amount', 'month', 'year'],
    },
  },
  {
    name: 'add_bonus',
    description: 'Record or update a bonus received for a specific month and year.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Bonus amount received.',
        },
        month: {
          type: 'number',
          description: 'Month index (1 to 12).',
        },
        year: {
          type: 'number',
          description: 'Year (e.g. 2026).',
        },
      },
      required: ['amount', 'month', 'year'],
    },
  },
  {
    name: 'list_stocks',
    description: 'Retrieve user stock holdings and investment portfolio with buy prices and quantities.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_sips',
    description: 'Retrieve all Systematic Investment Plans (SIPs) and recurring savings schedules for the user.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_sip',
    description: 'Create a new SIP (Systematic Investment Plan) recurring reminder/tracker.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'SIP name / investment fund title.',
        },
        amount: {
          type: 'number',
          description: 'Recurring investment amount.',
        },
        frequency: {
          type: 'string',
          enum: ['WEEKLY', 'MONTHLY'],
          description: 'Frequency of the SIP.',
        },
        dayOfMonth: {
          type: 'number',
          description: 'Day of the month (1-31) for Monthly SIPs.',
        },
        dayOfWeek: {
          type: 'number',
          description: 'Day of week (1=Monday, 7=Sunday) for Weekly SIPs.',
        },
        reminderTime: {
          type: 'string',
          description: 'Reminder time in HH:MM format (default "10:00").',
        },
      },
      required: ['title', 'amount', 'frequency'],
    },
  },
  {
    name: 'get_user_profile',
    description: 'Get user profile information, configured currency, salary cycle date, streak status, and notification preferences.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * MCP Protocol Resources Definition
 */
export const MCP_RESOURCES = [
  {
    uri: 'passbook://dashboard',
    name: 'Live Dashboard State',
    description: 'Real-time financial summary including current balance, active cycle spending, and remaining salary.',
    mimeType: 'application/json',
  },
  {
    uri: 'passbook://profile',
    name: 'User Profile & Settings',
    description: 'User settings, base currency, and salary cycle configurations.',
    mimeType: 'application/json',
  },
  {
    uri: 'passbook://transactions/recent',
    name: 'Recent Transactions',
    description: 'Last 20 financial entries for the user.',
    mimeType: 'application/json',
  },
];

/**
 * Execute MCP Tool Call
 */
export async function executeMcpTool(name, args = {}, user) {
  const userId = user.id;

  switch (name) {
    case 'get_dashboard_summary': {
      const filter = args.filter || 'current';
      const cycleDate = user.salaryCycleDate || 1;
      const now = new Date();

      let startDate;
      let endDate;

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
        if (!args.startDate || !args.endDate) {
          throw new Error('Missing custom startDate or endDate');
        }
        startDate = new Date(args.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(args.endDate);
        endDate.setHours(23, 59, 59, 999);
      }

      // Streaks
      const { streakLevel1, streakLevel2, limit: streakLimit } = await calculateStreaks(userId);

      // All-time totals for global balance
      const allSalaries = await db.salary.findMany({ where: { userId } });
      const allBonuses = await db.bonus.findMany({ where: { userId } });
      const allEntries = await db.financialEntry.findMany({ where: { userId } });

      let totalAllTimeSalaries = allSalaries.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      let totalAllTimeBonuses = allBonuses.reduce((sum, b) => sum + parseFloat(b.amount), 0);
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

      // Period entries
      const periodEntries = await db.financialEntry.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        include: { deductions: true },
        orderBy: { date: 'desc' },
      });

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

      // Salary & bonus for logical period
      const startPeriod = getLogicalCyclePeriod(startDate, cycleDate);
      const endPeriod = getLogicalCyclePeriod(endDate, cycleDate);

      let periodSalaries = [];
      let periodBonuses = [];
      if (startPeriod.year === endPeriod.year) {
        const whereCond = {
          userId,
          year: startPeriod.year,
          month: { gte: startPeriod.month, lte: endPeriod.month },
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

      const periodSalaryTotal = periodSalaries.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      const periodBonusTotal = periodBonuses.reduce((sum, b) => sum + parseFloat(b.amount), 0);

      const periodMonths = [
        ...periodSalaries.map(s => ({ month: s.month, year: s.year })),
        ...periodBonuses.map(b => ({ month: b.month, year: b.year }))
      ];

      const seenMonths = new Set();
      const uniquePeriodMonths = [];
      for (const item of periodMonths) {
        const key = `${item.year}-${item.month}`;
        if (!seenMonths.has(key)) {
          seenMonths.add(key);
          uniquePeriodMonths.push(item);
        }
      }

      let periodDeductions = 0;
      if (uniquePeriodMonths.length > 0) {
        const deductionsQuery = await db.salaryDeduction.findMany({
          where: {
            entry: { userId },
            OR: uniquePeriodMonths.map(m => ({ month: m.month, year: m.year })),
          },
        });
        deductionsQuery.forEach(d => periodDeductions += parseFloat(d.amount));
      }

      const periodSalaryBalance = (periodSalaryTotal + periodBonusTotal) - periodDeductions;

      return {
        currency: user.currency,
        cycleDate,
        timeframe: {
          filter,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        streaks: {
          level1Days: streakLevel1,
          level2Days: streakLevel2,
          level2DailyLimit: streakLimit,
        },
        kpis: {
          currentCashInHandBalance: globalCurrentBalance,
          periodSpending,
          periodLending,
          periodLoan,
          periodAdvance,
          periodSavings,
          periodSalaryTotal: periodSalaryTotal + periodBonusTotal,
          periodRemainingSalaryBalance: periodSalaryBalance,
        },
        recentTransactionsCount: periodEntries.length,
      };
    }

    case 'list_transactions': {
      const where = { userId };
      if (args.type && args.type !== 'ALL') {
        where.type = args.type;
      }
      if (args.startDate || args.endDate) {
        where.date = {};
        if (args.startDate) where.date.gte = new Date(args.startDate);
        if (args.endDate) where.date.lte = new Date(args.endDate);
      }

      const limit = Math.min(Math.max(1, args.limit || 30), 100);

      const entries = await db.financialEntry.findMany({
        where,
        include: { deductions: true },
        orderBy: { date: 'desc' },
        take: limit,
      });

      const enriched = await Promise.all(entries.map(async (entry) => {
        if (entry.type === 'LENDING') {
          const repayments = await db.financialEntry.findMany({
            where: { parentEntryId: entry.id }
          });
          const totalRepaid = repayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
          return {
            id: entry.id,
            title: entry.title,
            amount: parseFloat(entry.amount),
            type: entry.type,
            date: entry.date,
            description: entry.description,
            unpaidAmount: Math.max(0, parseFloat(entry.amount) - totalRepaid),
            repaymentsCount: repayments.length,
          };
        }
        return {
          id: entry.id,
          title: entry.title,
          amount: parseFloat(entry.amount),
          type: entry.type,
          date: entry.date,
          description: entry.description,
          useSalaryBalance: entry.useSalaryBalance,
          salaryMonth: entry.salaryMonth,
          salaryYear: entry.salaryYear,
        };
      }));

      return {
        count: enriched.length,
        currency: user.currency,
        transactions: enriched,
      };
    }

    case 'create_transaction': {
      const {
        title,
        amount,
        type,
        description,
        date,
        useSalaryBalance,
        salaryMonth,
        salaryYear,
        parentEntryId,
      } = args;

      if (!title || amount === undefined || !type) {
        throw new Error('Missing required fields: title, amount, type');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid financial amount. Must be greater than 0.');
      }

      const validTypes = ['LENDING', 'LOAN', 'SPENDING', 'ADVANCE', 'SAVINGS'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid entry type: ${type}. Allowed: ${validTypes.join(', ')}`);
      }

      const entryData = {
        userId,
        amount: parsedAmount,
        title: title.trim(),
        description: description || '',
        type,
        useSalaryBalance: !!useSalaryBalance,
        date: date ? new Date(date) : new Date(),
      };

      let deductionsToCreate = [];

      if (parentEntryId) {
        const parentId = parseInt(parentEntryId);
        const parentEntry = await db.financialEntry.findUnique({
          where: { id: parentId },
          include: { deductions: true }
        });
        if (!parentEntry || parentEntry.type !== 'LENDING' || parentEntry.userId !== userId) {
          throw new Error('Parent lending transaction not found.');
        }

        const existingRepayments = await db.financialEntry.findMany({
          where: { parentEntryId: parentId }
        });
        const totalRepaidSoFar = existingRepayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const remainingUnpaid = parseFloat(parentEntry.amount) - totalRepaidSoFar;

        if (parsedAmount > remainingUnpaid + 0.01) {
          throw new Error(`Repayment amount (${parsedAmount}) exceeds remaining unpaid amount (${remainingUnpaid.toFixed(2)}).`);
        }

        entryData.parentEntryId = parentId;

        if (parentEntry.useSalaryBalance) {
          let remainingRepayment = parsedAmount;
          for (const pd of parentEntry.deductions) {
            if (remainingRepayment <= 0) break;
            const pdAmt = parseFloat(pd.amount);
            let alreadyRefunded = 0;
            for (const prevRepay of existingRepayments) {
              const prevDeductions = await db.salaryDeduction.findMany({
                where: { entryId: prevRepay.id, month: pd.month, year: pd.year, type: pd.type }
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
            entryData.useSalaryBalance = true;
            entryData.salaryMonth = deductionsToCreate[0].month;
            entryData.salaryYear = deductionsToCreate[0].year;
          }
        }
      } else if (useSalaryBalance) {
        if (!salaryMonth || !salaryYear) {
          throw new Error('salaryMonth and salaryYear are required when useSalaryBalance is true.');
        }
        const m = parseInt(salaryMonth);
        const y = parseInt(salaryYear);
        entryData.salaryMonth = m;
        entryData.salaryYear = y;

        const balances = await getMonthlyBalances(userId);
        const mBal = balances.find(b => b.month === m && b.year === y);
        const salRem = mBal ? mBal.salary.remaining : 0;
        const bonRem = mBal ? mBal.bonus.remaining : 0;

        if (salRem + bonRem < parsedAmount) {
          throw new Error(`Insufficient salary/bonus balance in ${getMonthName(m)} ${y}. Available: ${(salRem + bonRem).toFixed(2)}`);
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

      const created = await db.$transaction(async (tx) => {
        const entry = await tx.financialEntry.create({ data: entryData });
        if (useSalaryBalance && deductionsToCreate.length > 0) {
          await tx.salaryDeduction.createMany({
            data: deductionsToCreate.map(d => ({
              entryId: entry.id,
              month: d.month,
              year: d.year,
              amount: d.amount,
              type: d.type,
            })),
          });
        }
        return entry;
      });

      return {
        success: true,
        message: `Created ${type} entry "${title}" of ${user.currency} ${parsedAmount}`,
        entry: {
          id: created.id,
          title: created.title,
          amount: parseFloat(created.amount),
          type: created.type,
          date: created.date,
          useSalaryBalance: created.useSalaryBalance,
        },
      };
    }

    case 'delete_transaction': {
      if (!args.id) throw new Error('Missing transaction id');
      const entryId = parseInt(args.id);
      const existing = await db.financialEntry.findUnique({ where: { id: entryId } });
      if (!existing || existing.userId !== userId) {
        throw new Error('Transaction entry not found or unauthorized.');
      }
      await db.financialEntry.delete({ where: { id: entryId } });
      return { success: true, message: `Deleted transaction entry ID ${entryId}` };
    }

    case 'get_monthly_balances': {
      const balances = await getMonthlyBalances(userId);
      return {
        currency: user.currency,
        balances: balances.map(b => ({
          month: b.month,
          monthName: getMonthName(b.month),
          year: b.year,
          salaryTotal: b.salary.total,
          salaryRemaining: b.salary.remaining,
          bonusTotal: b.bonus.total,
          bonusRemaining: b.bonus.remaining,
          totalRemaining: b.salary.remaining + b.bonus.remaining,
        })),
      };
    }

    case 'add_salary': {
      const { amount, month, year } = args;
      if (amount === undefined || !month || !year) {
        throw new Error('Missing amount, month, or year');
      }
      const parsedAmount = parseFloat(amount);
      const m = parseInt(month);
      const y = parseInt(year);

      const salary = await db.salary.upsert({
        where: { userId_month_year: { userId, month: m, year: y } },
        update: { amount: parsedAmount },
        create: { userId, month: m, year: y, amount: parsedAmount },
      });

      return {
        success: true,
        message: `Salary for ${getMonthName(m)} ${y} set to ${user.currency} ${parsedAmount}`,
        salary: { id: salary.id, month: salary.month, year: salary.year, amount: parseFloat(salary.amount) },
      };
    }

    case 'add_bonus': {
      const { amount, month, year } = args;
      if (amount === undefined || !month || !year) {
        throw new Error('Missing amount, month, or year');
      }
      const parsedAmount = parseFloat(amount);
      const m = parseInt(month);
      const y = parseInt(year);

      const bonus = await db.bonus.upsert({
        where: { userId_month_year: { userId, month: m, year: y } },
        update: { amount: parsedAmount },
        create: { userId, month: m, year: y, amount: parsedAmount },
      });

      return {
        success: true,
        message: `Bonus for ${getMonthName(m)} ${y} set to ${user.currency} ${parsedAmount}`,
        bonus: { id: bonus.id, month: bonus.month, year: bonus.year, amount: parseFloat(bonus.amount) },
      };
    }

    case 'list_stocks': {
      const holdings = await db.stockHolding.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      const symbols = holdings.map(h => h.symbol);
      const prices = await db.stockPrice.findMany({
        where: { symbol: { in: symbols } },
      });
      const priceMap = new Map(prices.map(p => [p.symbol, parseFloat(p.price)]));

      const formatted = holdings.map(h => {
        const currentPrice = priceMap.get(h.symbol) || parseFloat(h.buyPrice);
        const totalInvested = parseFloat(h.buyPrice) * h.quantity;
        const currentValue = currentPrice * h.quantity;
        const pnl = currentValue - totalInvested;
        const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

        return {
          id: h.id,
          symbol: h.symbol,
          name: h.name,
          quantity: h.quantity,
          buyPrice: parseFloat(h.buyPrice),
          currentPrice,
          totalInvested,
          currentValue,
          pnl,
          pnlPercentage: parseFloat(pnlPercentage.toFixed(2)),
        };
      });

      return {
        count: formatted.length,
        holdings: formatted,
      };
    }

    case 'list_sips': {
      const sips = await db.sip.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        count: sips.length,
        currency: user.currency,
        sips: sips.map(s => ({
          id: s.id,
          title: s.title,
          amount: parseFloat(s.amount),
          frequency: s.frequency,
          dayOfMonth: s.dayOfMonth,
          dayOfWeek: s.dayOfWeek,
          reminderTime: s.reminderTime,
          isActive: s.isActive,
        })),
      };
    }

    case 'create_sip': {
      const { title, amount, frequency, dayOfMonth, dayOfWeek, reminderTime } = args;
      if (!title || amount === undefined || !frequency) {
        throw new Error('Missing title, amount, or frequency');
      }

      const sip = await db.sip.create({
        data: {
          userId,
          title: title.trim(),
          amount: parseFloat(amount),
          frequency,
          dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : null,
          dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : null,
          reminderTime: reminderTime || '10:00',
        },
      });

      return {
        success: true,
        message: `Created SIP "${title}" of ${user.currency} ${amount} (${frequency})`,
        sip: {
          id: sip.id,
          title: sip.title,
          amount: parseFloat(sip.amount),
          frequency: sip.frequency,
        },
      };
    }

    case 'get_user_profile': {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
        salaryCycleDate: user.salaryCycleDate,
        timezone: user.timezone,
        streaks: {
          level1: user.streakLevel1,
          level2: user.streakLevel2,
          level2Limit: parseFloat(user.streakLevel2Limit || 100),
        },
      };
    }

    default:
      throw new Error(`Tool not found: ${name}`);
  }
}

/**
 * Execute MCP Resource Read
 */
export async function executeMcpResourceRead(uri, user) {
  switch (uri) {
    case 'passbook://dashboard': {
      const summary = await executeMcpTool('get_dashboard_summary', { filter: 'current' }, user);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    }

    case 'passbook://profile': {
      const profile = await executeMcpTool('get_user_profile', {}, user);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }

    case 'passbook://transactions/recent': {
      const recent = await executeMcpTool('list_transactions', { limit: 20 }, user);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(recent, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Resource URI not found: ${uri}`);
  }
}
