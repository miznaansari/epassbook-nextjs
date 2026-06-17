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
    <div className="relative min-h-screen flex flex-col justify-between bg-[#030712] text-slate-100 selection:bg-violet-500/30 select-none pb-20">
      {/* Ambient backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[30%] bg-gradient-to-br from-violet-600/10 to-cyan-500/0 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[80%] h-[30%] bg-gradient-to-tr from-emerald-500/5 to-amber-500/0 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <main className="flex-grow w-full px-4 py-4 relative z-10 space-y-5">
        {/* Title Header */}
        <div className="text-left">
          <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-widest rounded-md">
            Mobile Ledger Reports
          </span>
          <h1 className="text-xl font-black text-white tracking-tight mt-1 flex items-center gap-1.5">
            Reports & Analytics
          </h1>
        </div>

        {/* Quick KPI Overview Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Net Cashflow */}
          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between min-h-[72px] text-left">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Net Cashflow
            </span>
            <span className="text-[11px] font-black text-white mt-1 block truncate">
              {formatCurrency(currentPeriodStats.totalInflow - currentPeriodStats.totalOutflow)}
            </span>
          </div>

          {/* Ledger Savings */}
          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between min-h-[72px] text-left">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Invested Savings
            </span>
            <span className="text-[11px] font-black text-amber-400 mt-1 block truncate">
              {formatCurrency(currentPeriodStats.totalSavings)}
            </span>
          </div>

          {/* Stocks Value */}
          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between min-h-[72px] text-left">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Stocks Value
            </span>
            <span className="text-[11px] font-black text-cyan-400 mt-1 block truncate">
              {formatCurrency(stockSummary.totalCurrentValue)}
            </span>
          </div>
        </div>

        {/* Interactive GitHub contribution and date picker */}
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-violet-400" /> Transaction Calendar
            </h3>
            <span className="text-[9px] text-slate-500 font-bold">12m activity</span>
          </div>

          {/* GitHub calendar horizontal scrolling wrapper */}
          <div className="overflow-x-auto pb-1.5 scrollbar-thin">
            <div className="min-w-[480px]">
              {/* Month labels header */}
              <div className="h-5 relative text-[8px] font-bold text-slate-500 select-none">
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
                <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-500 select-none pr-1 justify-around h-[76px] pt-0.5">
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
                                isSelected ? 'ring-1 ring-violet-400 scale-110 z-10' : ''
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
          <div className="border-t border-white/5 pt-3">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1 hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-black tracking-wider text-white uppercase">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1 hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                <span key={d} className="text-[8px] font-extrabold text-slate-500 uppercase">
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
                if (metadata.entries.some(e => e.type === 'LOAN')) indicators.push('bg-orange-500');
                if (metadata.entries.some(e => e.type === 'ADVANCE')) indicators.push('bg-cyan-500');
                if (metadata.entries.some(e => e.type === 'LENDING')) indicators.push('bg-blue-500');
                if (metadata.entries.some(e => e.type === 'SAVINGS')) indicators.push('bg-amber-500');
                if (metadata.entries.some(e => e.type === 'SPENDING')) indicators.push('bg-violet-500');

                return (
                  <button
                    key={day.getTime()}
                    onClick={() => handleDateSelect(day)}
                    className={`h-7 w-7 flex flex-col items-center justify-center rounded-lg text-[10px] font-semibold relative transition-all ${
                      isSelected
                        ? 'bg-violet-600 text-white font-extrabold ring-1 ring-violet-400'
                        : 'text-slate-300 hover:bg-white/5'
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

        {/* Selected Date Transaction Drawer list (WITH ACTION REACTION LOADER) */}
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl text-left space-y-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-violet-400" />
            <h4 className="text-xs font-black tracking-tight text-white">
              Logs on {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </h4>
          </div>

          <AnimatePresence mode="wait">
            {isSelectingDate ? (
              <motion.div
                key="date-loader"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="py-8 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col items-center justify-center gap-2.5"
              >
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                <span className="text-[10px] text-slate-500 font-bold animate-pulse">Filtering ledger...</span>
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
                    className="py-8 bg-white/[0.01] border border-white/5 rounded-xl text-center text-slate-500 text-[11px] font-bold flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 opacity-50 text-slate-500" />
                    No transaction activity on this date.
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
                      className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex justify-between items-center"
                    >
                      <div className="text-left min-w-0 pr-4">
                        <span className="text-[8px] font-bold text-slate-500 uppercase block">Income Inflow</span>
                        <h5 className="text-xs font-extrabold text-white mt-0.5 truncate">Month Salary</h5>
                        <span className="inline-block mt-1 text-[8px] px-1.5 py-0.5 rounded-full font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          SALARY
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-400 shrink-0">
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
                      typeBadgeClass = 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
                      amountClass = 'text-violet-400';
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
                        className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex justify-between items-center"
                      >
                        <div className="text-left min-w-0 pr-4">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">
                            {isSpending || isLending || isSavings ? 'Outflow' : 'Inflow'}
                          </span>
                          <h5 className="text-xs font-extrabold text-white mt-0.5 truncate">{entry.title}</h5>
                          <span className={`inline-block mt-1 text-[8px] px-1.5 py-0.5 rounded-full font-black tracking-wider uppercase ${typeBadgeClass}`}>
                            {entry.type}
                          </span>
                        </div>
                        <span className={`text-xs font-black shrink-0 ${amountClass}`}>
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

        {/* SWIPEABLE TABBED CHARTS PANEL FOR PREMIUM MOBILE UX */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 text-left space-y-4">
          <div>
            <h3 className="text-xs font-black text-white">Visual Analytics</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Select a category to view reports and trends.</p>
          </div>

          {/* Swipeable Tabs selectors */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Active Tab Chart Container */}
          <div className="h-60 w-full relative">
            <AnimatePresence mode="wait">
              {activeTab === 'cashflow' && (
                <motion.div
                  key="cashflow-chart"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                    Cycle Inflow vs Outflow
                  </span>
                  <div className="h-48 w-full">
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} />
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
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                    Historical Spending Trends
                  </span>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Spending" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={18} />
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
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                    Remaining balance & savings
                  </span>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Remaining Balance" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={18} />
                        <Bar dataKey="Invested Savings" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={18} />
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
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                    Stock performance (Invested vs Market Value)
                  </span>

                  {stockHoldings.length === 0 ? (
                    <div className="h-44 w-full flex flex-col items-center justify-center text-slate-500 text-[11px] gap-2">
                      <AlertCircle className="w-6 h-6 opacity-30" />
                      <span>No stock holdings logged.</span>
                      <Link
                        href="/stocks"
                        className="text-[10px] font-black uppercase px-2.5 py-1 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-lg mt-1"
                      >
                        Add Stocks
                      </Link>
                    </div>
                  ) : (
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stockHoldings.map(h => ({
                            name: h.symbol.split('.')[0],
                            Invested: h.investedValue,
                            Current: h.currentValue
                          }))}
                          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={8} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontFamily: 'inherit',
                            }}
                            formatter={(value) => [formatCurrency(value), '']}
                          />
                          <Bar dataKey="Invested" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={18} />
                          <Bar dataKey="Current" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={18} />
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
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                    Current cycle category distribution
                  </span>

                  {pieChartData.length === 0 ? (
                    <div className="h-44 w-full flex flex-col items-center justify-center text-slate-500 text-[11px]">
                      <AlertCircle className="w-6 h-6 opacity-30 mb-2" />
                      <span>No spending recorded in this cycle.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 h-44">
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

                      <div className="flex-grow space-y-1 max-h-40 overflow-y-auto pr-1">
                        {pieChartData.map((slice, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[9px] border-b border-white/5 pb-1">
                            <div className="flex items-center gap-1 font-bold text-white min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[slice.name] || '#a78bfa' }}></span>
                              <span className="truncate">{slice.name}</span>
                            </div>
                            <span className="font-extrabold text-slate-400 shrink-0 ml-1">{formatCurrency(slice.value)}</span>
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
          className="block w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black tracking-wider text-center uppercase transition-all"
        >
          View Full Ledger Passbook
        </Link>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 text-slate-600 text-[10px] text-center font-bold uppercase tracking-wider">
          © {new Date().getFullYear()} e-Passbook Reports. Optimized for iOS & Android views.
        </div>
      </footer>
    </div>
  );
}
