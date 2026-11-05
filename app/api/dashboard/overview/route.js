import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getLogicalCyclePeriod, getRangeForLogicalPeriod } from '@/lib/cycle';
import { cycleLabel } from '@/lib/spendAnalytics';
import { tagEntries } from '@/lib/spendTagger';
import { spendGroupOf } from '@/lib/spendCategories';

/**
 * Everything the dashboard charts need, in one pass over the last few salary
 * cycles of SPENDING entries:
 *   per cycle: total, cumulative spend by day (pace chart), category totals
 *   (with the items that drove each) and the top items.
 * Cycles are returned newest first; cycles[0] is the current one.
 */

// First-ever load may need Gemini calls to tag older cycles' entries.
export const maxDuration = 60;

const CYCLE_COUNT = 6; // 5 on screen + 1 so the oldest one still has a "vs previous" baseline
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_ITEMS = 5;
const ITEMS_PER_CATEGORY = 3;

const cycleKeyOf = ({ month, year }) => `${year}-${String(month).padStart(2, '0')}`;
const round2 = (n) => Math.round(n * 100) / 100;

function shiftBack({ month, year }, n) {
  let m = month - n;
  let y = year;
  while (m <= 0) { m += 12; y -= 1; }
  return { month: m, year: y };
}

function bump(map, name, amount, extra) {
  const id = name.toLowerCase();
  let row = map.get(id);
  if (!row) {
    row = { name, total: 0, count: 0, ...extra };
    map.set(id, row);
  }
  row.total += amount;
  row.count += 1;
  return row;
}

const byTotal = (a, b) => b.total - a.total;

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cycleDate = user.salaryCycleDate || 1;
    const now = new Date();
    const current = getLogicalCyclePeriod(now, cycleDate);

    const cycles = Array.from({ length: CYCLE_COUNT }, (_, i) => {
      const period = shiftBack(current, i);
      const { startDate, endDate } = getRangeForLogicalPeriod(period.month, period.year, cycleDate);
      const days = Math.max(1, Math.round((endDate.getTime() + 1 - startDate.getTime()) / DAY_MS));
      const elapsed = i === 0
        ? Math.min(days, Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / DAY_MS) + 1))
        : days;
      return {
        key: cycleKeyOf(period),
        label: cycleLabel(period),
        startDate,
        endDate,
        isCurrent: i === 0,
        days,
        elapsed,
        total: 0,
        count: 0,
        daily: new Array(days).fill(0),
        categories: new Map(),
        items: new Map(),
      };
    });

    const oldest = cycles[cycles.length - 1];
    const entries = await db.financialEntry.findMany({
      where: { userId: user.id, type: 'SPENDING', date: { gte: oldest.startDate, lte: cycles[0].endDate } },
      select: { id: true, amount: true, title: true, description: true, date: true, type: true, updatedAt: true, spendTag: true },
      orderBy: { date: 'desc' },
    });

    // AI merchant/item tags are cached per entry; only new or edited entries hit Gemini.
    const fresh = await tagEntries(user.id, entries);

    for (const entry of entries) {
      const t = entry.date.getTime();
      const cycle = cycles.find(c => t >= c.startDate.getTime() && t <= c.endDate.getTime());
      if (!cycle) continue;

      const amount = parseFloat(entry.amount) || 0;
      const tag = fresh.get(entry.id) || entry.spendTag || null;
      const group = spendGroupOf(entry, tag);
      const day = Math.min(cycle.days - 1, Math.max(0, Math.floor((t - cycle.startDate.getTime()) / DAY_MS)));
      const itemName = (tag?.item || entry.title || 'Untitled').trim() || 'Untitled';

      cycle.total += amount;
      cycle.count += 1;
      cycle.daily[day] += amount;

      const cat = bump(cycle.categories, group, amount, { id: group, items: new Map() });
      bump(cat.items, itemName, amount);

      const item = bump(cycle.items, itemName, amount, { byGroup: {} });
      item.byGroup[group] = (item.byGroup[group] || 0) + amount;
    }

    const out = cycles.map(c => {
      let run = 0;
      const cumulative = c.daily.map(v => {
        run += v;
        return Math.round(run);
      });
      return {
        key: c.key,
        label: c.label,
        startDate: c.startDate,
        endDate: c.endDate,
        isCurrent: c.isCurrent,
        days: c.days,
        elapsed: c.elapsed,
        total: round2(c.total),
        count: c.count,
        cumulative,
        categories: [...c.categories.values()].sort(byTotal).map(k => ({
          id: k.id,
          total: round2(k.total),
          count: k.count,
          topItems: [...k.items.values()].sort(byTotal).slice(0, ITEMS_PER_CATEGORY).map(i => i.name),
        })),
        items: [...c.items.values()].sort(byTotal).slice(0, TOP_ITEMS).map(i => ({
          name: i.name,
          category: Object.entries(i.byGroup).sort((a, b) => b[1] - a[1])[0][0],
          total: round2(i.total),
          count: i.count,
        })),
      };
    });

    return NextResponse.json({
      cycleDate,
      currentKey: out[0].key,
      cycles: out,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/dashboard/overview:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
