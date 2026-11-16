import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getRangeForLogicalPeriod } from '@/lib/cycle';
import { cycleLabel } from '@/lib/spendAnalytics';
import { tagEntries, MISC } from '@/lib/spendTagger';
import { SPEND_GROUPS, spendGroupOf } from '@/lib/spendCategories';

/**
 * Every SPENDING entry of one salary cycle that falls in the given dashboard
 * categories, with where it was spent (AI merchant + item tag).
 *   GET /api/dashboard/category?cycle=2026-11&groups=food,groceries
 * Uses the same classifier as /api/dashboard/overview, so totals match the
 * "Category breakdown" rows.
 */

// Untagged or edited entries are AI-tagged on demand.
export const maxDuration = 60;

const round2 = (n) => Math.round(n * 100) / 100;

export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cycleKey = searchParams.get('cycle') || '';
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(cycleKey)) {
      return NextResponse.json({ error: 'Invalid cycle' }, { status: 400 });
    }
    const groups = new Set((searchParams.get('groups') || '').split(',').map(s => s.trim()).filter(Boolean));
    if (!groups.size || [...groups].some(g => !Object.prototype.hasOwnProperty.call(SPEND_GROUPS, g))) {
      return NextResponse.json({ error: 'Invalid groups' }, { status: 400 });
    }

    const [year, month] = cycleKey.split('-').map(Number);
    const { startDate, endDate } = getRangeForLogicalPeriod(month, year, user.salaryCycleDate || 1);

    const rows = await db.financialEntry.findMany({
      where: { userId: user.id, type: 'SPENDING', date: { gte: startDate, lte: endDate } },
      select: {
        id: true, amount: true, title: true, description: true, date: true, type: true,
        useSalaryBalance: true, salaryMonth: true, salaryYear: true, updatedAt: true, spendTag: true,
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    const fresh = await tagEntries(user.id, rows);

    let total = 0;
    const entries = [];
    for (const entry of rows) {
      const tag = fresh.get(entry.id) || entry.spendTag || null;
      const group = spendGroupOf(entry, tag);
      if (!groups.has(group)) continue;
      const amount = parseFloat(entry.amount) || 0;
      total += amount;
      entries.push({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        amount,
        date: entry.date,
        type: entry.type,
        useSalaryBalance: entry.useSalaryBalance,
        salaryMonth: entry.salaryMonth,
        salaryYear: entry.salaryYear,
        merchant: tag?.merchant || MISC.name,
        merchantSlug: tag?.merchantSlug || MISC.slug,
        item: tag?.item || entry.title,
        itemKey: tag?.itemKey || null,
        group,
      });
    }

    return NextResponse.json({
      cycle: { key: cycleKey, label: cycleLabel({ month, year }), startDate, endDate },
      total: round2(total),
      count: entries.length,
      entries,
    });
  } catch (error) {
    console.error('Error in /api/dashboard/category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
