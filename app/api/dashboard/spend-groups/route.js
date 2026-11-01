import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getLogicalCyclePeriod, getRangeForLogicalPeriod } from '@/lib/cycle';
import { APPS, cycleLabel } from '@/lib/spendAnalytics';
import { tagEntries, slugify, FAMILY, MISC } from '@/lib/spendTagger';
import { ensureAssets, logoKey, itemAssetKey } from '@/lib/spendAssets';
import { iconEmoji, GROUP_ICON_KEYS } from '@/lib/spendIcons';

// First-ever load may need several Gemini calls to tag a cycle's entries.
export const maxDuration = 60;

const MAX_CYCLES = 6;
const APP_COLOR = new Map(APPS.map(a => [slugify(a.name), a.color]));
const GROUP_COLOR = { [FAMILY.slug]: '#8B5CF6', [MISC.slug]: '#64748B' };

const cycleKeyOf = ({ month, year }) => `${year}-${String(month).padStart(2, '0')}`;

function shiftBack({ month, year }, n) {
  let m = month - n;
  let y = year;
  while (m <= 0) { m += 12; y -= 1; }
  return { month: m, year: y };
}

function parseCycleKeys(param, current) {
  const keys = (param || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => /^\d{4}-(0[1-9]|1[0-2])$/.test(s));
  const unique = [...new Set(keys)].slice(0, MAX_CYCLES);
  return unique.length ? unique : [cycleKeyOf(current), cycleKeyOf(shiftBack(current, 1))];
}

function colorFor(slug) {
  if (GROUP_COLOR[slug]) return GROUP_COLOR[slug];
  if (APP_COLOR.has(slug)) return APP_COLOR.get(slug);
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 48%)`;
}

const round2 = (n) => Math.round(n * 100) / 100;

export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cycleDate = user.salaryCycleDate || 1;
    const current = getLogicalCyclePeriod(new Date(), cycleDate);
    const currentKey = cycleKeyOf(current);
    const { searchParams } = new URL(req.url);

    const cycles = parseCycleKeys(searchParams.get('cycles'), current).map(key => {
      const [year, month] = key.split('-').map(Number);
      const { startDate, endDate } = getRangeForLogicalPeriod(month, year, cycleDate);
      return { key, month, year, label: cycleLabel({ month, year }), startDate, endDate, isCurrent: key === currentKey, total: 0, count: 0 };
    });

    const minStart = new Date(Math.min(...cycles.map(c => c.startDate.getTime())));
    const maxEnd = new Date(Math.max(...cycles.map(c => c.endDate.getTime())));

    const rangeEntries = await db.financialEntry.findMany({
      where: { userId: user.id, type: 'SPENDING', date: { gte: minStart, lte: maxEnd } },
      include: { spendTag: true },
      orderBy: { date: 'desc' },
    });

    // Selected cycles may be non-contiguous; keep only entries inside one of them.
    const cycleOf = (date) => cycles.find(c => date >= c.startDate && date <= c.endDate);
    const entries = rangeEntries
      .map(e => ({ entry: e, cycle: cycleOf(e.date) }))
      .filter(x => x.cycle);

    const fresh = await tagEntries(user.id, entries.map(x => x.entry));

    // --- Aggregate merchant -> item -> per-cycle totals ----------------------
    const merchants = new Map();
    for (const { entry, cycle } of entries) {
      const tag = fresh.get(entry.id) || entry.spendTag;
      if (!tag) continue;
      const amount = parseFloat(entry.amount) || 0;
      cycle.total += amount;
      cycle.count += 1;

      let m = merchants.get(tag.merchantSlug);
      if (!m) {
        m = { slug: tag.merchantSlug, name: tag.merchant, domain: tag.merchantDomain || null, totals: {}, counts: {}, items: new Map() };
        merchants.set(tag.merchantSlug, m);
      }
      if (!m.domain && tag.merchantDomain) m.domain = tag.merchantDomain;
      m.totals[cycle.key] = (m.totals[cycle.key] || 0) + amount;
      m.counts[cycle.key] = (m.counts[cycle.key] || 0) + 1;

      const itemId = tag.item.toLowerCase();
      let it = m.items.get(itemId);
      if (!it) {
        it = { id: itemId, name: tag.item, itemKey: tag.itemKey, totals: {}, counts: {}, entries: [] };
        m.items.set(itemId, it);
      }
      it.totals[cycle.key] = (it.totals[cycle.key] || 0) + amount;
      it.counts[cycle.key] = (it.counts[cycle.key] || 0) + 1;
      it.entries.push({
        id: entry.id,
        cycleKey: cycle.key,
        date: entry.date,
        amount,
        title: entry.title,
        description: entry.description,
        type: entry.type,
        useSalaryBalance: entry.useSalaryBalance,
        salaryMonth: entry.salaryMonth,
        salaryYear: entry.salaryYear,
      });
    }

    // --- Assets (download-once into R2) -------------------------------------
    const merchantList = [...merchants.values()];
    const iconKeys = new Set([GROUP_ICON_KEYS.family, GROUP_ICON_KEYS.misc]);
    merchantList.forEach(m => m.items.forEach(it => iconKeys.add(it.itemKey)));
    const assets = await ensureAssets({
      logos: merchantList.map(m => ({ slug: m.slug, domain: m.domain })),
      items: [...iconKeys],
    }, { cap: 25 });

    const groupIconFor = (slug) => (slug === FAMILY.slug ? GROUP_ICON_KEYS.family : slug === MISC.slug ? GROUP_ICON_KEYS.misc : null);
    const primaryKey = cycles[0].key;
    const byPrimary = (a, b) => (b.totals[primaryKey] || 0) - (a.totals[primaryKey] || 0)
      || Object.values(b.totals).reduce((s, v) => s + v, 0) - Object.values(a.totals).reduce((s, v) => s + v, 0);

    const roundTotals = (t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, round2(v)]));

    const merchantsOut = merchantList.map(m => {
      const groupIcon = groupIconFor(m.slug);
      return {
        slug: m.slug,
        name: m.name,
        kind: groupIcon ? 'group' : (m.domain ? 'brand' : 'local'),
        color: colorFor(m.slug),
        logoUrl: groupIcon ? (assets[itemAssetKey(groupIcon)] || null) : (assets[logoKey(m.slug)] || null),
        emoji: groupIcon ? iconEmoji(groupIcon) : null,
        totals: roundTotals(m.totals),
        counts: m.counts,
        items: [...m.items.values()].map(it => ({
          ...it,
          totals: roundTotals(it.totals),
          imageUrl: assets[itemAssetKey(it.itemKey)] || null,
          emoji: iconEmoji(it.itemKey),
        })).sort(byPrimary),
      };
    }).sort(byPrimary);

    // Latest entries of the primary cycle, with their icons.
    const merchantBySlug = new Map(merchantsOut.map(m => [m.slug, m]));
    const recent = entries
      .filter(x => x.cycle.key === primaryKey)
      .slice(0, 10)
      .map(({ entry }) => {
        const tag = fresh.get(entry.id) || entry.spendTag;
        const m = merchantBySlug.get(tag?.merchantSlug);
        return {
          id: entry.id,
          date: entry.date,
          amount: parseFloat(entry.amount) || 0,
          title: entry.title,
          description: entry.description,
          type: entry.type,
          useSalaryBalance: entry.useSalaryBalance,
          salaryMonth: entry.salaryMonth,
          salaryYear: entry.salaryYear,
          merchant: tag?.merchant || MISC.name,
          merchantSlug: tag?.merchantSlug || MISC.slug,
          logoUrl: m?.logoUrl || null,
          merchantEmoji: m?.emoji || null,
          color: m?.color || colorFor(MISC.slug),
          item: tag?.item || entry.title,
          imageUrl: tag ? (assets[itemAssetKey(tag.itemKey)] || null) : null,
          emoji: iconEmoji(tag?.itemKey || 'other'),
        };
      });

    return NextResponse.json({
      cycleDate,
      currentKey,
      cycles: cycles.map(c => ({ ...c, total: round2(c.total) })),
      merchants: merchantsOut,
      recent,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/dashboard/spend-groups:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
