import { db } from './db';
import { getRangeForLogicalPeriod } from './cycle';
import { getMonthlyBalances } from './balances';

// 1. Tool Function Declarations for Gemini
export const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "getMonthlyExpenses",
        description: "Fetch total spending and list of expenses for a user in a specific logical month and year.",
        parameters: {
          type: "OBJECT",
          properties: {
            month: { type: "INTEGER", description: "Logical month of the salary cycle (1-12)" },
            year: { type: "INTEGER", description: "Logical year of the salary cycle (e.g. 2026)" },
          },
          required: ["month", "year"],
        },
      },
      {
        name: "getSalaryBalance",
        description: "Fetch the total salary and current salary balance (salary minus deductions) for a specific logical month and year.",
        parameters: {
          type: "OBJECT",
          properties: {
            month: { type: "INTEGER", description: "Logical month of the salary cycle (1-12)" },
            year: { type: "INTEGER", description: "Logical year of the salary cycle" },
          },
          required: ["month", "year"],
        },
      },
      {
        name: "compareMonthlySpending",
        description: "Compare total spending between two logical months and years.",
        parameters: {
          type: "OBJECT",
          properties: {
            month1: { type: "INTEGER", description: "Logical month 1 (1-12)" },
            year1: { type: "INTEGER", description: "Logical year 1" },
            month2: { type: "INTEGER", description: "Logical month 2 (1-12)" },
            year2: { type: "INTEGER", description: "Logical year 2" },
          },
          required: ["month1", "year1", "month2", "year2"],
        },
      },
      {
        name: "getTopSpendingCategory",
        description: "Get the top spending category (by grouping titles or descriptions) for a specific logical month and year.",
        parameters: {
          type: "OBJECT",
          properties: {
            month: { type: "INTEGER", description: "Logical month of the salary cycle (1-12)" },
            year: { type: "INTEGER", description: "Logical year of the salary cycle" },
          },
          required: ["month", "year"],
        },
      },
      {
        name: "getLoanSummary",
        description: "Get a comprehensive summary of active loans (debts) and lending receivables for the user.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "createTransaction",
        description: "Create a single financial entry (SPENDING, LENDING, LOAN, ADVANCE, SAVINGS) in the user's e-Passbook ledger with automatic salary deduction.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Title or item name of the transaction." },
            amount: { type: "NUMBER", description: "The amount spent or logged (positive number)." },
            type: { type: "STRING", description: "Transaction type: SPENDING, LENDING, LOAN, ADVANCE, or SAVINGS (default: SPENDING)." },
            description: { type: "STRING", description: "Optional notes or details." },
            useSalaryBalance: { type: "BOOLEAN", description: "Whether to deduct this transaction directly from active salary balance (default true for SPENDING)." },
            salaryMonth: { type: "INTEGER", description: "Optional month (1-12) to deduct from." },
            salaryYear: { type: "INTEGER", description: "Optional year (e.g. 2026) to deduct from." },
            date: { type: "STRING", description: "Optional ISO date string (YYYY-MM-DD)." },
          },
          required: ["title", "amount"],
        },
      },
      {
        name: "createMultipleTransactions",
        description: "Create multiple financial entries in the user's e-Passbook ledger at once (e.g. when multiple items are extracted from a receipt, bill, or user prompt).",
        parameters: {
          type: "OBJECT",
          properties: {
            transactions: {
              type: "ARRAY",
              description: "Array of transaction objects to create.",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING", description: "Title or item name of the transaction." },
                  amount: { type: "NUMBER", description: "The amount of the transaction." },
                  type: { type: "STRING", description: "Transaction type: SPENDING, LENDING, LOAN, ADVANCE, or SAVINGS (default: SPENDING)." },
                  description: { type: "STRING", description: "Optional notes or details." },
                  useSalaryBalance: { type: "BOOLEAN", description: "Whether to deduct from active salary balance (default true)." },
                  salaryMonth: { type: "INTEGER", description: "Optional month (1-12) to deduct from." },
                  salaryYear: { type: "INTEGER", description: "Optional year to deduct from." },
                  date: { type: "STRING", description: "Optional ISO date string (YYYY-MM-DD)." },
                },
                required: ["title", "amount"],
              },
            },
          },
          required: ["transactions"],
        },
      },
    ],
  },
];

// 2. Tool Implementations executing Prisma queries
export async function executeTool(name, args, userId) {
  console.log(`Executing AI Tool: ${name} with args:`, args);

  // Fetch user salary cycle to determine correct date ranges
  const user = await db.user.findUnique({ where: { id: userId } });
  const cycleDate = user ? user.salaryCycleDate : 1;

  switch (name) {
    case "getMonthlyExpenses": {
      const { month, year } = args;
      const { startDate, endDate } = getRangeForLogicalPeriod(month, year, cycleDate);

      const expenses = await db.financialEntry.findMany({
        where: {
          userId,
          type: 'SPENDING',
          date: { gte: startDate, lte: endDate },
        },
      });

      const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      return {
        month,
        year,
        cycleDate,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalSpending: total,
        expensesCount: expenses.length,
        expenses: expenses.map(e => ({
          id: e.id,
          amount: parseFloat(e.amount),
          title: e.title,
          description: e.description,
          date: e.date.toISOString().split('T')[0],
          useSalaryBalance: e.useSalaryBalance,
        })),
      };
    }

    case "getSalaryBalance": {
      const { month, year } = args;

      const salaryRecord = await db.salary.findUnique({
        where: {
          userId_month_year: { userId, month, year },
        },
      });

      const bonusRecord = await db.bonus.findUnique({
        where: {
          userId_month_year: { userId, month, year },
        },
      });

      const salaryAmount = salaryRecord ? parseFloat(salaryRecord.amount) : 0;
      const bonusAmount = bonusRecord ? parseFloat(bonusRecord.amount) : 0;

      const deductions = await db.salaryDeduction.findMany({
        where: {
          entry: { userId },
          month,
          year,
        },
        include: {
          entry: true,
        },
      });

      const totalDeducted = deductions.reduce((sum, d) => sum + parseFloat(d.amount), 0);
      const combinedBalance = (salaryAmount + bonusAmount) - totalDeducted;

      return {
        month,
        year,
        totalSalary: salaryAmount,
        totalBonus: bonusAmount,
        totalInflow: salaryAmount + bonusAmount,
        totalDeducted,
        combinedBalance,
        deductions: deductions.map(d => ({
          id: d.entryId,
          title: d.entry.title,
          amount: parseFloat(d.amount),
          source: d.type, // "SALARY" or "BONUS"
          date: d.entry.date.toISOString().split('T')[0],
        })),
      };
    }

    case "compareMonthlySpending": {
      const { month1, year1, month2, year2 } = args;

      // Period 1
      const range1 = getRangeForLogicalPeriod(month1, year1, cycleDate);
      const expenses1 = await db.financialEntry.findMany({
        where: {
          userId,
          type: 'SPENDING',
          date: { gte: range1.startDate, lte: range1.endDate },
        },
      });
      const total1 = expenses1.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      // Period 2
      const range2 = getRangeForLogicalPeriod(month2, year2, cycleDate);
      const expenses2 = await db.financialEntry.findMany({
        where: {
          userId,
          type: 'SPENDING',
          date: { gte: range2.startDate, lte: range2.endDate },
        },
      });
      const total2 = expenses2.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const diff = total2 - total1;
      const pctDiff = total1 > 0 ? (diff / total1) * 100 : 0;

      return {
        period1: { month: month1, year: year1, totalSpending: total1 },
        period2: { month: month2, year: year2, totalSpending: total2 },
        difference: diff,
        percentDifference: pctDiff,
      };
    }

    case "getTopSpendingCategory": {
      const { month, year } = args;
      const { startDate, endDate } = getRangeForLogicalPeriod(month, year, cycleDate);

      const expenses = await db.financialEntry.findMany({
        where: {
          userId,
          type: 'SPENDING',
          date: { gte: startDate, lte: endDate },
        },
      });

      if (expenses.length === 0) {
        return { month, year, topCategories: [], message: "No expenses recorded this month." };
      }

      // Group by lowercase title/keyword (fuzzy category estimation)
      const categories = {};
      expenses.forEach(e => {
        const title = e.title.trim().toLowerCase();
        let cat = 'others';
        
        // Simple keywords matching
        if (title.includes('food') || title.includes('eat') || title.includes('restaurant') || title.includes('cafe')) cat = 'Food & Dining';
        else if (title.includes('rent') || title.includes('flat') || title.includes('room')) cat = 'Rent/Housing';
        else if (title.includes('movie') || title.includes('game') || title.includes('ott') || title.includes('netflix') || title.includes('fun')) cat = 'Entertainment';
        else if (title.includes('travel') || title.includes('cab') || title.includes('uber') || title.includes('fuel') || title.includes('bike') || title.includes('car')) cat = 'Transport';
        else if (title.includes('bill') || title.includes('recharge') || title.includes('wifi') || title.includes('power') || title.includes('electricity')) cat = 'Utilities';
        else if (title.includes('cloth') || title.includes('shop') || title.includes('shoes') || title.includes('amazon') || title.includes('flipkart')) cat = 'Shopping';
        else cat = e.title; // Default to specific title if no keyword fits

        categories[cat] = (categories[cat] || 0) + parseFloat(e.amount);
      });

      const sorted = Object.entries(categories)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      return {
        month,
        year,
        topCategories: sorted,
        winner: sorted[0],
      };
    }

    case "getLoanSummary": {
      // LOAN = Money you borrowed (Debt - you must pay back)
      // LENDING = Money you lent to someone else (Receivable - they must pay you back)
      const loans = await db.financialEntry.findMany({
        where: { userId, type: 'LOAN' },
      });
      const lendings = await db.financialEntry.findMany({
        where: { userId, type: 'LENDING' },
      });

      const totalLoans = loans.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalLending = lendings.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      return {
        loanSummary: {
          totalOwedToOthers: totalLoans,
          activeLoansCount: loans.length,
          loans: loans.map(l => ({
            id: l.id,
            title: l.title,
            amount: parseFloat(l.amount),
            date: l.date.toISOString().split('T')[0],
            description: l.description,
          })),
        },
        lendingSummary: {
          totalReceivableFromOthers: totalLending,
          activeLendingsCount: lendings.length,
          lendings: lendings.map(l => ({
            id: l.id,
            title: l.title,
            amount: parseFloat(l.amount),
            date: l.date.toISOString().split('T')[0],
            description: l.description,
          })),
        },
      };
    }

    case "createTransaction": {
      const {
        title,
        amount,
        type = 'SPENDING',
        description = '',
        date,
        useSalaryBalance = (type === 'SPENDING'),
        salaryMonth,
        salaryYear,
      } = args;

      if (!title || amount === undefined) {
        throw new Error('Missing title or amount');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid financial amount');
      }

      const now = new Date();
      const m = salaryMonth ? parseInt(salaryMonth) : (now.getMonth() + 1);
      const y = salaryYear ? parseInt(salaryYear) : now.getFullYear();

      const entryData = {
        userId,
        amount: parsedAmount,
        title: title.trim(),
        description: description || '',
        type,
        useSalaryBalance: !!useSalaryBalance,
        date: date ? new Date(date) : now,
      };

      let deductionsToCreate = [];

      if (useSalaryBalance) {
        entryData.salaryMonth = m;
        entryData.salaryYear = y;

        const balances = await getMonthlyBalances(userId);
        const mBal = balances.find(b => b.month === m && b.year === y);
        const salRem = mBal ? mBal.salary.remaining : 0;
        const bonRem = mBal ? mBal.bonus.remaining : 0;

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
        message: `Successfully created ${type} entry "${title}" of amount ${parsedAmount}`,
        transaction: {
          id: created.id,
          title: created.title,
          amount: parseFloat(created.amount),
          type: created.type,
          date: created.date.toISOString().split('T')[0],
          useSalaryBalance: created.useSalaryBalance,
        },
      };
    }

    case "createMultipleTransactions": {
      const { transactions } = args;
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        throw new Error('Missing or empty transactions array');
      }

      const results = [];
      const now = new Date();

      for (const tx of transactions) {
        const parsedAmount = parseFloat(tx.amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) continue;

        const title = (tx.title || 'Untitled Expense').trim();
        const type = tx.type || 'SPENDING';
        const useSalaryBal = tx.useSalaryBalance !== undefined ? !!tx.useSalaryBalance : (type === 'SPENDING');
        const m = tx.salaryMonth ? parseInt(tx.salaryMonth) : (now.getMonth() + 1);
        const y = tx.salaryYear ? parseInt(tx.salaryYear) : now.getFullYear();

        const entryData = {
          userId,
          amount: parsedAmount,
          title,
          description: tx.description || '',
          type,
          useSalaryBalance: useSalaryBal,
          date: tx.date ? new Date(tx.date) : now,
        };

        let deductionsToCreate = [];

        if (useSalaryBal) {
          entryData.salaryMonth = m;
          entryData.salaryYear = y;

          const balances = await getMonthlyBalances(userId);
          const mBal = balances.find(b => b.month === m && b.year === y);
          const salRem = mBal ? mBal.salary.remaining : 0;
          const bonRem = mBal ? mBal.bonus.remaining : 0;

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

        const created = await db.$transaction(async (txDb) => {
          const entry = await txDb.financialEntry.create({ data: entryData });
          if (useSalaryBal && deductionsToCreate.length > 0) {
            await txDb.salaryDeduction.createMany({
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

        results.push({
          id: created.id,
          title: created.title,
          amount: parseFloat(created.amount),
          type: created.type,
          date: created.date.toISOString().split('T')[0],
        });
      }

      return {
        success: true,
        count: results.length,
        message: `Successfully created ${results.length} transactions in your ledger.`,
        createdTransactions: results,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
