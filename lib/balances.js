import { db } from './db';

/**
 * Fetches the total and remaining salary and bonus balances for all months/years for a user.
 * Can optionally exclude a specific financial entry ID's deductions (useful during editing).
 */
export async function getMonthlyBalances(userId, excludeEntryId = null) {
  const deductionsWhere = {
    entry: { userId }
  };
  if (excludeEntryId) {
    deductionsWhere.entryId = { not: parseInt(excludeEntryId) };
  }

  const [salaries, bonuses, deductions] = await Promise.all([
    db.salary.findMany({
      where: { userId },
      select: { year: true, month: true, amount: true }
    }),
    db.bonus.findMany({
      where: { userId },
      select: { year: true, month: true, amount: true }
    }),
    db.salaryDeduction.findMany({
      where: deductionsWhere,
      select: { year: true, month: true, amount: true, type: true }
    })
  ]);

  // Map to hold aggregated balances by "year-month"
  const balancesMap = {};

  // Helper to ensure key structure exists
  const ensureKey = (year, month) => {
    const key = `${year}-${month}`;
    if (!balancesMap[key]) {
      balancesMap[key] = {
        month,
        year,
        salary: { total: 0, deducted: 0, remaining: 0 },
        bonus: { total: 0, deducted: 0, remaining: 0 }
      };
    }
    return key;
  };

  // Populate salary totals
  for (const s of salaries) {
    const key = ensureKey(s.year, s.month);
    balancesMap[key].salary.total = parseFloat(s.amount);
    balancesMap[key].salary.remaining = parseFloat(s.amount);
  }

  // Populate bonus totals
  for (const b of bonuses) {
    const key = ensureKey(b.year, b.month);
    balancesMap[key].bonus.total = parseFloat(b.amount);
    balancesMap[key].bonus.remaining = parseFloat(b.amount);
  }

  // Apply deductions
  for (const d of deductions) {
    const key = ensureKey(d.year, d.month);
    const amt = parseFloat(d.amount);
    if (d.type === 'SALARY') {
      balancesMap[key].salary.deducted += amt;
      balancesMap[key].salary.remaining = Math.max(0, balancesMap[key].salary.remaining - amt);
    } else if (d.type === 'BONUS') {
      balancesMap[key].bonus.deducted += amt;
      balancesMap[key].bonus.remaining = Math.max(0, balancesMap[key].bonus.remaining - amt);
    }
  }

  return Object.values(balancesMap);
}
