'use client';

import { useEffect, useId, useRef, useState } from 'react';
import LineIcon from '@/components/ui/LineIcon';

/**
 * Charts for the Investments pages. Plain SVG/CSS, themed by the --mm-chart-*
 * tokens (validated for colour-blind separation in light and dark).
 *
 * Conventions: thin marks, value labels in text colours (never the series
 * colour), a legend whenever there are two or more series, and a hover/focus
 * readout on every mark. Every value is also printed or listed, so nothing is
 * reachable only by hovering.
 */

export const SERIES = ['var(--mm-chart-1)', 'var(--mm-chart-2)', 'var(--mm-chart-3)', 'var(--mm-chart-4)'];
export const MUTE = 'var(--mm-chart-mute)';

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Floating readout. `rows`: [{ color?, label, value }] — value leads, label follows. */
function Tip({ x, y, title, rows, align = 'center' }) {
  const shift = align === 'left' ? '0%' : align === 'right' ? '-100%' : '-50%';
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[120px] rounded-xl border border-(--mm-line) bg-(--mm-card) px-3 py-2 shadow-pop"
      style={{ left: x, top: y, transform: `translate(${shift}, calc(-100% - 10px))` }}
    >
      {title && <div className="mm-lbl mb-1 whitespace-nowrap">{title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 whitespace-nowrap text-[13px]">
          {r.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />}
          <b className="text-(--mm-ink)">{r.value}</b>
          <span className="text-(--mm-ink-3)">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranked horizontal bars — compare parts with each other (use instead of a pie)
// ---------------------------------------------------------------------------

/**
 * rows: [{ key, label, sub?, value }] (any order; sorted largest first).
 * `format(value)` prints the amount at the bar tip. `onSelect(row)` makes rows buttons.
 * `limit` folds the tail into "Other".
 */
export function RankedBars({ rows, format, onSelect, limit = 8, color = SERIES[0], otherLabel = 'Other' }) {
  const sorted = [...rows].filter(r => r.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.length > limit ? sorted.slice(0, limit - 1) : sorted;
  const tail = sorted.slice(head.length);
  const list = tail.length
    ? [...head, { key: '__other', label: `${otherLabel} (${tail.length})`, value: tail.reduce((s, r) => s + r.value, 0), other: true }]
    : head;
  const max = Math.max(1, ...list.map(r => r.value));
  const total = list.reduce((s, r) => s + r.value, 0);

  return (
    <ul className="flex flex-col gap-2.5">
      {list.map(r => {
        const pct = (r.value / max) * 100;
        const share = total > 0 ? Math.round((r.value / total) * 100) : 0;
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-bold text-(--mm-ink)">
                {r.label}
                {r.sub && <span className="mm-lbl ml-1.5 font-medium">{r.sub}</span>}
              </span>
              <span className="shrink-0 text-[13px] font-bold tabular-nums text-(--mm-ink)">
                {format(r.value)} <span className="mm-lbl font-medium">{share}%</span>
              </span>
            </span>
            <span className="mt-1.5 block h-3" aria-hidden="true">
              <span
                className="block h-3 rounded-r-[4px] transition-[width,filter] duration-500 group-hover:brightness-110"
                style={{ width: `max(3px, ${pct}%)`, background: r.other ? MUTE : color }}
              />
            </span>
          </>
        );
        return (
          <li key={r.key}>
            {onSelect && !r.other ? (
              <button type="button" onClick={() => onSelect(r)} className="mm-focus group block w-full cursor-pointer rounded-lg text-left">
                {body}
              </button>
            ) : <div className="group">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Segmented bar — how one whole splits, at a glance (<= 6 parts)
// ---------------------------------------------------------------------------

/**
 * parts: [{ key, label, value, color? }] in a fixed order (colour follows the part,
 * not its rank). Prints each share on its block when it fits; the legend lists
 * name + amount for every part.
 */
export function SegmentedBar({ parts, format, label = 'Split' }) {
  const [hover, setHover] = useState(null);
  const shown = parts.filter(p => p.value > 0);
  const total = shown.reduce((s, p) => s + p.value, 0);
  if (!total) return <div className="h-7 rounded-[4px] bg-(--mm-line-2)" role="img" aria-label={`${label}: nothing yet`} />;
  const summary = shown.map(p => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ');

  return (
    <div>
      <div className="flex h-7 gap-0.5" role="img" aria-label={`${label}: ${summary}`}>
        {shown.map((p, i) => {
          const share = (p.value / total) * 100;
          return (
            <span
              key={p.key}
              onPointerEnter={() => setHover(p.key)}
              onPointerLeave={() => setHover(null)}
              className="flex min-w-[3px] items-center rounded-[4px] pl-2 text-[12px] font-extrabold text-white transition-[filter] duration-150"
              style={{
                width: `${share}%`,
                background: p.color || SERIES[i % SERIES.length],
                filter: hover && hover !== p.key ? 'saturate(0.5) opacity(0.6)' : 'none',
              }}
            >
              {share >= 14 ? `${Math.round(share)}%` : ''}
            </span>
          );
        })}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {shown.map((p, i) => (
          <li
            key={p.key}
            onPointerEnter={() => setHover(p.key)}
            onPointerLeave={() => setHover(null)}
            className="flex items-center gap-2 text-[13px] font-semibold text-(--mm-ink)"
          >
            <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color || SERIES[i % SERIES.length] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
            <b className="tabular-nums">{format(p.value)}</b>
            <span className="mm-lbl w-9 text-right font-medium tabular-nums">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diverging bars — gain / loss around zero, one row per item
// ---------------------------------------------------------------------------

/**
 * rows: [{ key, label, sub?, value }] where value is signed (profit > 0, loss < 0).
 * Sorted best to worst. Sign is printed (+/−) so direction never relies on colour.
 */
export function DivergingBars({ rows, format, onSelect }) {
  const list = [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...list.map(r => Math.abs(r.value)));
  const up = 'var(--mm-chart-3)';
  const down = 'var(--mm-chart-2)';

  return (
    <div>
      <ul className="flex flex-col gap-2.5">
        {list.map(r => {
          const pct = (Math.abs(r.value) / max) * 50;
          const gain = r.value >= 0;
          const body = (
            <>
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-bold text-(--mm-ink)">
                  {r.label}
                  {r.sub && <span className="mm-lbl ml-1.5 font-medium">{r.sub}</span>}
                </span>
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-(--mm-ink)">
                  {gain ? '+' : '−'}{format(Math.abs(r.value))}
                </span>
              </span>
              <span className="relative mt-1.5 block h-3" aria-hidden="true">
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-(--mm-line)" />
                <span
                  className={`absolute top-0 h-3 transition-[width,filter] duration-500 group-hover:brightness-110 ${gain ? 'rounded-r-[4px]' : 'rounded-l-[4px]'}`}
                  style={{
                    width: `max(2px, ${pct}%)`,
                    background: gain ? up : down,
                    ...(gain ? { left: '50%' } : { right: '50%' }),
                  }}
                />
              </span>
            </>
          );
          return (
            <li key={r.key}>
              {onSelect ? (
                <button type="button" onClick={() => onSelect(r)} className="mm-focus group block w-full cursor-pointer rounded-lg text-left">{body}</button>
              ) : <div className="group">{body}</div>}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex gap-4 text-[12px] font-semibold text-(--mm-ink-2)">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: up }} aria-hidden="true" />Profit</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: down }} aria-hidden="true" />Loss</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend — change over time (one line with an area wash, or two lines)
// ---------------------------------------------------------------------------

function niceTicks(min, max, count = 3) {
  if (max <= min) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.01; v += step) ticks.push(v);
  return ticks;
}

/**
 * points: [{ label, [seriesKey]: number }] in time order.
 * series: [{ key, label, color? }] — one or two. One series gets an area wash and
 * no legend (the card title names it); two get a legend.
 * `format` prints full amounts (tooltip), `formatAxis` compact ones (y ticks).
 */
export function TrendChart({ points, series, format, formatAxis = format, height = 200, zeroBased = false, label = 'Trend' }) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState(null);
  const gradId = useId();
  const n = points.length;
  const keys = series.map(s => s.key);
  const values = points.flatMap(p => keys.map(k => Number(p[k]) || 0));
  const lo = zeroBased ? 0 : Math.min(...values);
  const hi = Math.max(...values, lo + 1);
  const ticks = niceTicks(lo, hi);
  const yMin = Math.min(lo, ticks[0]);
  const yMax = Math.max(hi, ticks[ticks.length - 1]);

  const padL = 44;
  const padR = 12;
  const padT = 10;
  const padB = 24;
  const w = Math.max(width, 200);
  const plotW = w - padL - padR;
  const plotH = height - padT - padB;
  const x = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => padT + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const path = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(Number(p[key]) || 0).toFixed(1)}`).join('');
  const colorOf = (s, i) => s.color || SERIES[i];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - padL) / (plotW || 1)) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  };

  const last = points[n - 1];
  const summary = n
    ? `${label}: ${series.map(s => `${s.label} ${format(Number(last[s.key]) || 0)}`).join(', ')} at ${last.label}`
    : `${label}: no data`;

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-4 text-[12px] font-semibold text-(--mm-ink-2)">
          {series.map((s, i) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: colorOf(s, i) }} aria-hidden="true" />{s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && n > 0 && (
          <svg
            width={w}
            height={height}
            role="img"
            aria-label={summary}
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
            className="block touch-pan-y"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: colorOf(series[0], 0), stopOpacity: 0.16 }} />
                <stop offset="1" style={{ stopColor: colorOf(series[0], 0), stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            {ticks.map(t => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--mm-line-2)' }} />
                <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fontWeight="600" style={{ fill: 'var(--mm-ink-3)' }}>{formatAxis(t)}</text>
              </g>
            ))}
            <text x={padL} y={height - 6} fontSize="11" fontWeight="600" style={{ fill: 'var(--mm-ink-3)' }}>{points[0].label}</text>
            {n > 1 && (
              <text x={w - padR} y={height - 6} textAnchor="end" fontSize="11" fontWeight="600" style={{ fill: 'var(--mm-ink-3)' }}>{last.label}</text>
            )}
            {series.length === 1 && n > 1 && (
              <path d={`${path(keys[0])}L${x(n - 1).toFixed(1)} ${padT + plotH}L${x(0).toFixed(1)} ${padT + plotH}z`} fill={`url(#${gradId})`} />
            )}
            {series.map((s, i) => (
              <path key={s.key} d={path(s.key)} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: colorOf(s, i) }} />
            ))}
            {active !== null && (
              <line x1={x(active)} x2={x(active)} y1={padT} y2={padT + plotH} style={{ stroke: 'var(--mm-ink-3)' }} strokeWidth="1" />
            )}
            {series.map((s, i) => {
              const idx = active ?? n - 1;
              return (
                <circle
                  key={s.key}
                  cx={x(idx)}
                  cy={y(Number(points[idx][s.key]) || 0)}
                  r="4.5"
                  strokeWidth="2"
                  style={{ fill: colorOf(s, i), stroke: 'var(--mm-card)' }}
                />
              );
            })}
          </svg>
        )}
        {active !== null && n > 0 && (
          <Tip
            x={Math.min(Math.max(x(active), 70), w - 70)}
            y={Math.min(...series.map(s => y(Number(points[active][s.key]) || 0)))}
            title={points[active].label}
            rows={series.map((s, i) => ({ color: colorOf(s, i), label: s.label, value: format(Number(points[active][s.key]) || 0) }))}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meter — one ratio against a limit
// ---------------------------------------------------------------------------

/** value / max as a bar on a same-hue track. tone: brand | good | warn | bad */
export function Meter({ value, max, label, tone = 'brand', thick = false }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fill = { brand: 'var(--mm-chart-1)', good: 'var(--mm-chart-3)', warn: 'var(--mm-chart-4)', bad: 'var(--mm-chart-2)' }[tone];
  const track = { brand: 'var(--mm-indigo-soft)', good: 'var(--mm-green-soft)', warn: 'var(--mm-gold-soft)', bad: 'var(--mm-orange-soft)' }[tone];
  return (
    <div
      className={`${thick ? 'h-2.5' : 'h-2'} rounded-full`}
      style={{ background: track }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status timeline — paid / missed / due / upcoming periods of a plan
// ---------------------------------------------------------------------------

const STATUS = {
  paid: { label: 'Paid', icon: 'check', bg: 'var(--mm-chart-3)', fg: '#fff', ring: 'transparent' },
  missed: { label: 'Missed', icon: 'close', bg: 'var(--mm-red-soft)', fg: 'var(--mm-red-ink)', ring: 'var(--mm-red-ink)' },
  due: { label: 'Due now', icon: 'alert', bg: 'var(--mm-gold-soft)', fg: 'var(--mm-gold-ink)', ring: 'var(--mm-chart-4)' },
  upcoming: { label: 'Upcoming', icon: null, bg: 'transparent', fg: 'var(--mm-ink-3)', ring: 'var(--mm-chart-mute)' },
};

/**
 * items: [{ key, label, status: 'paid' | 'missed' | 'due' | 'upcoming', title? }] in time order.
 * Each state has its own shape/icon as well as colour. `onSelect(item)` makes marks buttons.
 * Scrolls horizontally; the newest period is on the right.
 */
export function StatusTimeline({ items, onSelect, label = 'Payment history' }) {
  const scroller = useRef(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [items.length]);
  const used = [...new Set(items.map(i => i.status))];

  return (
    <div>
      <ol
        ref={scroller}
        aria-label={label}
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5 pt-1 [scrollbar-width:thin]"
      >
        {items.map(item => {
          const st = STATUS[item.status] || STATUS.upcoming;
          const mark = (
            <>
              <span
                className="grid h-8 w-8 place-items-center rounded-full"
                style={{ background: st.bg, color: st.fg, boxShadow: `inset 0 0 0 1.5px ${st.ring}` }}
              >
                {st.icon && <LineIcon name={st.icon} size={15} strokeWidth={2.4} />}
              </span>
              <span className="mm-lbl mt-1 block w-11 truncate text-center text-[10px] font-semibold">{item.label}</span>
              <span className="sr-only">{st.label}{item.title ? `, ${item.title}` : ''}</span>
            </>
          );
          return (
            <li key={item.key} className="flex shrink-0 flex-col items-center" title={`${item.label}: ${st.label}${item.title ? ` · ${item.title}` : ''}`}>
              {onSelect && item.status !== 'upcoming' ? (
                <button type="button" onClick={() => onSelect(item)} className="mm-focus flex cursor-pointer flex-col items-center rounded-lg">{mark}</button>
              ) : mark}
            </li>
          );
        })}
      </ol>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold text-(--mm-ink-2)">
        {used.map(s => {
          const st = STATUS[s] || STATUS.upcoming;
          return (
            <span key={s} className="flex items-center gap-1.5">
              <span className="grid h-4 w-4 place-items-center rounded-full" style={{ background: st.bg, color: st.fg, boxShadow: `inset 0 0 0 1.5px ${st.ring}` }}>
                {st.icon && <LineIcon name={st.icon} size={9} strokeWidth={3} />}
              </span>
              {st.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
