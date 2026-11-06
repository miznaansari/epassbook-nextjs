import { getLogicalCyclePeriod, getRangeForLogicalPeriod } from '@/lib/cycle';
import { cycleLabel } from '@/lib/spendAnalytics';
import { groupInfo, spendGroupOf } from '@/lib/spendCategories';

/** Pure helpers for the E-Passbook: filters, row presentation, grouping, CSV. */

export const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'SPENDING', label: 'Spending', type: 'SPENDING' },
  { id: 'SAVINGS', label: 'Savings', type: 'SAVINGS' },
  { id: 'INCOME', label: 'Income', type: 'LOAN,ADVANCE' },
  { id: 'LENDING', label: 'Lent', type: 'LENDING' },
  { id: 'AI', label: 'AI added', ai: true },
];

/** Query params for /api/entries for a filter + search. */
export function entryQuery(filterId, search) {
  const f = FILTERS.find(x => x.id === filterId) || FILTERS[0];
  const params = new URLSearchParams();
  if (f.type) params.set('type', f.type);
  if (f.ai) params.set('ai', '1');
  if (search) params.set('q', search);
  return params;
}

// --- Row presentation ------------------------------------------------------

const TINT = {
  indigo: { soft: 'var(--mm-indigo-soft)', ink: 'var(--mm-indigo-ink)' },
  orange: { soft: 'var(--mm-orange-soft)', ink: 'var(--mm-orange-ink)' },
  green: { soft: 'var(--mm-green-soft)', ink: 'var(--mm-green-ink)' },
  amber: { soft: 'var(--mm-gold-soft)', ink: 'var(--mm-savings-ink)' },
  red: { soft: 'var(--mm-red-soft)', ink: 'var(--mm-red-ink)' },
};

const TYPE_META = {
  SPENDING: { tag: 'Spending', tone: TINT.red, sign: '−', ink: 'var(--mm-red-ink)', out: true },
  SAVINGS: { tag: 'Savings', tone: TINT.amber, sign: '−', ink: 'var(--mm-savings-ink)', out: true },
  LENDING: { tag: 'Lent', tone: TINT.indigo, sign: '−', ink: 'var(--mm-indigo-ink)', out: true },
  LOAN: { tag: 'Borrowed', tone: TINT.green, sign: '+', ink: 'var(--mm-green-ink)', out: false },
  ADVANCE: { tag: 'Advance', tone: TINT.green, sign: '+', ink: 'var(--mm-green-ink)', out: false },
};

// Spending category tint (mockup: Family = orange, Mobile/EMI = indigo).
const GROUP_TINT = {
  family: TINT.orange,
  shopping: TINT.orange,
  fun: TINT.orange,
  food: TINT.green,
  groceries: TINT.green,
  health: TINT.green,
};

// AI item icon -> row icon (mockup: phone for recharge/EMI, heart for family, notes for transfers).
const ITEM_ICON = {
  recharge: 'phone', gadget: 'phone', charger: 'phone', headphones: 'phone',
  money_transfer: 'cash', fee: 'cash',
  mother: 'love', father: 'love', elder_woman: 'love', elder_man: 'love', person: 'love', donation: 'love', religious: 'love',
};

const SIP_RE = /^SIP Payment:\s*(.+?)\s*\(([^)]+)\)\s*$/i;
const NOISE_RE = /^(quick ai entry|logged via ai|quick added|sip payment:)|ai assistant|gemini/i;
const isWithdrawal = (e) => e.type === 'ADVANCE' && /^withdrawal: /i.test(e.title || '');

function noteOf(entry) {
  const d = (entry.description || '').trim();
  return d && !NOISE_RE.test(d) ? d : '';
}

/** Everything a ledger row shows, derived from one /api/entries item. */
export function describeEntry(entry, money, { withDate = false } = {}) {
  const meta = TYPE_META[entry.type] || TYPE_META.SPENDING;
  const amount = Math.abs(parseFloat(entry.amount) || 0);
  let icon = 'cash';
  let tint = meta.tone;
  let tag = meta.tag;
  let kind;
  let extra = '';

  if (entry.type === 'SPENDING') {
    const group = entry.spendGroup || spendGroupOf(entry, null);
    const info = groupInfo(group);
    kind = info.short;
    icon = ITEM_ICON[entry.itemKey] || (group === 'family' ? 'love' : info.icon);
    tint = GROUP_TINT[group] || TINT.indigo;
  } else if (entry.type === 'SAVINGS') {
    const sip = SIP_RE.exec(entry.description || '');
    if (sip) {
      kind = 'SIP payment';
      extra = sip[2].toLowerCase();
      icon = 'repeat';
    } else if (/^invested in /i.test(entry.title || '')) {
      kind = 'Stocks';
      icon = 'stocks';
    } else {
      kind = 'Savings';
      icon = 'wallet';
    }
  } else if (entry.type === 'LENDING') {
    kind = 'Lent';
    const unpaid = Number(entry.unpaidAmount);
    if (Number.isFinite(unpaid)) extra = unpaid > 0 ? `Unpaid ${money(unpaid)}` : 'Repaid';
  } else if (entry.type === 'LOAN') {
    kind = 'Borrowed';
  } else if (isWithdrawal(entry)) {
    kind = 'From savings';
    tag = 'Withdrawal';
    icon = 'wallet';
  } else {
    kind = 'Advance';
    icon = 'wallet';
  }

  const parts = [];
  if (withDate) parts.push(dayMonth(new Date(entry.date)));
  parts.push(kind);
  if (extra) parts.push(extra);
  if (entry.useSalaryBalance && entry.salaryMonth) parts.push(`Deducted ${entry.salaryMonth}/${entry.salaryYear}`);
  const note = noteOf(entry);
  if (note && note.toLowerCase() !== (entry.title || '').toLowerCase()) parts.push(note);

  return {
    icon,
    tint,
    tag,
    tagTone: meta.tone,
    sign: meta.sign,
    ink: meta.ink,
    amount,
    out: meta.out,
    subtitle: parts.join(' · '),
    category: kind,
    isAi: Boolean(entry.isAiGenerated),
    canRepay: entry.type === 'LENDING' && Number(entry.unpaidAmount) > 0,
  };
}

// --- Grouping ---------------------------------------------------------------

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayMonth = (d) => `${d.getDate()} ${MON[d.getMonth()]}`;

function dayHeading(date, now) {
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const key = dayKey(date);
  const rel = key === today ? 'Today' : key === dayKey(y) ? 'Yesterday' : null;
  const wd = WD[date.getDay()];
  const sameYear = date.getFullYear() === now.getFullYear();
  return {
    title: rel || wd,
    // Desktop: "Thu, 5 Nov 2026" / "2 Nov 2026"; mobile: "Thu 5 Nov" / "2 Nov"
    long: rel ? `${wd}, ${dayMonth(date)} ${date.getFullYear()}` : `${dayMonth(date)} ${date.getFullYear()}`,
    short: `${rel ? `${wd} ` : ''}${dayMonth(date)}${sameYear ? '' : ` ${date.getFullYear()}`}`,
  };
}

function cycleHeading(entryDate, cycleDate) {
  const p = getLogicalCyclePeriod(entryDate, cycleDate);
  const { startDate, endDate } = getRangeForLogicalPeriod(p.month, p.year, cycleDate);
  const range = `${dayMonth(startDate)} – ${dayMonth(endDate)}`;
  return {
    key: `${p.year}-${pad(p.month)}`,
    title: cycleLabel(p),
    long: `${range} ${endDate.getFullYear()}`,
    short: range,
  };
}

/**
 * Entries (newest first) -> sections. mode 'day' groups by local calendar day,
 * 'month' by salary cycle. Each section carries its money out / in totals.
 */
export function groupEntries(entries, mode, cycleDate, now = new Date()) {
  const groups = new Map();
  for (const entry of entries) {
    const date = new Date(entry.date);
    const head = mode === 'month' ? cycleHeading(date, cycleDate) : { key: dayKey(date), ...dayHeading(date, now) };
    let g = groups.get(head.key);
    if (!g) {
      g = { ...head, entries: [], out: 0, inflow: 0 };
      groups.set(head.key, g);
    }
    g.entries.push(entry);
    const amt = Math.abs(parseFloat(entry.amount) || 0);
    if ((TYPE_META[entry.type] || TYPE_META.SPENDING).out) g.out += amt;
    else g.inflow += amt;
  }
  return [...groups.values()];
}

// --- CSV export -------------------------------------------------------------

function csvCell(value, { text = true } = {}) {
  let s = value == null ? '' : String(value);
  // Neutralise spreadsheet formulas in free text.
  if (text && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function entriesToCsv(entries, money) {
  const head = ['Date', 'Title', 'Type', 'Category', 'Amount', 'Salary cycle', 'Note'];
  const rows = entries.map(e => {
    const v = describeEntry(e, money);
    const d = new Date(e.date);
    const signed = (v.out ? -1 : 1) * v.amount;
    return [
      csvCell(dayKey(d)),
      csvCell(e.title),
      csvCell(v.tag),
      csvCell(v.category),
      csvCell(signed.toFixed(2), { text: false }),
      csvCell(e.useSalaryBalance && e.salaryMonth ? `${e.salaryMonth}/${e.salaryYear}` : ''),
      csvCell(e.description || ''),
    ].join(',');
  });
  return [head.join(','), ...rows].join('\r\n');
}
