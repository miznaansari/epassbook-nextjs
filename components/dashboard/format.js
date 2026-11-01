export function makeMoney(currency = 'INR') {
  const code = currency || 'INR';
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  let fmt;
  try {
    fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 });
  } catch {
    fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  }
  return (v) => fmt.format(Math.round(Number(v) || 0));
}

/** % change from b to a; null when there is no baseline. */
export function pctChange(a, b) {
  if (!b) return null;
  return ((a - b) / b) * 100;
}

export function shortDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function relativeTime(ts, now = Date.now()) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export const cycleKeyOf = ({ month, year }) => `${year}-${String(month).padStart(2, '0')}`;
