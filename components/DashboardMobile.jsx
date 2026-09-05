'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  PlusCircle,
  Trash2,
  TrendingUp,
  Wallet,
  History,
  AlertCircle,
  HelpCircle,
  PiggyBank,
  ArrowRightLeft,
  X,
  Zap,
  Search,
  Sparkles,
  Target,
  Pencil,
  Flame
} from 'lucide-react';
import Navbar from './Navbar';
import SpotlightCard from './ui/SpotlightCard';

export default function DashboardMobile({
  user,
  logout,
  data,
  dataLoading,
  filter,
  setFilter,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  salaryModalOpen,
  setSalaryModalOpen,
  entryModalOpen,
  setEntryModalOpen,
  presetsDrawerOpen,
  setPresetsDrawerOpen,
  salaryCelebrationOpen,
  setSalaryCelebrationOpen,
  // Salary Form
  salAmount,
  setSalAmount,
  salMonth,
  setSalMonth,
  salYear,
  setSalYear,
  salError,
  setSalError,
  salLoading,
  handleAddSalary,
  handleDeleteEntry,
  // Helpers
  formatCurrency,
  getPresetsList,
  monthsList,
  // New States
  entryToEdit,
  setEntryToEdit,
  salaryType,
  setSalaryType,
  parentLending,
  setParentLending
}) {
  return (
    <div className="relative min-h-screen pb-24 bg-[#050506] text-[#EDEDEF]">
      <Navbar />

      <main className="px-4 py-4 relative z-10 space-y-4">
        {/* Welcome Header & Cycle Info */}
        <div className="glass-card p-4 space-y-2 border border-white/[0.06] rounded-xl">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[8px] font-mono uppercase tracking-widest rounded">
              v0.1.39 • Live
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] text-[#8A8F98] font-mono uppercase tracking-wider">Synced</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Hello, {user?.displayName ? user.displayName.split(' ')[0] : 'User'}
            </h1>
            <p className="text-[10px] text-[#8A8F98] font-normal mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#818cf8]" />
              Cycle:
              {dataLoading ? (
                <span className="inline-block w-20 h-2 bg-white/5 rounded animate-pulse" />
              ) : data?.startDate ? (
                <span className="text-[#EDEDEF] font-mono">
                  {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <span className="mx-1 text-[#8A8F98]">→</span>
                  {new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ) : (
                <span className="text-[#8A8F98]">Not set</span>
              )}
            </p>
          </div>

          {/* Filters Select */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#8A8F98]">Period</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#0a0a0c] border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#5E6AD2] cursor-pointer"
            >
              <option value="current">Current Cycle</option>
              <option value="last">Last Cycle</option>
              <option value="last3">Last 3 Months</option>
              <option value="last6">Last 6 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {filter === 'custom' && (
            <div className="flex items-center gap-1.5 bg-[#0a0a0c] border border-white/[0.06] rounded-lg p-2 text-[10px]">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer w-full text-[10px]"
              />
              <span className="text-[#8A8F98]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer w-full text-[10px]"
              />
            </div>
          )}
        </div>

        {/* Primary Available Capital Card */}
        <SpotlightCard 
          className="p-4 flex flex-col justify-between min-h-[160px]"
          spotlightColor="rgba(94, 106, 210, 0.16)"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#8A8F98] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" /> Total Available
              </span>
              <div className="mt-1.5">
                {dataLoading ? (
                  <div className="w-32 h-7 bg-white/5 rounded animate-pulse" />
                ) : (
                  <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                    {formatCurrency(data?.kpis?.currentBalance)}
                  </h2>
                )}
                <span className="text-[8px] text-[#8A8F98] block mt-0.5">Liquid reserves + active cycle</span>
              </div>
            </div>
            <span className="p-2 bg-white/[0.04] border border-white/[0.08] text-[#818cf8] rounded-lg">
              <Wallet className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-between items-center">
            <div>
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#8A8F98] block">Salary Bal</span>
              {dataLoading ? (
                <div className="w-16 h-4 bg-white/5 rounded animate-pulse mt-0.5" />
              ) : (
                <p className="text-xs font-semibold text-emerald-400">{formatCurrency(data?.kpis?.salaryBalance)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSalaryModalOpen(true)}
                className="btn-linear-secondary px-2.5 py-1 text-[10px] text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Salary
              </button>
              <button
                onClick={() => setEntryModalOpen(true)}
                className="btn-linear-primary px-3 py-1 text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" /> Entry
              </button>
            </div>
          </div>
        </SpotlightCard>

        {/* Dynamic Autofill Presets Scroll */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <div className="glass-card p-3 flex flex-col gap-2 border border-white/[0.06] rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#818cf8]" />
                <span className="text-[10px] font-semibold text-white">Quick Presets</span>
              </div>
              <button
                onClick={() => setPresetsDrawerOpen(true)}
                className="text-[9px] font-mono text-[#818cf8] hover:text-white cursor-pointer"
              >
                ALL
              </button>
            </div>

            <div
              className="flex gap-1.5 overflow-x-auto py-0.5 scroll-smooth select-none max-w-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {getPresetsList().map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setEntryToEdit({
                      amount: preset.amount,
                      type: preset.type,
                      title: preset.title,
                      description: preset.desc || '',
                      useSalaryBalance: preset.type === 'SPENDING'
                    });
                    setEntryModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-[#0a0a0c] border border-white/[0.06] text-[9px] font-medium rounded-lg text-[#EDEDEF] flex items-center gap-1.5 shrink-0 hover:bg-white/[0.04]"
                >
                  <span>{preset.label}</span>
                  <span className="text-[8px] font-mono text-white bg-white/[0.06] px-1 py-0.2 rounded">{formatCurrency(preset.amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spending Streaks Tracker */}
        {!dataLoading && data?.streaks && (
          <div className="glass-card p-3.5 flex flex-col gap-2.5 border border-white/[0.06] rounded-xl text-left">
            <div className="flex items-center gap-1.5 border-b border-white/[0.04] pb-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98]">Discipline Streaks</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-[#0a0a0c] border border-white/[0.06] rounded-lg flex flex-col justify-between">
                <span className="text-[8px] font-mono text-amber-400 uppercase tracking-wider">Zero Spend</span>
                <div className="mt-1">
                  <span className="text-base font-semibold text-white">{data.streaks.level1} Days</span>
                  <span className="block text-[7px] text-[#8A8F98]">0 expense days</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#0a0a0c] border border-white/[0.06] rounded-lg flex flex-col justify-between">
                <span className="text-[8px] font-mono text-yellow-400 uppercase tracking-wider">Controlled</span>
                <div className="mt-1">
                  <span className="text-base font-semibold text-white">{data.streaks.level2} Days</span>
                  <span className="block text-[7px] text-[#8A8F98]">Under {formatCurrency(data.streaks.level2Limit)}/d</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact Grid of KPIs (2-columns) */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              title: "Spending",
              amount: formatCurrency(data?.kpis?.spending),
              text: "text-rose-400",
              desc: "Expenses"
            },
            {
              title: "SIP / Wealth",
              amount: formatCurrency(data?.kpis?.savings),
              text: "text-amber-400",
              desc: "Savings & SIPs"
            },
            {
              title: "Lending",
              amount: formatCurrency(data?.kpis?.lending),
              text: "text-blue-400",
              desc: "Receivable"
            },
            {
              title: "Loan Debts",
              amount: formatCurrency(data?.kpis?.loan),
              text: "text-orange-400",
              desc: "Active debts"
            },
            {
              title: "Advances",
              amount: formatCurrency(data?.kpis?.advance),
              text: "text-cyan-400",
              desc: "Advance logs"
            }
          ].map((card, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#0a0a0c]/80 border border-white/[0.06] rounded-xl text-left flex flex-col justify-between h-20"
            >
              <div className="flex justify-between items-start">
                <span className="text-[#8A8F98] text-[9px] font-mono uppercase tracking-wider">{card.title}</span>
                <span className={`w-1 h-1 rounded-full ${card.text.replace('text', 'bg')}`} />
              </div>
              <div className="mt-1">
                {dataLoading ? (
                  <div className="w-16 h-3 bg-white/5 rounded animate-pulse" />
                ) : (
                  <p className={`text-xs font-semibold tracking-tight ${card.text} truncate`}>{card.amount}</p>
                )}
                <span className="text-[7px] text-[#8A8F98] block mt-0.5 leading-none">{card.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* E-Passbook Ledger Mobile Feed */}
        <div className="glass-card p-4 space-y-3.5 border border-white/[0.06] rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#818cf8]" /> Recent Transactions
              </h2>
              <span className="text-[8px] text-[#8A8F98] font-mono uppercase tracking-wider block mt-0.5">Audit log</span>
            </div>
            <Link
              href="/transactions"
              className="btn-linear-secondary px-2 py-0.5 text-[9px] flex items-center gap-0.5"
            >
              All <ArrowUpRight className="w-2.5 h-2.5" />
            </Link>
          </div>

          {/* Search and Category Badges */}
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[#8A8F98] pointer-events-none">
                <Search className="w-3 h-3" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ledger..."
                className="w-full pl-7 pr-3 py-1.5 bg-[#0a0a0c] border border-white/10 rounded-lg text-[10px] text-white placeholder-[#8A8F98]/50 focus:outline-none focus:border-[#5E6AD2]"
              />
            </div>

            <div
              className="flex gap-1 overflow-x-auto select-none py-0.5"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {['ALL', 'SPENDING', 'SAVINGS', 'LENDING', 'LOAN', 'ADVANCE'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTypeFilter(tab)}
                  className={`px-2 py-1 text-[8px] font-mono uppercase tracking-wider rounded-md transition-all border shrink-0 ${typeFilter === tab
                    ? 'bg-white/[0.08] border-white/15 text-white'
                    : 'bg-transparent border-transparent text-[#8A8F98]'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Feed List Items */}
          {dataLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-12 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (() => {
            const filteredTransactions = (data?.recentTransactions || []).filter(t => {
              const title = t.title || 'Untitled';
              const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
              const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
              return matchesSearch && matchesType;
            });

            if (filteredTransactions.length === 0) {
              return (
                <div className="py-6 text-center text-[#8A8F98]">
                  <Wallet className="w-5 h-5 mx-auto mb-1.5 opacity-30" />
                  <p className="text-[10px]">No matching transactions.</p>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {filteredTransactions.map((entry) => {
                  const colors = {
                    SPENDING: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                    LENDING: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    LOAN: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                    ADVANCE: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                    SAVINGS: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  };

                  let AvatarIcon = ArrowUpRight;
                  let avatarColor = 'bg-rose-500/10 text-rose-400';
                  if (entry.type === 'SAVINGS') { AvatarIcon = Target; avatarColor = 'bg-amber-500/10 text-amber-400'; }
                  else if (entry.type === 'LENDING') { AvatarIcon = ArrowRightLeft; avatarColor = 'bg-blue-500/10 text-blue-400'; }
                  else if (entry.type === 'LOAN') { AvatarIcon = HelpCircle; avatarColor = 'bg-orange-500/10 text-orange-400'; }
                  else if (entry.type === 'ADVANCE') { AvatarIcon = ArrowDownLeft; avatarColor = 'bg-cyan-500/10 text-cyan-400'; }

                  const isOutflow = entry.type === 'SPENDING' || entry.type === 'LENDING';

                  return (
                    <div
                      key={entry.id}
                      className="bg-[#0a0a0c] border border-white/[0.04] p-2.5 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`p-1.5 rounded-lg border border-white/5 shrink-0 ${avatarColor}`}>
                          <AvatarIcon className="w-3 h-3" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-medium text-white truncate">{entry.title}</h4>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap font-mono">
                            <span className={`px-1 py-0.2 rounded text-[7px] border uppercase ${colors[entry.type]}`}>
                              {entry.type}
                            </span>
                            <span className="text-[7.5px] text-[#8A8F98]">
                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] font-mono font-medium ${isOutflow ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isOutflow ? '-' : '+'}{formatCurrency(entry.amount)}
                        </span>
                        {entry.type === 'LENDING' && entry.unpaidAmount > 0 && (
                          <button
                            onClick={() => {
                              setParentLending(entry);
                              setEntryModalOpen(true);
                            }}
                            className="p-1 text-[#8A8F98] hover:text-emerald-400 rounded cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEntryToEdit(entry);
                            setEntryModalOpen(true);
                          }}
                          className="p-1 text-[#8A8F98] hover:text-white rounded cursor-pointer"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 text-[#8A8F98] hover:text-rose-400 rounded cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* AI Insight Compact Mobile Card */}
        <div className="glass-card p-4 space-y-2.5 border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
            <h2 className="text-xs font-semibold text-white">AI Insights</h2>
          </div>
          <p className="text-[#8A8F98] text-[10px] leading-relaxed">
            {data?.kpis?.spending > 0
              ? `You spent ${formatCurrency(data?.kpis?.spending)} this cycle. Your salary balance is ${formatCurrency(data?.kpis?.salaryBalance)}.`
              : "No spending logged this cycle yet. Record expenses to activate Gemini budget analytics."}
          </p>
          <Link
            href="/assistant"
            className="btn-linear-primary w-full py-2 text-[10px] text-center flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> Launch Assistant
          </Link>
        </div>
      </main>

      {/* MODAL 1: Add Salary Bottom Drawer */}
      <AnimatePresence>
        {salaryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer z-0"
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full bg-[#0a0a0c] border-t border-white/10 rounded-t-2xl p-5 relative max-h-[85vh] overflow-y-auto z-10"
            >
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <PiggyBank className="w-4 h-4 text-emerald-400" /> Log Inflow
                </h3>
                <button onClick={() => setSalaryModalOpen(false)} className="text-[#8A8F98] hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#050506] border border-white/[0.06] rounded-lg mb-3">
                <button
                  type="button"
                  onClick={() => setSalaryType('SALARY')}
                  className={`py-1.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                    salaryType === 'SALARY'
                      ? 'bg-white/[0.08] text-white border border-white/10'
                      : 'text-[#8A8F98]'
                  }`}
                >
                  Salary
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryType('BONUS')}
                  className={`py-1.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                    salaryType === 'BONUS'
                      ? 'bg-white/[0.08] text-white border border-white/10'
                      : 'text-[#8A8F98]'
                  }`}
                >
                  Bonus
                </button>
              </div>

              {salError && (
                <p className="text-[10px] text-rose-400 mb-2">{salError}</p>
              )}

              <form onSubmit={handleAddSalary} className="space-y-3">
                <div>
                  <label className="block text-[#8A8F98] text-[10px] font-medium mb-1">
                    {salaryType === 'SALARY' ? 'Salary Amount' : 'Bonus Amount'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={salAmount}
                    onChange={(e) => setSalAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[#8A8F98] text-[10px] font-medium mb-1">Month</label>
                    <select
                      value={salMonth}
                      onChange={(e) => setSalMonth(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2] cursor-pointer"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A8F98] text-[10px] font-medium mb-1">Year</label>
                    <input
                      type="number"
                      value={salYear}
                      onChange={(e) => setSalYear(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salLoading}
                  className="btn-linear-primary w-full py-2.5 text-xs flex items-center justify-center cursor-pointer"
                >
                  {salLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : salaryType === 'SALARY' ? "Save Salary" : "Save Bonus"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Presets Bottom Drawer */}
      <AnimatePresence>
        {presetsDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPresetsDrawerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer z-0"
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full bg-[#0a0a0c] border-t border-white/10 rounded-t-2xl p-5 relative max-h-[80vh] overflow-y-auto z-10"
            >
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#818cf8]" /> Autofill Presets
                </h3>
                <button onClick={() => setPresetsDrawerOpen(false)} className="text-[#8A8F98] hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {getPresetsList().map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEntryToEdit({
                        amount: preset.amount,
                        type: preset.type,
                        title: preset.title,
                        description: preset.desc || '',
                        useSalaryBalance: preset.type === 'SPENDING'
                      });
                      setPresetsDrawerOpen(false);
                      setEntryModalOpen(true);
                    }}
                    className="p-3 bg-[#050506] border border-white/[0.06] rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-white truncate">{preset.title}</span>
                      <span className="block text-[8px] font-mono text-[#8A8F98] uppercase tracking-wider">{preset.type}</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-white px-2 py-0.5 bg-white/[0.05] rounded border border-white/[0.06]">
                      {formatCurrency(preset.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Salary Celebration Overlay */}
      <AnimatePresence>
        {salaryCelebrationOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryCelebrationOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer z-0"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xs bg-[#0a0a0c] border border-emerald-500/30 rounded-2xl p-5 text-center z-10 shadow-2xl"
            >
              <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-semibold text-white">Salary Logged!</h2>
              <p className="text-emerald-400 text-[10px] font-mono mt-0.5">Cycle balance updated.</p>
              <button
                type="button"
                onClick={() => setSalaryCelebrationOpen(false)}
                className="btn-linear-primary w-full py-2 text-xs mt-4 cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
