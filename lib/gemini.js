import { db } from './db';
import { getRangeForLogicalPeriod } from './cycle';

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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
