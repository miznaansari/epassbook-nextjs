'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Coins,
  AlertCircle,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  CalendarDays,
  Briefcase,
  Loader2,
  ChevronDown,
  TrendingUp as ProfitIcon
} from 'lucide-react';

export default function ReportsMobile({
  user,
  loadingData,
  cycleDate,
  stockSummary,
  stockHoldings,
  selectedDate,
  setSelectedDate,
  currentMonth,
  setCurrentMonth,
  salaries,
  bonuses,
  entries,
  formatCurrency,
  monthlyChartData,
  currentPeriodStats,
  pieChartData,
  COLORS,
  PIE_COLORS,
  CustomTooltip,
  getCellMetadata,
  getMonthDays,
  getCalendarGridDays,
  getMonthLabels,
  toLocalDateString,
  tz,
  isSelectingDate,
  handleDateSelect
}) {
  // Mobile Chart Tab Selection state
  const [activeTab, setActiveTab] = useState('cashflow');

  const tabs = [
    { id: 'cashflow', name: 'Cash Flow', icon: Coins },
    { id: 'spending', name: 'Spending', icon: TrendingDown },
    { id: 'savings', name: 'Savings', icon: PiggyBank },
    { id: 'stocks', name: 'Stocks', icon: Briefcase },
    { id: 'breakdown', name: 'Categories', icon: AlertCircle }
  ];

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-slate-100 selection:bg-[#5E6AD2]/30 select-none pb-20">
      <main className="flex-grow w-full px-4 py-4 relative z-10 space-y-4">
        {/* Title Header */}
        <div className="text-left">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[9px] font-mono uppercase tracking-wider rounded-md">
              Mobile Analytics
            </span>
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Financial Intelligence
          </h1>
        </div>

        {/* Quick KPI Overview Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Net Cashflow */}
          <div className="bg-[#0a0a0c] border border-white/[0.06] p-3 rounded-xl flex flex-col justify-between min-h-[72px] text-left font-mono">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block truncate">
              Cashflow
            </span>
            <span className="text-xs font-bold text-white mt-1 block truncate">
              {formatCurrency(currentPeriodStats.totalInflow - currentPeriodStats.totalOutflow)}
            </span>
          </div>

          {/* Ledger Savings */}
          <div className="bg-[#0a0a0c] border border-white/[0.06] p-3 rounded-xl flex flex-col justify-between min-h-[72px] text-left font-mono">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block truncate">
              Savings
            </span>
            <span className="text-xs font-bold text-amber-400 mt-1 block truncate">
              {formatCurrency(currentPeriodStats.totalSavings)}
            </span>
          </div>

          {/* Stocks Value */}
          <div className="bg-[#0a0a0c] border border-white/[0.06] p-3 rounded-xl flex flex-col justify-between min-h-[72px] text-left font-mono">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block truncate">
              Stocks
            </span>
            <span className="text-xs font-bold text-[#06B6D4] mt-1 block truncate">
              {formatCurrency(stockSummary.totalCurrentValue)}
            </span>
          </div>
        </div>

        {/* Interactive Contribution and date picker */}
        <div className="bg-[#0a0a0c] border border-white/[0.06] p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#5E6AD2]" /> Activity Calendar
            </h3>
            <span className="text-[9px] font-mono text-slate-400">12m activity</span>
          </div>

          {/* Calendar horizontal scrolling wrapper */}
          <div className="overflow-x-auto pb-1.5 scrollbar-thin">
            <div className="min-w-[480px]">
              {/* Month labels header */}
              <div className="h-5 relative text-[9px] font-mono text-slate-400 select-none">
                {(() => {
                  const daysList = getCalendarGridDays();
                  const labels = getMonthLabels(daysList);
                  return labels.map((label, lIdx) => (
                    <span
                      key={lIdx}
                      className="absolute"
                      style={{ left: `${label.colIndex * 14}px` }}
                    >
                      {label.text}
                    </span>
                  ));
                })()}
              </div>

              <div className="flex gap-1">
                {/* Day of Week labels */}
                <div className="flex flex-col gap-1 text-[8px] font-mono text-slate-500 select-none pr-1 justify-around h-[76px] pt-0.5">
                  <span>M</span>
                  <span>W</span>
                  <span>F</span>
                </div>

                {/* Grid of weeks */}
                <div className="flex gap-1 flex-grow">
                  {(() => {
                    const daysList = getCalendarGridDays();
                    const weeks = [];
                    let currentWeek = [];
                    daysList.forEach((day, index) => {
                      currentWeek.push(day);
                      if (currentWeek.length === 7 || index === daysList.length - 1) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                      }
                    });

                    return weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                        {week.map((day) => {
                          const metadata = getCellMetadata(day);
                          const isSelected = toLocalDateString(day, tz) === toLocalDateString(selectedDate, tz);
                          return (
                            <div
                              key={day.getTime()}
                              title={metadata.tooltip}
                              onClick={() => handleDateSelect(day)}
                              className={`w-[9px] h-[9px] rounded-[2px] cursor-pointer transition-all ${metadata.colorClass} ${
                                isSelected ? 'ring-1 ring-[#5E6AD2] scale-110 z-10' : ''
                              }`}
                            />
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Month calendar selection */}
          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1 hover:bg-white/[0.04] rounded-lg border border-white/[0.06] text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-semibold text-white uppercase">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1 hover:bg-white/[0.04] rounded-lg border border-white/[0.06] text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                <span key={d} className="text-[8px] font-mono text-slate-400 uppercase">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 justify-items-center">
              {getMonthDays(currentMonth).map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-7 w-7"></div>;

                const metadata = getCellMetadata(day);
                const isSelected = toLocalDateString(day, tz) === toLocalDateString(selectedDate, tz);

                const indicators = [];
                if (metadata.salaries.length > 0) indicators.push('bg-emerald-500');
                if (metadata.entries.some(e => e.type === 'LOAN')) indicators.push('bg-[#F97316]');
                if (metadata.entries.some(e => e.type === 'ADVANCE')) indicators.push('bg-[#06B6D4]');
                if (metadata.entries.some(e => e.type === 'LENDING')) indicators.push('bg-[#3B82F6]');
                if (metadata.entries.some(e => e.type === 'SAVINGS')) indicators.push('bg-amber-500');
                if (metadata.entries.some(e => e.type === 'SPENDING')) indicators.push('bg-[#5E6AD2]');

                return (
                  <button
                    key={day.getTime()}
                    onClick={() => handleDateSelect(day)}
                    className={`h-7 w-7 flex flex-col items-center justify-center rounded-lg text-[10px] font-mono relative transition-all ${
                      isSelected
                        ? 'bg-[#5E6AD2] text-white font-bold shadow-sm'
                        : 'text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={isSelected ? '' : 'text-slate-200'}>{day.getDate()}</span>
                    {indicators.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 justify-center absolute bottom-0.5">
                        {indicators.slice(0, 3).map((bg, dotIdx) => (
                          <span key={dotIdx} className={`w-[3px] h-[3px] rounded-full ${bg}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Date Transaction list */}
        <div className="bg-[#0a0a0c] border border-white/[0.06] p-4 rounded-xl text-left space-y-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#5E6AD2]" />
            <h4 className="text-xs font-semibold text-white">
              Logs: {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </h4>
          </div>

          <AnimatePresence mode="wait">
            {isSelectingDate ? (
              <motion.div
                key="date-loader"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="py-6 bg-[#050506] border border-white/[0.04] rounded-lg flex flex-col items-center justify-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin text-[#5E6AD2]" />
                <span className="text-[10px] font-mono text-slate-400">Filtering entries...</span>
              </motion.div>
            ) : (() => {
              const metadata = getCellMetadata(selectedDate);
              const hasTx = metadata.entries.length > 0 || metadata.salaries.length > 0;

              if (!hasTx) {
                return (
                  <motion.div
                    key="date-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-6 bg-[#050506] border border-white/[0.04] rounded-lg text-center text-slate-500 text-xs font-mono flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 opacity-40 text-slate-500" />
                    No transactions on this date.
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key="date-list"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  {metadata.salaries.map((salary) => (
                    <div
                      key={salary.id}
                      className="bg-[#050506] border border-white/[0.04] rounded-lg p-2.5 flex justify-between items-center font-mono"
                    >
                      <div className="text-left min-w-0 pr-3">
                        <span className="text-[8px] text-slate-500 uppercase block">Inflow</span>
                        <h5 className="text-xs font-medium text-white truncate font-sans">Month Salary</h5>
                        <span className="inline-block mt-0.5 text-[8px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          SALARY
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 shrink-0">
                        + {formatCurrency(salary.amount)}
                      </span>
                    </div>
                  ))}

                  {metadata.entries.map((entry) => {
                    const amt = parseFloat(entry.amount);
                    const isSpending = entry.type === 'SPENDING';
                    const isLending = entry.type === 'LENDING';
                    const isLoan = entry.type === 'LOAN';
                    const isAdvance = entry.type === 'ADVANCE';
                    const isSavings = entry.type === 'SAVINGS';

                    let typeBadgeClass = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
                    let amountClass = 'text-white';
                    let prefix = '';

                    if (isSpending) {
                      typeBadgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                      amountClass = 'text-rose-400';
                      prefix = '-';
                    } else if (isLoan) {
                      typeBadgeClass = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
                      amountClass = 'text-orange-400';
                      prefix = '+';
                    } else if (isLending) {
                      typeBadgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                      amountClass = 'text-blue-400';
                      prefix = '-';
                    } else if (isAdvance) {
                      typeBadgeClass = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
                      amountClass = 'text-cyan-400';
                      prefix = '+';
                    } else if (isSavings) {
                      typeBadgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                      amountClass = 'text-amber-400';
                      prefix = '-';
                    }

                    return (
                      <div
                        key={entry.id}
                        className="bg-[#050506] border border-white/[0.04] rounded-lg p-2.5 flex justify-between items-center font-mono"
                      >
                        <div className="text-left min-w-0 pr-3">
                          <span className="text-[8px] text-slate-500 uppercase block">
                            {isSpending || isLending || isSavings ? 'Outflow' : 'Inflow'}
                          </span>
                          <h5 className="text-xs font-medium text-white truncate font-sans">{entry.title}</h5>
                          <span className={`inline-block mt-0.5 text-[8px] px-1.5 py-0.2 rounded font-mono ${typeBadgeClass}`}>
                            {entry.type}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${amountClass}`}>
                          {prefix} {formatCurrency(amt)}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* TABBED CHARTS PANEL */}
        <div className="bg-[#0a0a0c] border border-white/[0.06] rounded-xl p-4 text-left space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-white">Visual Analytics</h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Select metric category to view chart</p>
          </div>

          {/* Swipeable Tabs selectors */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white shadow-sm'
                      : 'bg-[#050506] border-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Active Tab Chart Container */}
          <div className="h-56 w-full relative">
            <AnimatePresence mode="wait">
              {activeTab === 'cashflow' && (
                <motion.div
                  key="cashflow-chart"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Inflow vs Outflow
                  </span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="mColorInflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="mColorOutflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={8} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Inflow" stroke="#10B981" fillOpacity={1} fill="url(#mColorInflow)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="Outflow" stroke="#F43F5E" fillOpacity={1} fill="url(#mColorOutflow)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {activeTab === 'spending' && (
                <motion.div
                  key="spending-chart"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Historical Spending
                  </span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={8} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Spending" fill="#F43F5E" radius={[3, 3, 0, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {activeTab === 'savings' && (
                <motion.div
                  key="savings-chart"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Remaining Balance & Savings
                  </span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={8} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Remaining Balance" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={16} />
                        <Bar dataKey="Invested Savings" stackId="a" fill="#5E6AD2" radius={[3, 3, 0, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {activeTab === 'stocks' && (
                <motion.div
                  key="stocks-chart"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Invested vs Market Value
                  </span>

                  {stockHoldings.length === 0 ? (
                    <div className="h-40 w-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono gap-2">
                      <AlertCircle className="w-5 h-5 opacity-40" />
                      <span>No stock holdings logged.</span>
                      <Link
                        href="/stocks"
                        className="btn-linear-secondary text-xs px-2.5 py-1"
                      >
                        Add Stocks
                      </Link>
                    </div>
                  ) : (
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stockHoldings.map(h => ({
                            name: h.symbol.split('.')[0],
                            Invested: h.investedValue,
                            Current: h.currentValue
                          }))}
                          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={8} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0a0a0c',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                            }}
                            formatter={(value) => [formatCurrency(value), '']}
                          />
                          <Bar dataKey="Invested" fill="#5E6AD2" radius={[3, 3, 0, 0]} maxBarSize={16} />
                          <Bar dataKey="Current" fill="#06B6D4" radius={[3, 3, 0, 0]} maxBarSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'breakdown' && (
                <motion.div
                  key="breakdown-chart"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Cycle Spending Distribution
                  </span>

                  {pieChartData.length === 0 ? (
                    <div className="h-40 w-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                      <AlertCircle className="w-5 h-5 opacity-40 mb-1.5" />
                      <span>No spending recorded in this cycle.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 h-40">
                      <div className="w-28 h-28 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={28}
                              outerRadius={48}
                              paddingAngle={2}
                              stroke="rgba(10,10,12,0.8)"
                              strokeWidth={2}
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex-grow space-y-1 max-h-36 overflow-y-auto pr-1 font-mono text-xs">
                        {pieChartData.map((slice, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[slice.name] || '#a78bfa' }}></span>
                              <span className="truncate text-slate-300 text-[10px]">{slice.name}</span>
                            </div>
                            <span className="font-semibold text-white shrink-0 ml-1 text-[10px]">{formatCurrency(slice.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Link */}
        <Link
          href="/transactions"
          className="btn-linear-secondary block w-full py-2.5 text-xs text-center uppercase tracking-wider font-mono"
        >
          View Full Ledger Passbook
        </Link>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-[#050506]/60 backdrop-blur-xl py-4">
        <div className="max-w-7xl mx-auto px-4 text-slate-500 text-[10px] text-center font-mono">
          © {new Date().getFullYear()} ePassbook Mobile Reports
        </div>
      </footer>
    </div>
  );
}
