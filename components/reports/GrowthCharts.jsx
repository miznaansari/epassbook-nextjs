'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Flame, Sparkles, LineChart as LineChartIcon, ArrowUpRight, ArrowDownRight, PiggyBank } from 'lucide-react';
import { computeCycleRace, computeInvestmentGrowth } from '@/lib/spendAnalytics';
import { useChartTheme } from './chartTheme';

function StatPill({ label, children }) {
  return (
    <div className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl min-w-0">
      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 truncate">{label}</span>
      <span className="block text-xs sm:text-sm font-semibold text-white truncate">{children}</span>
    </div>
  );
}

function RaceTooltip({ active, payload, race, theme, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-[#0a0a0c]/98 border border-white/[0.08] p-3 rounded-xl shadow-2xl text-left min-w-[190px] space-y-1.5">
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Day {pt.day} · {pt.name}</p>
      {pt.current !== null && (
        <p className="text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} /> {race.currentLabel}
          </span>
          <span className="font-semibold text-white font-mono">{formatCurrency(pt.current)}</span>
        </p>
      )}
      <p className="text-xs flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-0.5" style={{ backgroundColor: theme.axis }} /> {race.previousLabel}
        </span>
        <span className="font-semibold text-white font-mono">{formatCurrency(pt.previous)}</span>
      </p>
    </div>
  );
}

/**
 * Cumulative spend by day-of-cycle, this cycle against the last one.
 */
export function CycleSpendRace({ entries, cycleDate, formatCurrency, formatCompact }) {
  const theme = useChartTheme();
  const race = useMemo(() => computeCycleRace(entries, cycleDate), [entries, cycleDate]);
  const projected = race.todayIdx > 0 ? (race.spentSoFar / race.todayIdx) * race.totalDays : 0;
  const ahead = race.change !== null && race.change > 0;

  return (
    <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-4 sm:p-6 text-left flex flex-col">
      <div className="mb-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[9px] font-mono tracking-widest rounded-md uppercase flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> Burn Rate
          </span>
          <span className="text-[10px] text-slate-400 font-mono">DAY {Math.min(race.todayIdx, race.totalDays)} OF {race.totalDays}</span>
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-white">This Cycle vs Last Cycle</h3>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
          {race.prevAtSameDay > 0 && Math.abs(race.change) >= 1 ? (
            <>
              You have spent{' '}
              <strong className={ahead ? 'text-rose-400' : 'text-emerald-400'}>
                {ahead ? 'more' : 'less'} ({Math.abs(race.change).toFixed(0)}%)
              </strong>{' '}
              than at this point last cycle.
            </>
          ) : race.prevAtSameDay > 0
            ? 'You are spending at the same pace as last cycle.'
            : 'Cumulative spend by day of the salary cycle.'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <StatPill label="Spent so far">{formatCurrency(race.spentSoFar)}</StatPill>
          <StatPill label="Same day last cycle">{formatCurrency(race.prevAtSameDay)}</StatPill>
          <StatPill label="Last cycle total">{formatCurrency(race.prevTotal)}</StatPill>
          <StatPill label="Projected">{formatCurrency(projected)}</StatPill>
        </div>
      </div>

      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={race.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="raceCurrentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} dy={8} minTickGap={24} />
            <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={52} />
            <Tooltip content={<RaceTooltip race={race} theme={theme} formatCurrency={formatCurrency} />} cursor={{ stroke: theme.axis, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="previous"
              stroke={theme.axis}
              strokeWidth={2}
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: theme.axis, stroke: theme.surface, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke={theme.accent}
              strokeWidth={2.5}
              fill="url(#raceCurrentGradient)"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 5, fill: theme.accent, stroke: theme.surface, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: theme.accent }} /> {race.currentLabel} (this cycle)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5" style={{ backgroundColor: theme.axis }} /> {race.previousLabel} (last cycle)
        </span>
      </div>
    </div>
  );
}

const INVEST_SERIES = [
  { key: 'sip', label: 'SIP' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'other', label: 'Other savings' },
];

function GrowthTooltip({ active, payload, theme, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-[#0a0a0c]/98 border border-white/[0.08] p-3.5 rounded-2xl shadow-2xl text-left min-w-[200px] space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/[0.06] pb-1.5">{pt.fullDate}</p>
      <div>
        <span className="text-[10px] text-slate-400 block">Total invested</span>
        <span className="text-base font-bold text-white">{formatCurrency(pt.total)}</span>
      </div>
      {INVEST_SERIES.map(s => (
        <p key={s.key} className="text-[11px] flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: theme.series[s.key] }} /> {s.label}
          </span>
          <span className="font-mono font-semibold text-white">{formatCurrency(pt[s.key])}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Cumulative net contributions (deposits − withdrawals) stacked by SIP / Stocks / Other.
 */
export function InvestmentGrowth({ entries, sips, start, end, periodLabel, stockSummary, formatCurrency, formatCompact }) {
  const theme = useChartTheme();
  const points = useMemo(() => computeInvestmentGrowth(entries, sips, start, end), [entries, sips, start, end]);

  const first = points[0];
  const last = points[points.length - 1];
  const growth = first && last ? last.total - first.total : 0;
  const growthPct = first?.total > 0 ? (growth / first.total) * 100 : null;
  const peak = points.reduce((m, p) => Math.max(m, p.total), 0);

  return (
    <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-4 sm:p-6 text-left flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[9px] font-mono tracking-widest rounded-md uppercase flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Trajectory
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Growth Curve</span>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-[#818cf8]" /> Investment Growth Timeline
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Net SIP, stock and savings contributions after withdrawals · {periodLabel}
          </p>
        </div>
        {last && (
          <div className="flex flex-wrap gap-2">
            <StatPill label="Invested now">{formatCurrency(last.total)}</StatPill>
            <StatPill label="Added this period">
              <span className={`inline-flex items-center gap-0.5 ${growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatCurrency(Math.abs(growth))}{growthPct !== null ? ` (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(0)}%)` : ''}
              </span>
            </StatPill>
            <StatPill label="Peak">{formatCurrency(peak)}</StatPill>
          </div>
        )}
      </div>

      {points.length > 1 ? (
        <div className="h-60 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {INVEST_SERIES.map(s => (
                  <linearGradient key={s.key} id={`invest-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.series[s.key]} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={theme.series[s.key]} stopOpacity={0.15} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="name" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} dy={8} minTickGap={24} />
              <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={52} />
              <Tooltip content={<GrowthTooltip theme={theme} formatCurrency={formatCurrency} />} cursor={{ stroke: theme.axis, strokeWidth: 1 }} />
              {INVEST_SERIES.map(s => (
                <Area
                  key={s.key}
                  type="stepAfter"
                  dataKey={s.key}
                  stackId="invest"
                  stroke={theme.series[s.key]}
                  strokeWidth={2}
                  fill={`url(#invest-${s.key})`}
                  activeDot={{ r: 4, fill: theme.series[s.key], stroke: theme.surface, strokeWidth: 2 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-60 flex flex-col items-center justify-center gap-3 text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] flex items-center justify-center">
            <PiggyBank className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            No savings or investments logged yet. Confirm a SIP, add a stock or log a savings deposit to start your growth curve.
          </p>
        </div>
      )}

      {/* Legend doubles as the latest value readout */}
      {last && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {INVEST_SERIES.map(s => (
            <div key={s.key} className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 truncate">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: theme.series[s.key] }} /> {s.label}
              </span>
              <span className="block text-xs sm:text-sm font-semibold text-white mt-0.5 truncate">{formatCurrency(last[s.key])}</span>
              {s.key === 'stocks' && stockSummary?.totalInvested > 0 && (
                <span className={`block text-[10px] font-mono truncate ${stockSummary.totalReturns >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Worth {formatCurrency(stockSummary.totalCurrentValue)} ({stockSummary.totalReturns >= 0 ? '+' : ''}{stockSummary.totalReturnsPercentage.toFixed(1)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
