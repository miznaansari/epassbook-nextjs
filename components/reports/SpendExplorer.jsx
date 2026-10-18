'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ShoppingBasket,
  Bike,
  UtensilsCrossed,
  ShoppingBag,
  Car,
  Receipt,
  House,
  Tv,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Plane,
  Sparkles,
  Gift,
  Landmark,
  CircleDashed,
  Smartphone,
  LayoutGrid,
  Store,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { computeSpendTrend } from '@/lib/spendAnalytics';
import { useChartTheme } from './chartTheme';

const CATEGORY_ICONS = {
  groceries: ShoppingBasket,
  food_delivery: Bike,
  dining: UtensilsCrossed,
  shopping: ShoppingBag,
  transport: Car,
  bills: Receipt,
  housing: House,
  subscriptions: Tv,
  entertainment: Clapperboard,
  health: HeartPulse,
  education: GraduationCap,
  travel: Plane,
  personal: Sparkles,
  family: Gift,
  finance: Landmark,
  other: CircleDashed,
};

const TABS = [
  { id: 'apps', label: 'Apps', icon: Smartphone },
  { id: 'categories', label: 'Categories', icon: LayoutGrid },
  { id: 'merchants', label: 'Merchants', icon: Store },
];

// Dark ink on light brand colors (Blinkit yellow), white ink on dark ones
function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#0a0a0c' : '#ffffff';
}

function RowBadge({ tab, row }) {
  if (tab === 'categories') {
    const Icon = CATEGORY_ICONS[row.key] || CircleDashed;
    return (
      <span className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#818cf8]" />
      </span>
    );
  }
  if (row.color) {
    return (
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ backgroundColor: row.color, color: inkFor(row.color) }}
      >
        {row.name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 text-xs font-semibold text-slate-300">
      {row.name.charAt(0).toUpperCase()}
    </span>
  );
}

// Spending up is bad, down is good — arrow + sign carry the meaning, not just color
function ChangeChip({ change, hasCompare, prevAmount }) {
  if (!hasCompare) return null;
  if (change === null) {
    return prevAmount === 0 ? <span className="text-[10px] font-mono text-[#818cf8]">NEW</span> : null;
  }
  const up = change >= 0;
  return (
    <span className={`text-[10px] font-mono flex items-center gap-0.5 ${up ? 'text-rose-400' : 'text-emerald-400'}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

function TrendTooltip({ active, payload, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-[#0a0a0c]/98 border border-white/[0.08] p-3 rounded-xl shadow-2xl text-left min-w-[170px] space-y-1">
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
        {pt.name} cycle{pt.isCurrent ? ' · in progress' : ''}
      </p>
      <p className="text-base font-bold text-white">{formatCurrency(pt.amount)}</p>
      <p className="text-[10px] font-mono text-slate-400">{pt.count} {pt.count === 1 ? 'transaction' : 'transactions'}</p>
    </div>
  );
}

export default function SpendExplorer({ insights, cycleDate, formatCurrency, formatCompact }) {
  const theme = useChartTheme();
  const [tab, setTab] = useState('apps');
  const [selection, setSelection] = useState({ kind: 'all', key: null, name: 'All spending' });

  const hasCompare = Boolean(insights.window.compareLabel);
  const rows = tab === 'apps'
    ? insights.apps
    : tab === 'categories'
      ? insights.categories
      : insights.merchants.slice(0, 20);
  const kindForTab = tab === 'apps' ? 'app' : tab === 'categories' ? 'category' : 'merchant';

  const trend = useMemo(
    () => computeSpendTrend(insights.spends, selection, cycleDate, insights.window.trendCycles),
    [insights.spends, selection, cycleDate, insights.window.trendCycles]
  );

  const trendTotal = trend.reduce((s, t) => s + t.amount, 0);
  const completed = trend.filter(t => !t.isCurrent);
  const avgPerCycle = completed.length ? completed.reduce((s, t) => s + t.amount, 0) / completed.length : 0;
  const lastDone = completed[completed.length - 1];
  const beforeLast = completed[completed.length - 2];
  const cycleChange = lastDone && beforeLast && beforeLast.amount > 0
    ? ((lastDone.amount - beforeLast.amount) / beforeLast.amount) * 100
    : null;
  const peak = trend.reduce((best, t) => (t.amount > (best?.amount ?? -1) ? t : best), null);

  const selectRow = (row) => {
    const isSame = selection.kind === kindForTab && selection.key === row.key;
    setSelection(isSame ? { kind: 'all', key: null, name: 'All spending' } : { kind: kindForTab, key: row.key, name: row.name });
  };

  return (
    <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-4 sm:p-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#818cf8]" /> Where Your Money Goes
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            {tab === 'apps' && insights.apps.length > 0
              ? `${insights.appShare.toFixed(0)}% of spending (${formatCurrency(insights.appSpent)}) happened on apps. Tap a row to chart its growth.`
              : 'Tap any row to see how that spend has grown cycle over cycle.'}
          </p>
        </div>
        <div className="flex items-center bg-[#050506] border border-white/[0.06] rounded-xl p-0.5 self-start">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  tab === t.id ? 'bg-[#5E6AD2] text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3 h-3" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
        {/* Ranked list */}
        <div className="lg:col-span-2 space-y-1.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelection({ kind: 'all', key: null, name: 'All spending' })}
            className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
              selection.kind === 'all' ? 'bg-[#5E6AD2]/10 border-[#5E6AD2]/40' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-[#818cf8]" />
              </span>
              <span className="text-left">
                <span className="block text-xs font-semibold text-white">All spending</span>
                <span className="block text-[10px] font-mono text-slate-400">{insights.txCount} transactions</span>
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold text-white">{formatCurrency(insights.totalSpent)}</span>
              <ChangeChip change={insights.spentChange} hasCompare={hasCompare} prevAmount={insights.prevSpent} />
            </span>
          </button>

          {rows.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500 text-xs font-mono border border-dashed border-white/[0.06] rounded-xl">
              {tab === 'apps'
                ? 'No app spends in this period. Entries titled Blinkit, Zepto, Swiggy, Zomato, Amazon, Uber… are detected automatically.'
                : 'No spending recorded in this period.'}
            </div>
          ) : rows.map((row, idx) => {
            const isSelected = selection.kind === kindForTab && selection.key === row.key;
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => selectRow(row)}
                className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected ? 'bg-[#5E6AD2]/10 border-[#5E6AD2]/40' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <RowBadge tab={tab} row={row} />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-white truncate">
                        <span className="text-slate-500 font-mono mr-1">{idx + 1}.</span>{row.name}
                      </span>
                      <span className="block text-[10px] font-mono text-slate-400 truncate">
                        {row.count} {tab === 'apps' ? (row.count === 1 ? 'order' : 'orders') : 'txns'} · avg {formatCurrency(row.avgTicket)}
                      </span>
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-semibold text-white">{formatCurrency(row.amount)}</span>
                    <span className="flex items-center justify-end gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500">{row.share.toFixed(1)}%</span>
                      <ChangeChip change={row.change} hasCompare={hasCompare} prevAmount={row.prevAmount} />
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-[#5E6AD2]" style={{ width: `${Math.max(row.share, 1.5)}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Growth trend for the selection */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div className="min-w-0">
              <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[9px] font-mono tracking-widest rounded-md uppercase inline-flex items-center gap-1">
                <LineChartIcon className="w-2.5 h-2.5" /> Spend Trend
              </span>
              <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight mt-1.5 truncate">{selection.name}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {formatCurrency(trendTotal)} across the last {trend.length} cycles
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <div className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <span className="block text-[9px] font-mono uppercase text-slate-400">Avg / cycle</span>
                <span className="font-semibold text-white">{formatCurrency(avgPerCycle)}</span>
              </div>
              {cycleChange !== null && (
                <div className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <span className="block text-[9px] font-mono uppercase text-slate-400">{lastDone.name} vs {beforeLast.name}</span>
                  <span className={`font-semibold flex items-center gap-0.5 ${cycleChange >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {cycleChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(cycleChange).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {trendTotal > 0 ? (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.accent} stopOpacity={0.4} />
                      <stop offset="60%" stopColor={theme.accent} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                    </linearGradient>
                    <filter id="spendTrendGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={theme.accent} floodOpacity="0.45" />
                    </filter>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} dy={8} />
                  <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={52} />
                  <Tooltip content={<TrendTooltip formatCurrency={formatCurrency} />} cursor={{ stroke: theme.axis, strokeWidth: 1 }} />
                  {avgPerCycle > 0 && (
                    <ReferenceLine
                      y={avgPerCycle}
                      stroke={theme.axis}
                      strokeDasharray="4 4"
                      label={{ value: 'avg', position: 'insideTopLeft', fill: theme.axis, fontSize: 10 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={theme.accent}
                    strokeWidth={2.5}
                    fill="url(#spendTrendGradient)"
                    filter="url(#spendTrendGlow)"
                    dot={{ r: 3, fill: theme.accent, stroke: theme.surface, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: theme.accent, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono border border-dashed border-white/[0.06] rounded-xl">
              <LineChartIcon className="w-6 h-6 opacity-40" />
              No spending history for this selection yet.
            </div>
          )}

          {peak && peak.amount > 0 && (
            <p className="text-[11px] text-slate-400 mt-3">
              Highest cycle: <strong className="text-white font-semibold">{peak.name}</strong> at {formatCurrency(peak.amount)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
