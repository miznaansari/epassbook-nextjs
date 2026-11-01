// Bar charts in assistant replies.
//
// The model emits a fenced block (see the CHARTS section of the system prompt in
// app/api/chat/route.js):
//
//   ```chart
//   {"type":"bar","title":"Spending by category · Oct 2026","format":"currency",
//    "data":[{"label":"Food","value":4200},{"label":"Travel","value":1800}]}
//   ```
//
// Multi-series (e.g. two months side by side) adds
//   "series":[{"key":"sep","name":"Sep"},{"key":"oct","name":"Oct"}]
// with those keys on every data row.

import { makeMoney } from '@/components/dashboard/format';

export const MAX_BARS = 20;
export const MAX_SERIES = 4; // the validated categorical palette has 4 slots

// Only ```chart — a ```json:… fence would be picked up by the transaction-proposal
// regex in markdown.jsx.
const FENCE = '```chart(?![\\w:-])';
const chartBlockRe = () => new RegExp(`${FENCE}[ \\t]*\\n?([\\s\\S]*?)\`\`\``, 'g');
const OPEN_FENCE_RE = new RegExp(FENCE);

function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Validate and normalise a chart spec. Returns null when it can't be drawn.
 * Series values are stored under internal keys (s0, s1, …) so a series key can
 * never collide with `label`.
 */
export function parseChartSpec(raw) {
  let spec;
  try {
    spec = typeof raw === 'string' ? JSON.parse(raw.trim()) : raw;
  } catch {
    return null;
  }
  if (!spec || typeof spec !== 'object' || !Array.isArray(spec.data)) return null;

  const declared = Array.isArray(spec.series)
    ? spec.series.filter(s => s && (typeof s.key === 'string' || typeof s.key === 'number'))
    : [];
  const source = declared.length
    ? declared.slice(0, MAX_SERIES).map(s => ({ key: String(s.key), name: String(s.name ?? s.key) }))
    : [{ key: 'value', name: String(spec.valueLabel || spec.title || 'Value') }];
  const series = source.map((s, i) => ({ ...s, dataKey: `s${i}` }));

  const data = spec.data
    .map(row => {
      const label = String(row?.label ?? row?.name ?? '').trim();
      const out = { label };
      series.forEach(s => { out[s.dataKey] = toNumber(row?.[s.key]); });
      return out;
    })
    .filter(r => r.label && series.some(s => r[s.dataKey] !== null))
    .slice(0, MAX_BARS);

  if (!data.length) return null;

  const format = ['currency', 'number', 'percent'].includes(spec.format) ? spec.format : 'currency';
  const orientation = spec.orientation === 'horizontal' || spec.orientation === 'vertical' ? spec.orientation : null;

  return { title: String(spec.title || '').trim(), format, orientation, series, data };
}

/** Full-precision formatter for tooltips, tables and copied text. */
export function makeValueFormatter(format, currency = 'INR') {
  if (format === 'percent') {
    return v => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`);
  }
  if (format === 'number') {
    return v => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  }
  const money = makeMoney(currency);
  return v => (v === null || v === undefined ? '—' : money(v));
}

/** Compact formatter for axis ticks (₹4.2k, ₹1.5L, 12%). */
export function makeCompactValueFormatter(format, currency = 'INR') {
  if (format === 'percent') return v => `${Math.round(v)}%`;
  const prefix = format === 'currency' ? (currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '') : '';
  return (v) => {
    const abs = Math.abs(v);
    if (currency === 'INR' || format !== 'currency') {
      if (abs >= 10000000) return `${prefix}${(v / 10000000).toFixed(1)}Cr`;
      if (abs >= 100000) return `${prefix}${(v / 100000).toFixed(1)}L`;
    } else if (abs >= 1000000) {
      return `${prefix}${(v / 1000000).toFixed(1)}M`;
    }
    if (abs >= 1000) return `${prefix}${(v / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    return `${prefix}${Math.round(v)}`;
  };
}

/** Plain-text version of a chart (title + one line per bar), for Copy. */
export function chartToPlainText(raw, currency = 'INR') {
  const spec = parseChartSpec(raw);
  if (!spec) return '';
  const fmt = makeValueFormatter(spec.format, currency);
  const multi = spec.series.length > 1;
  const lines = spec.data.map(row => (multi
    ? `- ${row.label}: ${spec.series.map(s => `${s.name} ${fmt(row[s.dataKey])}`).join(' · ')}`
    : `- ${row.label}: ${fmt(row[spec.series[0].dataKey])}`));
  return [spec.title, ...lines].filter(Boolean).join('\n');
}

/** Replace every chart block with its plain-text table (for the clipboard). */
export function replaceChartsWithText(text, currency = 'INR') {
  if (!text) return text;
  return text.replace(chartBlockRe(), (_, raw) => chartToPlainText(raw, currency));
}

/** Replace every chart block with a short spoken cue (for read-aloud). */
export function stripChartsForSpeech(text) {
  if (!text) return text;
  return text
    .replace(chartBlockRe(), ' I have drawn a chart for this. ')
    .replace(new RegExp(`${FENCE}[\\s\\S]*$`), ' I have drawn a chart for this. ');
}

/**
 * Split message text into text / chart segments, in order.
 * An unterminated trailing chart fence becomes `chart-pending` while the reply is
 * still streaming (so raw JSON never flashes), and is parsed as-is once it ends.
 */
export function splitChartBlocks(text, { streaming = false } = {}) {
  const segments = [];
  if (!text) return segments;
  let last = 0;
  for (const m of text.matchAll(chartBlockRe())) {
    if (m.index > last) segments.push({ type: 'text', value: text.slice(last, m.index) });
    segments.push({ type: 'chart', value: m[1].trim() });
    last = m.index + m[0].length;
  }

  let tail = text.slice(last);
  const open = tail.search(OPEN_FENCE_RE);
  if (open !== -1) {
    const before = tail.slice(0, open);
    const body = tail.slice(open).replace(OPEN_FENCE_RE, '').trim();
    if (before.trim()) segments.push({ type: 'text', value: before });
    segments.push(streaming ? { type: 'chart-pending' } : { type: 'chart', value: body });
    tail = '';
  }
  if (tail) segments.push({ type: 'text', value: tail });
  return segments;
}
