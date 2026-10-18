'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Wallet,
  PiggyBank,
  Percent,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  Repeat,
  CircleCheck,
  CircleX,
  Clock,
  HandCoins,
  Receipt,
  Target,
} from 'lucide-react';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { PERIODS, CATEGORIES, computeSpendInsights, summarizeSips, classifySpend } from '@/lib/spendAnalytics';
import SpendExplorer from './SpendExplorer';
import { CycleSpendRace, InvestmentGrowth } from './GrowthCharts';
import { useChartTheme, makeCompactFormatter } from './chartTheme';

// `goodWhenUp` flips the color logic: more savings is good, more spending is not
function DeltaChip({ change, goodWhenUp, label }) {
  if (change === null || change === undefined || !Number.isFinite(change)) return null;
  const up = change >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${
      good ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
    }`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(change).toFixed(0)}%
      {label && <span className="font-normal opacity-80 ml-0.5 hidden sm:inline">{label}</span>}
    </span>
  );
}

function KpiCard({ label, dot, icon: Icon, iconClass, spotlight, value, valueClass = 'text-white', children }) {
  return (
    <SpotlightCard className="p-3 sm:p-5" spotlightColor={spotlight}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1 text-left">
          <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 truncate">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} /> {label}
          </span>
          <h3 className={`text-base sm:text-2xl font-semibold tracking-tight mt-1.5 truncate ${valueClass}`}>{value}</h3>
          <div className="mt-1.5 space-y-1">{children}</div>
        </div>
        <span className="hidden sm:flex w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${iconClass}`} />
        </span>
      </div>
    </SpotlightCard>
  );
}

function DayTooltip({ active, payload, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#0a0a0c]/98 border border-white/[0.08] p-2.5 rounded-xl shadow-2xl text-left font-mono">
      <p className="text-[10px] uppercase text-slate-400">{d.name}</p>
      <p className="text-xs font-semibold text-white">{formatCurrency(d.avg)} / day avg</p>
      <p className="text-[10px] text-slate-400">{formatCurrency(d.amount)} total · {d.count} txns</p>
    </div>
  );
}

function SpendingPatterns({ insights, formatCurrency, formatCompact }) {
  const theme = useChartTheme();
  const maxIdx = insights.byWeekday.reduce((best, d, i, arr) => (d.avg > arr[best].avg ? i : best), 0);
  const hasData = insights.totalSpent > 0;
  const weekendDiff = insights.weekdayAvg > 0 ? ((insights.weekendAvg - insights.weekdayAvg) / insights.weekdayAvg) * 100 : null;

  return (
    <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-4 sm:p-6 text-left flex flex-col">
      <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-[#818cf8]" /> Spending Patterns
      </h3>
      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
        {hasData
          ? <>You spend the most on <strong className="text-white">{insights.byWeekday[maxIdx].name}s</strong> ({formatCurrency(insights.byWeekday[maxIdx].avg)} avg).</>
          : 'Average spend per weekday.'}
      </p>

      <div className="h-40 w-full mt-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={insights.byWeekday} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="name" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={44} />
              <Tooltip content={<DayTooltip formatCurrency={formatCurrency} />} cursor={{ fill: theme.grid }} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={26}>
                {insights.byWeekday.map((d, i) => (
                  <Cell key={d.name} fill={i === maxIdx ? theme.accent : theme.muted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-white/[0.06] rounded-xl">
            No spending in this period.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
          <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">Weekday / day</span>
          <span className="block text-sm font-semibold text-white">{formatCurrency(insights.weekdayAvg)}</span>
        </div>
        <div className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
          <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">Weekend / day</span>
          <span className="block text-sm font-semibold text-white">{formatCurrency(insights.weekendAvg)}</span>
        </div>
      </div>
      {weekendDiff !== null && Math.abs(weekendDiff) >= 5 && (
        <p className="text-[11px] text-slate-400 mt-2">
          Weekends cost you <strong className="text-white">{Math.abs(weekendDiff).toFixed(0)}% {weekendDiff > 0 ? 'more' : 'less'}</strong> per day than weekdays.
        </p>
      )}

      {insights.unpaidLent > 0 && (
        <Link
          href="/transactions"
          className="mt-4 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center justify-between gap-2 hover:bg-blue-500/10 transition-all"
        >
          <span className="flex items-center gap-2 text-xs text-slate-300">
            <HandCoins className="w-4 h-4 text-blue-400" /> Money lent, still unpaid
          </span>
          <span className="text-sm font-semibold text-blue-400">{formatCurrency(insights.unpaidLent)}</span>
        </Link>
      )}
    </div>
  );
}

const PERIOD_STATUS = {
  PAID: { icon: CircleCheck, className: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', label: 'Paid' },
  MISSED: { icon: CircleX, className: 'bg-rose-500/10 border-rose-500/25 text-rose-400', label: 'Missed' },
  PENDING: { icon: Clock, className: 'bg-white/[0.03] border-white/[0.08] text-slate-400', label: 'Upcoming' },
};

function SipCommitments({ sipSummary, sipInWindow, periodLabel, formatCurrency }) {
  return (
    <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-4 sm:p-6 text-left flex flex-col">
      <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
        <Repeat className="w-4 h-4 text-[#818cf8]" /> SIP Commitments
      </h3>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl min-w-0">
          <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 truncate">Monthly</span>
          <span className="block text-xs sm:text-sm font-semibold text-white truncate">{formatCurrency(sipSummary.monthlyCommitment)}</span>
        </div>
        <div className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl min-w-0">
          <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 truncate">{periodLabel}</span>
          <span className="block text-xs sm:text-sm font-semibold text-white truncate">{formatCurrency(sipInWindow)}</span>
        </div>
        <div className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl min-w-0">
          <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 truncate">Lifetime</span>
          <span className="block text-xs sm:text-sm font-semibold text-white truncate">{formatCurrency(sipSummary.lifetime)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 flex-grow max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
        {sipSummary.rows.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500 border border-dashed border-white/[0.06] rounded-xl">
            No SIPs set up yet.
          </div>
        ) : sipSummary.rows.map(row => (
          <div key={row.id} className={`p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl ${row.isActive ? '' : 'opacity-50'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{row.title}</p>
                <p className="text-[10px] font-mono text-slate-400">
                  {formatCurrency(row.amount)} / {row.frequency === 'WEEKLY' ? 'week' : 'month'}{row.isActive ? '' : ' · paused'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-white">{formatCurrency(row.lifetime)}</p>
                <p className="text-[10px] font-mono text-slate-400">{row.installments} paid</p>
              </div>
            </div>
            {row.periods.length > 0 && (
              <div className="flex gap-1 mt-2.5">
                {row.periods.map(p => {
                  const status = PERIOD_STATUS[p.status] || PERIOD_STATUS.PENDING;
                  const Icon = status.icon;
                  return (
                    <span
                      key={p.targetDate}
                      title={`${p.label}: ${status.label}`}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-md border ${status.className}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="text-[8px] font-mono">{p.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <Link href="/sips" className="mt-4 btn-linear-secondary text-xs text-center py-2 flex items-center justify-center gap-1.5">
        Manage SIPs
      </Link>
    </div>
  );
}

function BiggestExpenses({ items, formatCurrency }) {
  return (
    <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-4 sm:p-6 text-left flex flex-col">
      <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
        <Receipt className="w-4 h-4 text-rose-400" /> Biggest Expenses
      </h3>
      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Largest single spends in this period</p>
      <div className="mt-4 space-y-2 flex-grow">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500 border border-dashed border-white/[0.06] rounded-xl">
            Nothing spent in this period.
          </div>
        ) : items.map((e, idx) => (
          <div key={e.id} className="flex items-center justify-between gap-3 p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[10px] font-mono text-slate-400 shrink-0">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{e.title}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {CATEGORIES[classifySpend(e).category].name}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-white shrink-0">{formatCurrency(e.amt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Period-scoped spend & investment intelligence. Shared by the desktop and mobile Reports views.
 * `cashflowSlot` lets the desktop page place its Income vs Outflow chart beside Biggest Expenses.
 */
export default function ReportInsights({ entries, salaries, bonuses, sips, cycleDate, user, stockSummary, formatCurrency, cashflowSlot }) {
  const [periodId, setPeriodId] = useState('cycle');
  const formatCompact = useMemo(() => makeCompactFormatter(user?.currency || 'USD'), [user?.currency]);

  const insights = useMemo(
    () => computeSpendInsights({ entries, salaries, bonuses, sips, cycleDate, periodId }),
    [entries, salaries, bonuses, sips, cycleDate, periodId]
  );
  const sipSummary = useMemo(
    () => summarizeSips(sips, entries, insights.window.start, insights.window.end),
    [sips, entries, insights.window.start, insights.window.end]
  );

  const periodLabel = PERIODS.find(p => p.id === periodId).label;
  const compareLabel = insights.window.compareLabel;
  const { sip, stocks, other } = insights.savingsBuckets;
  const rate = insights.savingsRate;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* One filter row scopes every panel below */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-left">
          <h2 className="text-sm sm:text-base font-semibold text-white">Spend Intelligence</h2>
          <p className="text-[11px] text-slate-400 font-mono">
            {insights.window.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} →{' '}
            {insights.window.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {compareLabel ? ` · deltas ${compareLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center bg-[#0a0a0c] border border-white/[0.08] rounded-xl p-0.5 overflow-x-auto scrollbar-thin self-start max-w-full">
          {PERIODS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodId(p.id)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                periodId === p.id ? 'bg-[#5E6AD2] text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KpiCard
          label="Total Spent"
          dot="bg-rose-400"
          icon={Wallet}
          iconClass="text-rose-400"
          spotlight="rgba(244, 63, 94, 0.1)"
          value={formatCurrency(insights.totalSpent)}
        >
          <DeltaChip change={insights.spentChange} goodWhenUp={false} label={compareLabel} />
          <p className="text-[10px] font-mono text-slate-400 truncate">{insights.txCount} transactions</p>
        </KpiCard>

        <KpiCard
          label="Saved & Invested"
          dot="bg-emerald-400"
          icon={PiggyBank}
          iconClass="text-emerald-400"
          spotlight="rgba(16, 185, 129, 0.1)"
          value={formatCurrency(insights.totalInvested)}
          valueClass="text-emerald-400"
        >
          <DeltaChip change={insights.investedChange} goodWhenUp label={compareLabel} />
          <p className="text-[10px] font-mono text-slate-400 truncate">
            SIP {formatCompact(sip)} · Stocks {formatCompact(stocks)} · Other {formatCompact(other)}
          </p>
        </KpiCard>

        <KpiCard
          label="Savings Rate"
          dot="bg-[#818cf8]"
          icon={Percent}
          iconClass="text-[#818cf8]"
          spotlight="rgba(94, 106, 210, 0.12)"
          value={rate === null ? '—' : `${rate.toFixed(1)}%`}
        >
          {rate === null ? (
            <p className="text-[10px] font-mono text-slate-400">Log salary to compute</p>
          ) : (
            <>
              <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden" title="Target: 20% of income">
                <div className="h-full rounded-full bg-[#5E6AD2]" style={{ width: `${Math.min(100, (rate / 40) * 100)}%` }} />
                <span className="absolute top-0 bottom-0 w-px bg-slate-400" style={{ left: '50%' }} />
              </div>
              <p className={`text-[10px] font-mono truncate flex items-center gap-1 ${rate >= 20 ? 'text-emerald-400' : 'text-slate-400'}`}>
                <Target className="w-3 h-3" /> {rate >= 20 ? 'On target (20%+)' : `Target 20% of ${formatCompact(insights.income)}`}
              </p>
            </>
          )}
        </KpiCard>

        <KpiCard
          label="Daily Average"
          dot="bg-amber-400"
          icon={Gauge}
          iconClass="text-amber-400"
          spotlight="rgba(245, 158, 11, 0.1)"
          value={formatCurrency(insights.dailyAvg)}
        >
          <DeltaChip change={insights.dailyAvgChange} goodWhenUp={false} label={compareLabel} />
          <p className="text-[10px] font-mono text-slate-400 truncate">
            {insights.projected !== null ? `On pace for ${formatCompact(insights.projected)} this cycle` : 'per day in period'}
          </p>
        </KpiCard>
      </div>

      {/* App / category / merchant breakdown with per-item growth trend */}
      <SpendExplorer insights={insights} cycleDate={cycleDate} formatCurrency={formatCurrency} formatCompact={formatCompact} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2">
          <CycleSpendRace entries={entries} cycleDate={cycleDate} formatCurrency={formatCurrency} formatCompact={formatCompact} />
        </div>
        <SpendingPatterns insights={insights} formatCurrency={formatCurrency} formatCompact={formatCompact} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2">
          <InvestmentGrowth
            entries={entries}
            sips={sips}
            start={insights.window.start}
            end={insights.window.end}
            periodLabel={periodLabel}
            stockSummary={stockSummary}
            formatCurrency={formatCurrency}
            formatCompact={formatCompact}
          />
        </div>
        <SipCommitments sipSummary={sipSummary} sipInWindow={sip} periodLabel={periodLabel} formatCurrency={formatCurrency} />
      </div>

      <div className={`grid grid-cols-1 gap-5 sm:gap-6 ${cashflowSlot ? 'lg:grid-cols-3' : ''}`}>
        <BiggestExpenses items={insights.topExpenses} formatCurrency={formatCurrency} />
        {cashflowSlot && <div className="lg:col-span-2">{cashflowSlot}</div>}
      </div>
    </div>
  );
}
