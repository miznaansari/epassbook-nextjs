'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  CartesianGrid,
} from 'recharts';
import LineIcon from '@/components/ui/LineIcon';
import { Pill } from '@/components/invest/kit';

export const CHART_RANGES = ['1D', '1W', '1M', '6M', '1Y', 'ALL'];

const RANGE_CAPTIONS = {
  '1D': 'Today',
  '1W': 'Past week',
  '1M': 'Past month',
  '6M': 'Past 6 months',
  '1Y': 'Past year',
  'ALL': 'Since first buy',
};

/**
 * Loads /api/stocks/history for the selected range (plus 1D, which powers today's P&L
 * and movers). Entries are tagged with the holdings fingerprint so adding/removing a lot
 * refetches, while the previous render stays on screen until the new one arrives.
 */
async function fetchHistory(range) {
  const res = await fetch(`/api/stocks/history?range=${range}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function usePortfolioHistory(range, holdingsKey, inMarketHours, onDayLoaded) {
  const [cache, setCache] = useState({});
  const [error, setError] = useState('');
  const inflight = useRef(new Set());
  const onDayLoadedRef = useRef(onDayLoaded);

  useEffect(() => {
    onDayLoadedRef.current = onDayLoaded;
  });

  const load = useCallback((r) => {
    const tag = `${holdingsKey}|${r}`;
    if (inflight.current.has(tag)) return;
    inflight.current.add(tag);
    fetchHistory(r)
      .then(data => {
        setCache(prev => ({ ...prev, [r]: { key: holdingsKey, data } }));
        setError('');
        // The 1D call also refreshes the server price cache
        if (r === '1D') onDayLoadedRef.current?.();
      })
      .catch(err => {
        console.error('Portfolio history error:', err);
        setError('Could not load market history.');
      })
      .finally(() => inflight.current.delete(tag));
  }, [holdingsKey]);

  const dayKey = cache['1D']?.key;
  const rangeKey = cache[range]?.key;

  useEffect(() => {
    if (!holdingsKey) return;
    if (dayKey !== holdingsKey) load('1D');
    if (range !== '1D' && rangeKey !== holdingsKey) load(range);
  }, [range, holdingsKey, dayKey, rangeKey, load]);

  // Re-sync intraday candles every minute while the market is open
  useEffect(() => {
    if (!holdingsKey || !inMarketHours) return;
    const interval = setInterval(() => load('1D'), 60000);
    return () => clearInterval(interval);
  }, [holdingsKey, inMarketHours, load]);

  const entry = cache[range];
  return {
    data: entry?.data || null,
    dayData: cache['1D']?.data || null,
    isStale: !entry || entry.key !== holdingsKey,
    error,
  };
}

function formatTick(t, range, intraday) {
  const d = new Date(t);
  if (range === '1D') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (intraday) return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  if (range === 'ALL' || range === '1Y') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatFullTime(t, intraday) {
  const d = new Date(t);
  if (intraday) {
    return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const AXIS_TICK = { fill: 'var(--mm-ink-3)', fontSize: 11, fontWeight: 600 };

function HoverTooltip({ active, payload, markers, intraday, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  const bought = markers[pt.i];
  return (
    <div className="rounded-xl border border-(--mm-line) bg-(--mm-card) px-3 py-2 text-left shadow-pop">
      <p className="text-[13px] font-extrabold tabular-nums text-(--mm-ink)">{formatCurrency(pt.value)}</p>
      <p className="text-[12px] font-semibold text-(--mm-ink-3)">{formatFullTime(pt.t, intraday)}</p>
      {bought && bought.map((lot, k) => (
        <p key={k} className="mt-1 text-[12px] font-semibold text-(--mm-ink-2)">
          Bought {lot.quantity} × {lot.symbol.split('.')[0]} @ {formatCurrency(lot.price)}
        </p>
      ))}
    </div>
  );
}

export default function PortfolioChart({
  data,
  isStale,
  error,
  range,
  onRangeChange,
  holdings,
  summary,
  liveTicks,
  inMarketHours,
  formatCurrency,
  formatCompact,
}) {
  const [selected, setSelected] = useState('PORTFOLIO');
  const [hoverIdx, setHoverIdx] = useState(null);

  const liveMode = inMarketHours && range === '1D';

  const activeSymbol = selected !== 'PORTFOLIO' && data?.symbols?.[selected] ? selected : 'PORTFOLIO';
  const symbolInfo = activeSymbol === 'PORTFOLIO' ? null : data.symbols[activeSymbol];

  const basePoints = data?.points || [];
  const lastT = basePoints.length ? basePoints[basePoints.length - 1].t : 0;
  const points = liveMode && data?.range === '1D'
    ? [...basePoints, ...liveTicks.filter(p => p.t > lastT)]
    : basePoints;

  const series = points
    .map(pt => ({ t: pt.t, value: activeSymbol === 'PORTFOLIO' ? pt.v : pt.p?.[activeSymbol] }))
    .filter(pt => pt.value !== undefined && pt.value !== null)
    .map((pt, i) => ({ ...pt, i }));

  const n = series.length;
  const latest = n ? series[n - 1].value : 0;
  const baseline = (() => {
    if (!n) return 0;
    if (range !== '1D') return series[0].value;
    if (activeSymbol === 'PORTFOLIO') return data?.baseline ?? series[0].value;
    return symbolInfo?.previousClose ?? series[0].value;
  })();

  const hovered = hoverIdx !== null && series[hoverIdx] ? series[hoverIdx] : null;
  const shownValue = hovered ? hovered.value : latest;
  const change = shownValue - baseline;
  const changePct = baseline ? (change / baseline) * 100 : 0;
  const shownUp = change >= 0;

  const lineColor = 'var(--mm-chart-1)';
  const markColor = 'var(--mm-chart-4)';
  const surface = 'var(--mm-card)';
  const muted = 'var(--mm-ink-3)';

  // Cost reference: invested capital for the basket, average buy price for a single stock
  const refValue = activeSymbol === 'PORTFOLIO' ? data?.invested : symbolInfo?.avgBuy;
  const refLabel = activeSymbol === 'PORTFOLIO' ? 'Invested' : 'Avg buy';
  const includeRef = refValue && range !== '1D' && range !== '1W';

  let lo = Infinity;
  let hi = -Infinity;
  series.forEach(pt => {
    lo = Math.min(lo, pt.value);
    hi = Math.max(hi, pt.value);
  });
  if (range === '1D' && baseline) {
    lo = Math.min(lo, baseline);
    hi = Math.max(hi, baseline);
  }
  if (includeRef) {
    lo = Math.min(lo, refValue);
    hi = Math.max(hi, refValue);
  }
  const pad = Math.max((hi - lo) * 0.12, hi * 0.002, 1);
  const domain = n ? [Math.max(0, lo - pad), hi + pad] : [0, 1];

  // Purchase markers inside the visible window
  const lots = !data ? [] : activeSymbol === 'PORTFOLIO'
    ? Object.entries(data.symbols).flatMap(([symbol, info]) => info.purchases.map(p => ({ ...p, symbol })))
    : symbolInfo.purchases.map(p => ({ ...p, symbol: activeSymbol }));
  const markers = {};
  if (n > 1) {
    lots.filter(l => l.t >= series[0].t).forEach(lot => {
      let idx = 0;
      while (idx + 1 < n && series[idx + 1].t <= lot.t) idx++;
      (markers[idx] = markers[idx] || []).push(lot);
    });
  }

  const ticks = n > 1 ? [...new Set([0.1, 0.37, 0.63, 0.9].map(f => Math.round((n - 1) * f)))] : [];
  const symbolChips = data ? Object.keys(data.symbols) : holdings.map(h => h.symbol);

  const caption = hovered
    ? formatFullTime(hovered.t, data?.intraday)
    : range === '1D' && !inMarketHours ? 'Last session' : RANGE_CAPTIONS[range];

  return (
    <div className="flex flex-col gap-4">
      {/* Basket / single stock switcher */}
      {symbolChips.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {['PORTFOLIO', ...symbolChips].map(sym => (
            <button
              key={sym}
              type="button"
              aria-pressed={activeSymbol === sym}
              onClick={() => setSelected(sym)}
              className={`mm-ft mm-focus ${activeSymbol === sym ? 'is-on' : ''}`}
            >
              {sym === 'PORTFOLIO' ? 'Portfolio' : sym.split('.')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Headline value, follows the crosshair like a broker chart */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mm-lbl truncate">
            {activeSymbol === 'PORTFOLIO'
              ? 'Portfolio value'
              : `${symbolInfo.name} · ${symbolInfo.quantity} ${symbolInfo.quantity === 1 ? 'share' : 'shares'}`}
          </div>
          <div className="mt-1 truncate text-[30px] font-extrabold leading-tight tabular-nums text-(--mm-ink) md:text-[34px]">
            {formatCurrency(n ? shownValue : summary.totalCurrentValue)}
          </div>
          {n > 1 && (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] font-bold tabular-nums">
              <span className={shownUp ? 'text-(--mm-good)' : 'text-(--mm-bad)'}>
                <span aria-hidden="true">{shownUp ? '▲' : '▼'}</span>{' '}
                {shownUp ? '+' : '−'}{formatCurrency(Math.abs(change))} ({shownUp ? '+' : '−'}{Math.abs(changePct).toFixed(2)}%)
              </span>
              <span className="font-semibold text-(--mm-ink-3)">{caption}</span>
            </p>
          )}
          {symbolInfo && (
            <p className="mm-lbl mt-1 tabular-nums">
              Holding value {formatCurrency(symbolInfo.quantity * latest)} · Avg buy {formatCurrency(symbolInfo.avgBuy)}
            </p>
          )}
        </div>
        {liveMode ? (
          <Pill tone="good">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" /> Live
          </Pill>
        ) : (
          <Pill tone="mute">{inMarketHours ? 'Market open' : 'Market closed'}</Pill>
        )}
      </div>

      {/* Chart viewport */}
      <div className={`h-60 w-full transition-opacity sm:h-72 ${isStale && data ? 'opacity-50' : ''}`}>
        {!data && !error ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-(--mm-soft)" aria-busy="true" />
        ) : n > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              onMouseMove={(state) => {
                const idx = Number(state?.activeTooltipIndex);
                setHoverIdx(Number.isFinite(idx) ? idx : null);
              }}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="portfolioGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: 'var(--mm-chart-1)', stopOpacity: 0.12 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--mm-chart-1)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--mm-line-2)" vertical={false} />
              <XAxis
                dataKey="i"
                type="number"
                domain={[0, n - 1]}
                ticks={ticks}
                tickFormatter={(i) => formatTick(series[Math.round(i)]?.t, range, data.intraday)}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                orientation="right"
                domain={domain}
                tickCount={4}
                tickFormatter={formatCompact}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<HoverTooltip markers={markers} intraday={data.intraday} formatCurrency={formatCurrency} />} cursor={{ stroke: muted, strokeWidth: 1 }} isAnimationActive={false} />
              {range === '1D' && (
                <ReferenceLine y={baseline} stroke={muted} strokeDasharray="4 4" ifOverflow="hidden" />
              )}
              {includeRef && (
                <ReferenceLine
                  y={refValue}
                  stroke={markColor}
                  strokeDasharray="4 4"
                  ifOverflow="hidden"
                  label={{ value: `${refLabel} ${formatCompact(refValue)}`, position: 'insideBottomLeft', fill: 'var(--mm-ink-2)', fontSize: 11, fontWeight: 600 }}
                />
              )}
              <Area
                type="linear"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#portfolioGrowthGradient)"
                isAnimationActive={!liveMode}
                animationDuration={500}
                activeDot={{ r: 5, fill: lineColor, stroke: surface, strokeWidth: 2 }}
              />
              {Object.keys(markers).map(idx => (
                <ReferenceDot
                  key={idx}
                  x={Number(idx)}
                  y={series[idx].value}
                  r={4}
                  fill={markColor}
                  stroke={surface}
                  strokeWidth={2}
                  ifOverflow="hidden"
                />
              ))}
              {liveMode && (
                <ReferenceDot x={n - 1} y={latest} r={4} fill={lineColor} stroke={surface} strokeWidth={2} className="animate-pulse" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-(--mm-line) px-4 text-center text-[13px] font-semibold text-(--mm-ink-3)">
            <LineIcon name={error ? 'alert' : 'trend'} size={24} />
            <span>{error || 'Not enough market data for this range yet.'}</span>
          </div>
        )}
      </div>

      {/* Range switch + legend */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="mm-seg w-full sm:w-auto" role="group" aria-label="Chart range">
          {CHART_RANGES.map(r => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => onRangeChange(r)}
              className={`mm-focus min-h-10 flex-1 px-0 sm:px-3.5 ${range === r ? 'is-on' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-(--mm-ink-2)">
          {range === '1D' && (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 border-t border-dashed border-(--mm-ink-3)" aria-hidden="true" /> Prev close
            </span>
          )}
          {includeRef && (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 border-t border-dashed border-(--mm-chart-4)" aria-hidden="true" /> {refLabel}
            </span>
          )}
          {Object.keys(markers).length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-(--mm-chart-4)" aria-hidden="true" /> Buy
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
