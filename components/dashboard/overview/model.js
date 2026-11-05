import { groupInfo, OTHER_GROUP } from '@/lib/spendCategories';
import { shortDate } from '@/components/dashboard/format';

/** Cycles shown in the chips and the cycle-by-cycle chart (API returns one more as a baseline). */
export const VISIBLE_CYCLES = 5;

/** Category series in rank order (mockup: indigo, orange, green, amber). */
export const PALETTE = [
  { mark: 'var(--mm-indigo)', soft: 'var(--mm-indigo-soft)', ink: 'var(--mm-indigo-ink)' },
  { mark: 'var(--mm-orange)', soft: 'var(--mm-orange-soft)', ink: 'var(--mm-orange-ink)' },
  { mark: 'var(--mm-green)', soft: 'var(--mm-green-soft)', ink: 'var(--mm-green-ink)' },
  { mark: 'var(--mm-gold)', soft: 'var(--mm-gold-soft)', ink: 'var(--mm-gold-ink)' },
];

/** Tinted tones for insight icons and change tags. */
export const TONES = {
  good: { soft: 'var(--mm-green-soft)', ink: 'var(--mm-green-ink)' },
  bad: { soft: 'var(--mm-red-soft)', ink: 'var(--mm-red-ink)' },
  warn: { soft: 'var(--mm-gold-soft)', ink: 'var(--mm-gold-ink)' },
  brand: { soft: 'var(--mm-indigo-soft)', ink: 'var(--mm-brand-ink)' },
};

/** Colour of a cycle by its position from the newest (0 = current). */
export const cycleColor = (indexFromNewest) => `var(--mm-cycle-${Math.min(Math.max(indexFromNewest, 0), 4)})`;

export const monthOf = (label) => (label || '').split(' ')[0];

/** 19940 -> "19.9k" (cycle-by-cycle labels). */
export function compactAmount(v) {
  const n = Math.round(Number(v) || 0);
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
}

/** ["a","b","c"] -> "a, b and c" */
export function listJoin(names) {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null);
const sumTotals = (rows) => rows.reduce((s, r) => s + (r.total || 0), 0);

/**
 * Spend so far this cycle vs the previous cycle on the same day.
 * `spent` is the hero amount so the % always matches what is on screen.
 */
export function paceVsLast(current, previous, spent = current?.total || 0) {
  if (!current) return null;
  const day = current.elapsed;
  const prevAt = previous ? previous.cumulative[Math.min(day, previous.days) - 1] || 0 : 0;
  return {
    day,
    spent,
    prevAt,
    diff: spent - prevAt,
    pct: pct(spent, prevAt),
    prevLabel: previous?.label || '',
    prevMonth: monthOf(previous?.label),
    prevTotal: previous?.total || 0,
  };
}

/**
 * Category slices for one cycle: top 3 + "Other" (or up to 4 real categories),
 * each with its share, colour and change vs the previous cycle.
 */
export function categorySlices(cycle, previous) {
  const cats = cycle?.categories || [];
  const total = cycle?.total || 0;
  const head = cats.length > 4 ? cats.slice(0, 3) : cats.slice(0, 4);
  const rest = cats.length > 4 ? cats.slice(3) : [];
  const headIds = new Set(head.map(c => c.id));
  const prevById = new Map((previous?.categories || []).map(c => [c.id, c]));

  const slices = head.map((c, i) => ({
    ...groupInfo(c.id),
    total: c.total,
    topItems: c.topItems,
    prevTotal: previous ? prevById.get(c.id)?.total || 0 : null,
    color: PALETTE[i],
  }));

  if (rest.length) {
    slices.push({
      ...OTHER_GROUP,
      total: sumTotals(rest),
      topItems: rest.flatMap(c => c.topItems).slice(0, 3),
      prevTotal: previous ? sumTotals(previous.categories.filter(c => !headIds.has(c.id))) : null,
      color: PALETTE[3],
    });
  }

  return slices.map(s => ({
    ...s,
    share: total > 0 ? (s.total / total) * 100 : 0,
    change: s.prevTotal ? pct(s.total, s.prevTotal) : null,
    isNew: s.prevTotal === 0 && s.total > 0,
  }));
}

/** Colour + icon for an item's category, matching the slices on screen. */
export function itemStyle(categoryId, slices) {
  const slice = slices.find(s => s.id === categoryId);
  if (slice) return { color: slice.color, icon: slice.icon, label: slice.name };
  const info = groupInfo(categoryId);
  return { color: PALETTE[3], icon: info.icon, label: info.name };
}

/** Change tag: decrease = green, small increase = amber, big increase = red. */
export function changeTag(slice) {
  if (slice.isNew) return { text: 'New', tone: TONES.warn };
  if (slice.change === null || !Number.isFinite(slice.change)) return null;
  const n = Math.round(Math.abs(slice.change));
  if (slice.change < 0) return { text: `↓ ${n}%`, tone: TONES.good };
  if (n === 0) return { text: '0%', tone: TONES.brand };
  return { text: `↑ ${n}%`, tone: slice.change > 25 ? TONES.bad : TONES.warn };
}

// --- Insight cards ----------------------------------------------------------

export function paceInsight(pace, money) {
  if (!pace) return null;
  const { pct: p, diff, prevMonth, prevLabel, prevTotal, day, spent } = pace;
  if (p === null) {
    return {
      icon: 'trend',
      tone: TONES.brand,
      title: `${money(spent)} spent so far`,
      body: prevTotal > 0
        ? `${prevMonth} had nothing logged by day ${day}, so there's no pace to compare.`
        : `Nothing logged in ${prevLabel || 'the last cycle'} to compare with yet.`,
    };
  }
  const n = Math.round(Math.abs(p));
  if (n === 0) {
    return { icon: 'trend', tone: TONES.brand, title: 'Same pace as last cycle', body: `Within ${money(Math.abs(diff))} of ${prevMonth} so far.` };
  }
  if (p < 0) {
    return { icon: 'trend', tone: TONES.good, title: `${n}% less than last cycle`, body: `You are ${money(-diff)} below ${prevMonth} so far.` };
  }
  return { icon: 'trend', tone: TONES.bad, title: `${n}% more than last cycle`, body: `You are ${money(diff)} above ${prevMonth} so far.` };
}

/** `endDate` is the cycle end computed on the client, so it is in the viewer's timezone. */
export function safeSpendInsight(kpis, current, endDate, money) {
  if (!kpis || !current) return null;
  const salaryTotal = Number(kpis.salaryTotal) || 0;
  const left = Number(kpis.salaryBalance) || 0;
  const daysLeft = Math.max(1, current.days - current.elapsed + 1);
  const dayWord = daysLeft === 1 ? 'day' : 'days';

  if (salaryTotal <= 0) {
    return {
      icon: 'target',
      tone: TONES.brand,
      title: "Add this cycle's income",
      body: 'Log your salary to see how much you can safely spend each day.',
      action: 'income',
    };
  }
  if (left <= 0) {
    return {
      icon: 'target',
      tone: TONES.bad,
      title: 'Salary used up',
      body: `Nothing left from this cycle's salary, with ${daysLeft} ${dayWord} to go.`,
    };
  }
  return {
    icon: 'target',
    tone: TONES.brand,
    title: `Safe to spend ${money(Math.floor(left / daysLeft))}/day`,
    body: `${money(left)} left for ${daysLeft} ${dayWord} (till ${shortDate(endDate)}).`,
  };
}

/** Biggest category move in the focused cycle vs the one before it. */
export function moverInsight(focus, previous, money) {
  if (!focus) return null;
  const prevById = new Map((previous?.categories || []).map(c => [c.id, c]));
  const curById = new Map(focus.categories.map(c => [c.id, c]));
  const ids = new Set([...curById.keys(), ...prevById.keys()]);

  const moves = [...ids].map(id => {
    const now = curById.get(id)?.total || 0;
    const before = prevById.get(id)?.total || 0;
    return { id, now, before, delta: now - before, topItems: curById.get(id)?.topItems || [] };
  });

  if (!moves.length) {
    return {
      icon: 'bag',
      tone: TONES.brand,
      title: 'No spending yet',
      body: `Log a purchase to see what's changing in ${focus.label}.`,
    };
  }

  // Without any spending in the previous cycle every category is "up"; describe the leader instead.
  const comparable = (previous?.total || 0) > 0;
  const up = moves.filter(m => m.delta > 0).sort((a, b) => b.delta - a.delta)[0];
  if (up && comparable) {
    const info = groupInfo(up.id);
    const p = pct(up.now, up.before);
    return {
      icon: info.icon,
      tone: TONES.bad,
      title: p === null ? `${info.short} up ${money(up.delta)}` : `${info.short} up ${Math.round(p)}%`,
      body: up.topItems.length
        ? `${listJoin(up.topItems)} drove most of it.`
        : `${money(up.delta)} more than ${monthOf(previous.label)}.`,
    };
  }

  const down = moves.filter(m => m.delta < 0).sort((a, b) => a.delta - b.delta)[0];
  if (down && comparable) {
    const info = groupInfo(down.id);
    return {
      icon: info.icon,
      tone: TONES.good,
      title: `${info.short} down ${Math.round(Math.abs(pct(down.now, down.before)))}%`,
      body: `${money(-down.delta)} less than ${monthOf(previous.label)}.`,
    };
  }

  const top = focus.categories[0];
  const info = groupInfo(top.id);
  return {
    icon: info.icon,
    tone: TONES.brand,
    title: `${info.short} leads ${focus.label}`,
    body: `${money(top.total)}${focus.isCurrent ? ' so far' : ''}${top.topItems.length ? `, mostly ${listJoin(top.topItems)}` : ''}.`,
  };
}
