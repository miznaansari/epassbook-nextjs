'use client';

import { compactAmount, cycleColor, monthOf } from './model';

function CardHead({ title, sub }) {
  return (
    <>
      <h2 className="mm-h2">{title}</h2>
      <div className="mm-lbl mb-3.5 mt-0.5">{sub}</div>
    </>
  );
}

// --- Where it went (donut) --------------------------------------------------

const R = 54;
const CIRC = 2 * Math.PI * R;

export function WhereItWent({ cycle, slices, money }) {
  const total = cycle?.total || 0;
  const amount = money(total);
  let offset = 0;
  const segments = slices.map(s => {
    const len = total > 0 ? (s.total / total) * CIRC : 0;
    const seg = { key: s.id, color: s.color.mark, len, offset };
    offset += len;
    return seg;
  });
  const summary = slices.map(s => `${s.short} ${Math.round(s.share)}%`).join(', ');

  return (
    <div className="mm-card p-[22px]">
      <CardHead title="Where it went" sub={`Share of ${cycle.label} spend`} />
      <div className="flex flex-col md:flex-row md:items-center md:gap-6">
        <div className="flex justify-center md:block">
          <svg
            viewBox="0 0 140 140"
            width="150"
            height="150"
            role="img"
            aria-label={total > 0 ? `${cycle.label} spend split: ${summary}` : `No spending in ${cycle.label}`}
            className="shrink-0"
          >
            <g fill="none" strokeWidth="22" transform="rotate(-90 70 70)">
              {total > 0 ? segments.map(s => (
                <circle
                  key={s.key}
                  cx="70"
                  cy="70"
                  r={R}
                  style={{ stroke: s.color }}
                  strokeDasharray={`${s.len.toFixed(1)} ${CIRC.toFixed(1)}`}
                  strokeDashoffset={(-s.offset).toFixed(1)}
                />
              )) : <circle cx="70" cy="70" r={R} style={{ stroke: 'var(--mm-line-2)' }} />}
            </g>
            <text x="70" y="66" textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: 'var(--mm-ink-3)' }}>
              {monthOf(cycle.label)} total
            </text>
            <text x="70" y="86" textAnchor="middle" fontSize={amount.length > 8 ? 15 : 18} fontWeight="800" style={{ fill: 'var(--mm-ink)' }}>
              {amount}
            </text>
          </svg>
        </div>
        {total > 0 ? (
          <ul className="mt-3.5 flex flex-1 flex-col gap-2.5 md:mt-0 md:gap-3">
            {slices.map(s => (
              <li key={s.id} className="flex items-center gap-2 text-[13px] font-semibold text-(--mm-ink)">
                <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color.mark }} aria-hidden="true" />
                <span className="flex-1 truncate">{s.name}</span>
                <b className="tabular-nums">{Math.round(s.share)}%</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3.5 flex-1 text-center text-[13px] text-(--mm-ink-2) md:mt-0 md:text-left">
            Nothing logged in {cycle.label} yet.
          </p>
        )}
      </div>
    </div>
  );
}

// --- Cycle by cycle (bars) --------------------------------------------------

/** `cycles` oldest -> newest. */
export function CycleBars({ cycles, focusKey, onSelect, money }) {
  const max = Math.max(1, ...cycles.map(c => c.total));
  const last = cycles.length - 1;

  return (
    <div className="mm-card p-[22px]">
      <CardHead title="Cycle by cycle" sub="Total spent per cycle (₹)" />
      <div className="flex h-[164px] items-end justify-between gap-2.5 [--bar-max:120px] md:h-[184px] md:[--bar-max:140px]">
        {cycles.map((c, i) => {
          const on = c.key === focusKey;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(c.key)}
              aria-pressed={on}
              aria-label={`${c.label}: ${money(c.total)}${c.isCurrent ? ' so far' : ''}`}
              className="mm-focus flex-1 cursor-pointer rounded-lg text-center"
            >
              <div className="mb-1 text-[11px] font-bold text-(--mm-ink) tabular-nums">{compactAmount(c.total)}</div>
              <div
                className="rounded-[8px_8px_4px_4px] transition-[height] duration-500"
                style={{
                  height: `max(3px, calc(var(--bar-max) * ${(c.total / max).toFixed(4)}))`,
                  background: cycleColor(last - i),
                  outline: on ? '2px solid var(--mm-outline)' : 'none',
                  outlineOffset: 2,
                }}
              />
              <div className={`mm-lbl mt-1.5 ${on ? 'text-(--mm-ink)' : ''}`}>{monthOf(c.label)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Spending pace (cumulative lines) --------------------------------------

const W = 300;
const H = 120;
const Y0 = 112; // y of ₹0
const Y_SPAN = 92; // ₹max sits at y = 20

/** Monotone cubic (Fritsch–Carlson) path; never overshoots a cumulative series. */
function monotonePath(pts) {
  const n = pts.length;
  if (!n) return '';
  const f = (v) => Math.round(v * 10) / 10;
  if (n === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(pts[i][0] + h)} ${f(pts[i][1] + t[i] * h)} ${f(pts[i + 1][0] - h)} ${f(pts[i + 1][1] - t[i + 1] * h)} ${f(pts[i + 1][0])} ${f(pts[i + 1][1])}`;
  }
  return d;
}

export function SpendingPace({ focus, previous, money }) {
  const shown = focus.cumulative.slice(0, focus.elapsed);
  const before = previous?.cumulative || [];
  const days = Math.max(focus.days, previous?.days || 0, 1);
  const max = Math.max(1, ...shown, ...before);

  const toPts = (series) => [[0, Y0], ...series.map((v, i) => [((i + 1) / days) * W, Y0 - (v / max) * Y_SPAN])];
  const cur = toPts(shown);
  const prev = toPts(before);
  const curPath = monotonePath(cur);
  const end = cur[cur.length - 1];
  const sub = focus.isCurrent ? 'Solid: this cycle · Dashed: last cycle' : `Solid: ${focus.label} · Dashed: ${previous?.label || 'previous'}`;
  const prevAt = before[Math.min(focus.elapsed, before.length) - 1] || 0;
  const label = `Cumulative spend: ${focus.label} ${money(shown[shown.length - 1] || 0)} by day ${focus.elapsed}`
    + (previous ? `; ${previous.label} ${money(prevAt)} by the same day` : '');

  return (
    <div className="mm-card p-[22px]">
      <CardHead title="Spending pace" sub={sub} />
      {focus.total === 0 && !previous?.total ? (
        <p className="py-10 text-center text-[13px] text-(--mm-ink-2)">No spending in these cycles yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="140" role="img" aria-label={label}>
          <g style={{ stroke: 'var(--mm-line)' }}>
            <path d="M0 30H300M0 60H300M0 90H300" />
          </g>
          {previous && (
            <path d={monotonePath(prev)} fill="none" style={{ stroke: 'var(--mm-dash)' }} strokeWidth="2.5" strokeDasharray="5 4" />
          )}
          <path d={`${curPath}V${H}H0z`} style={{ fill: 'var(--mm-indigo)' }} opacity=".1" />
          <path d={curPath} fill="none" style={{ stroke: 'var(--mm-indigo)' }} strokeWidth="3" strokeLinecap="round" />
          <circle cx={end[0]} cy={end[1]} r="5" style={{ fill: 'var(--mm-indigo)' }} />
        </svg>
      )}
    </div>
  );
}
