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
import { TrendingUp, TrendingDown, LineChart as LineChartIcon, AlertCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

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

function HoverTooltip({ active, payload, markers, intraday, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  const bought = markers[pt.i];
  return (
    <div className="bg-[#0a0a0c]/98 border border-white/[0.08] px-2.5 py-1.5 rounded-lg shadow-xl text-left font-mono">
      <p className="text-[10px] text-slate-400">{formatFullTime(pt.t, intraday)}</p>
      <p className="text-xs font-semibold text-white">{formatCurrency(pt.value)}</p>
      {bought && bought.map((lot, k) => (
        <p key={k} className="text-[10px] text-[#818cf8] mt-0.5">
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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
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
  const isUp = latest >= baseline;
  const shownUp = change >= 0;

  const upColor = isLight ? '#059669' : '#10B981';
  const downColor = isLight ? '#E11D48' : '#F43F5E';
  const lineColor = isUp ? upColor : downColor;
  const surface = isLight ? '#FFFFFF' : '#0a0a0c';
  const muted = isLight ? '#94A3B8' : '#64748B';
  const grid = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)';

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
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
          {['PORTFOLIO', ...symbolChips].map(sym => (
            <button
              key={sym}
              type="button"
              onClick={() => setSelected(sym)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider whitespace-nowrap border transition-all cursor-pointer ${
                activeSymbol === sym
                  ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              {sym === 'PORTFOLIO' ? 'Portfolio' : sym.split('.')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Headline value — follows the crosshair like a broker chart */}
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2] shrink-0"></span>
            {activeSymbol === 'PORTFOLIO'
              ? 'Portfolio Valuation'
              : `${symbolInfo.name} · ${symbolInfo.quantity} ${symbolInfo.quantity === 1 ? 'share' : 'shares'}`}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2 truncate">
            {formatCurrency(n ? shownValue : summary.totalCurrentValue)}
          </h2>
          {n > 1 && (
            <p className={`text-xs sm:text-sm font-mono font-semibold mt-1.5 flex flex-wrap items-center gap-1.5 ${shownUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {shownUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {shownUp ? '+' : '-'}{formatCurrency(Math.abs(change))} ({shownUp ? '+' : ''}{changePct.toFixed(2)}%)
              <span className="text-slate-400 font-normal">{caption}</span>
            </p>
          )}
          {symbolInfo && (
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Holding value {formatCurrency(symbolInfo.quantity * latest)} · Avg buy {formatCurrency(symbolInfo.avgBuy)}
            </p>
          )}
        </div>
        {liveMode ? (
          <span className="shrink-0 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE
          </span>
        ) : (
          <span className="shrink-0 px-2 py-1 bg-white/[0.03] border border-white/[0.06] text-slate-400 text-[10px] font-mono rounded-lg">
            {inMarketHours ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
        )}
      </div>

      {/* Chart viewport */}
      <div className={`h-60 sm:h-72 w-full transition-opacity ${isStale && data ? 'opacity-50' : ''}`}>
        {!data && !error ? (
          <div className="h-full w-full bg-white/[0.02] border border-white/[0.04] rounded-xl animate-pulse" />
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
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="i"
                type="number"
                domain={[0, n - 1]}
                ticks={ticks}
                tickFormatter={(i) => formatTick(series[Math.round(i)]?.t, range, data.intraday)}
                stroke={muted}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                orientation="right"
                domain={domain}
                tickCount={4}
                tickFormatter={formatCompact}
                stroke={muted}
                fontSize={10}
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
                  stroke="#818cf8"
                  strokeDasharray="4 4"
                  ifOverflow="hidden"
                  label={{ value: `${refLabel} ${formatCompact(refValue)}`, position: 'insideBottomLeft', fill: '#818cf8', fontSize: 10 }}
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
                  fill="#818cf8"
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
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono border border-dashed border-white/[0.06] rounded-xl">
            {error ? <AlertCircle className="w-6 h-6 opacity-40" /> : <LineChartIcon className="w-6 h-6 opacity-40" />}
            <span>{error || 'Not enough market data for this range yet.'}</span>
          </div>
        )}
      </div>

      {/* Range chips + legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center bg-[#050506] border border-white/[0.06] rounded-xl p-0.5 self-start">
          {CHART_RANGES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`px-2.5 sm:px-3 py-1 text-[11px] font-mono rounded-lg font-medium transition-all cursor-pointer ${
                range === r
                  ? 'bg-[#5E6AD2] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
          {range === '1D' && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-slate-500"></span> Prev close
            </span>
          )}
          {includeRef && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-[#818cf8]"></span> {refLabel}
            </span>
          )}
          {Object.keys(markers).length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#818cf8]"></span> Buy
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
