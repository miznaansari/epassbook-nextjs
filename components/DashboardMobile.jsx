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
  Pencil
} from 'lucide-react';
import Navbar from './Navbar';

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
  // Entry Form
  entryAmount,
  setEntryAmount,
  entryTitle,
  setEntryTitle,
  entryDesc,
  setEntryDesc,
  entryType,
  setEntryType,
  useSalaryBal,
  setUseSalaryBal,
  deductMonth,
  setDeductMonth,
  deductYear,
  setDeductYear,
  entryError,
  setEntryError,
  entryLoading,
  handleAddEntry,
  handleDeleteEntry,
  // Autocomplete suggestions
  filteredSuggestions,
  showSuggestions,
  setShowSuggestions,
  handleSelectSuggestion,
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
  const suggestionsRef = useRef(null);

  // Close suggestions on clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSuggestions]);

  return (
    <div className="relative min-h-screen pb-24 bg-[#030712] text-slate-100 selection:bg-violet-500/30 overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[30%] bg-gradient-to-br from-violet-600/10 to-transparent rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[70%] h-[35%] bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-[100px] pointer-events-none z-0"></div>

      <Navbar />

      <main className="px-4 py-4 relative z-10 space-y-5">
        {/* Welcome Header & Cycle Info */}
        <div className="bg-slate-900/40 border border-white/[0.04] p-4 rounded-2xl backdrop-blur-md space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-widest rounded-md">
              ePassbook Hub v0.1.3
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Synced</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Hello, {user?.displayName ? user.displayName.split(' ')[0] : 'User'}
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-violet-400" />
              Cycle Boundaries:{' '}
              {dataLoading ? (
                <span className="inline-block w-20 h-2 bg-white/5 rounded animate-pulse"></span>
              ) : data?.startDate ? (
                <span className="text-slate-300">
                  {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <span className="mx-1 text-slate-500">→</span>
                  {new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ) : (
                <span className="text-slate-500">Not configured</span>
              )}
            </p>
          </div>

          {/* Filters Select */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Period</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-violet-500 font-bold cursor-pointer transition-all"
            >
              <option value="current">Current Cycle</option>
              <option value="last">Last Cycle</option>
              <option value="last3">Last 3 Months</option>
              <option value="last6">Last 6 Months</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {filter === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/5 rounded-xl p-2 text-[10px]">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold w-full"
              />
              <span className="text-slate-600 font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold w-full"
                onBlur={fetchDashboardData}
              />
            </div>
          )}
        </div>

        {/* Primary Available Capital Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#131b2e] to-[#0a0f1d] border border-white/[0.08] p-5 rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between min-h-[170px]">
          <div className="absolute right-0 top-0 w-28 h-28 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span> Available Capital
              </span>
              <div className="mt-1">
                {dataLoading ? (
                  <div className="w-36 h-8 bg-white/5 rounded animate-pulse mt-1"></div>
                ) : (
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {formatCurrency(data?.kpis?.currentBalance)}
                  </h2>
                )}
                <span className="text-[8px] text-slate-500 font-medium block mt-1">Includes salary and reserves</span>
              </div>
            </div>
            <span className="p-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05] flex justify-between items-center">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Salary Bal</span>
              {dataLoading ? (
                <div className="w-16 h-4 bg-white/5 rounded animate-pulse mt-0.5"></div>
              ) : (
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(data?.kpis?.salaryBalance)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSalaryModalOpen(true)}
                className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Salary
              </button>
              <button
                onClick={() => setEntryModalOpen(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" /> Log Entry
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Autofill Presets Scroll */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <div className="bg-slate-900/30 border border-white/[0.04] p-3 rounded-2xl flex flex-col gap-2.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <span className="p-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-md">
                <Zap className="w-3 h-3" />
              </span>
              <div>
                <span className="block text-[10px] font-black tracking-tight text-white uppercase leading-none">Autofill</span>
              </div>
            </div>
            <div
              className="flex gap-2 overflow-x-auto py-0.5 scroll-smooth select-none max-w-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                onClick={() => setPresetsDrawerOpen(true)}
                className="px-2.5 py-1.5 bg-violet-600/20 border border-violet-500/35 text-[9px] font-black rounded-lg text-violet-300 flex items-center gap-1 shrink-0 active:scale-95"
              >
                <span>All Presets</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </button>

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
                  className="px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] text-[9px] font-bold rounded-lg text-slate-300 flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <span>{preset.label}</span>
                  <span className="text-[8px] text-slate-400 bg-white/5 px-1 py-0.5 rounded font-black">{formatCurrency(preset.amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compact Grid of KPIs (2-columns) */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              title: "Spending",
              amount: formatCurrency(data?.kpis?.spending),
              borderColor: "border-rose-500/20",
              bgColor: "bg-rose-500/5",
              text: "text-rose-400",
              desc: "Expenses this cycle"
            },
            {
              title: "SIP / Wealth",
              amount: formatCurrency(data?.kpis?.savings),
              borderColor: "border-amber-500/20",
              bgColor: "bg-amber-500/5",
              text: "text-amber-400",
              desc: "Savings & SIPs"
            },
            {
              title: "Lending",
              amount: formatCurrency(data?.kpis?.lending),
              borderColor: "border-blue-500/20",
              bgColor: "bg-blue-500/5",
              text: "text-blue-400",
              desc: "Money lent out"
            },
            {
              title: "Loan Debts",
              amount: formatCurrency(data?.kpis?.loan),
              borderColor: "border-orange-500/20",
              bgColor: "bg-orange-500/5",
              text: "text-orange-400",
              desc: "Active debts"
            },
            {
              title: "Advances",
              amount: formatCurrency(data?.kpis?.advance),
              borderColor: "border-cyan-500/20",
              bgColor: "bg-cyan-500/5",
              text: "text-cyan-400",
              desc: "Advance deposits"
            }
          ].map((card, idx) => (
            <div
              key={idx}
              className={`bg-slate-900/40 border ${card.borderColor} p-3 text-left flex flex-col justify-between h-20 rounded-2xl relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">{card.title}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${card.bgColor} ${card.text.replace('text', 'bg')}`}></span>
              </div>
              <div className="mt-1">
                {dataLoading ? (
                  <div className="w-16 h-4 bg-white/5 rounded animate-pulse"></div>
                ) : (
                  <p className={`text-sm font-black tracking-tight ${card.text} truncate`}>{card.amount}</p>
                )}
                <span className="text-[7px] text-slate-500 font-medium block mt-0.5 leading-none">{card.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* E-Passbook Ledger Mobile Feed (Replacement for tables) */}
        <div className="bg-slate-900/40 border border-white/[0.06] p-4 rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <History className="w-4.5 h-4.5 text-violet-400" /> Recent Transactions
              </h2>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Ledger feed</span>
            </div>
            <Link
              href="/transactions"
              className="px-2.5 py-1 bg-violet-600/10 border border-violet-500/25 text-violet-400 rounded-lg text-[9px] font-bold flex items-center gap-0.5"
            >
              Full List <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Search and Category Badges */}
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ledger..."
                className="w-full pl-8 pr-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all font-semibold"
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
                  className={`px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all border shrink-0 ${typeFilter === tab
                    ? 'bg-violet-600/10 border-violet-500/40 text-violet-400'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
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
                <div key={n} className="h-14 bg-white/5 rounded-xl animate-pulse"></div>
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
                <div className="py-8 text-center text-slate-500">
                  <Wallet className="w-6 h-6 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400">No matching transactions.</p>
                </div>
              );
            }

            return (
              <div className="space-y-2.5">
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
                      className="bg-slate-900/60 border border-white/[0.04] p-3 rounded-2xl flex items-center justify-between gap-2 shadow-sm relative group overflow-hidden"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-2 rounded-xl border border-white/5 shrink-0 ${avatarColor}`}>
                          <AvatarIcon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold text-white truncate leading-tight">{entry.title}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded text-[7px] font-black border uppercase tracking-wider ${colors[entry.type]}`}>
                              {entry.type}
                            </span>
                            {entry.useSalaryBalance && (
                              <span className="text-[6px] text-slate-500 font-extrabold uppercase tracking-wider bg-white/5 px-1 py-0.2 rounded border border-white/5">Deducted</span>
                            )}
                            <span className="text-[7.5px] text-slate-500 font-medium">
                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {entry.type === 'LENDING' && (
                            <div className="text-[8px] font-bold mt-1">
                              {entry.unpaidAmount === 0 ? (
                                <span className="text-emerald-400">✓ Fully Repaid</span>
                              ) : (
                                <span className="text-slate-400">Unpaid: <strong className="text-blue-400">{formatCurrency(entry.unpaidAmount)}</strong></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] font-black tracking-tight ${isOutflow ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isOutflow ? '-' : '+'}{formatCurrency(entry.amount)}
                        </span>
                        {entry.type === 'LENDING' && entry.unpaidAmount > 0 && (
                          <button
                            onClick={() => {
                              setParentLending(entry);
                              setEntryModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent rounded-lg transition-all cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEntryToEdit(entry);
                            setEntryModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 border border-transparent rounded-lg transition-all cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
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
        <div className="bg-gradient-to-br from-[#0c1221] to-[#060a14] border border-white/[0.06] p-4 rounded-3xl shadow-md space-y-3">
          <h2 className="text-sm font-black text-white flex items-center gap-1.5">
            <Sparkles className="w-4.5 h-4.5 text-violet-400" /> AI Insights Preview
          </h2>
          <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl">
            <p className="text-slate-300 text-[10px] leading-relaxed font-semibold">
              {data?.kpis?.spending > 0
                ? `You spent ${formatCurrency(data?.kpis?.spending)} this cycle. Your salary balance is ${formatCurrency(data?.kpis?.salaryBalance)}. Ask Gemini for suggestions!`
                : "No spending logged this cycle yet! Keep track of expenses to let Gemini analyze savings trends and give optimization ideas."}
            </p>
          </div>
          <Link
            href="/assistant"
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl font-black tracking-wider text-[10px] text-center uppercase transition-all flex items-center justify-center gap-1 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ask AI Assistant
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-6 text-center text-[10px] text-slate-600 font-bold border-t border-white/5 mt-5">
        © {new Date().getFullYear()} ePassbook. Crafted with HSL Theme.
      </footer>

      {/* MODAL 1: Add Salary Bottom Drawer */}
      <AnimatePresence>
        {salaryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryModalOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm cursor-pointer z-0"
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full bg-[#0d1423] border-t border-white/10 rounded-t-3xl p-5 relative overflow-hidden shadow-2xl max-h-[85vh] overflow-y-auto z-10"
            >
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4 shrink-0"></div>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500"></div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <PiggyBank className="w-4.5 h-4.5 text-emerald-400" /> Log Month-Wise Inflow
                </h3>
                <button onClick={() => setSalaryModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              {/* Sliding Toggle Tab */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950/60 border border-white/5 rounded-xl mb-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSalaryType('SALARY')}
                  className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                    salaryType === 'SALARY'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Salary
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryType('BONUS')}
                  className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                    salaryType === 'BONUS'
                      ? 'bg-cyan-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-355'
                  }`}
                >
                  Bonus
                </button>
              </div>

              {salError && (
                <div className="mb-3 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{salError}</span>
                </div>
              )}

              <form onSubmit={handleAddSalary} className="space-y-3">
                <div>
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase mb-1">
                    {salaryType === 'SALARY' ? 'Salary Amount' : 'Bonus Amount'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={salAmount}
                    onChange={(e) => setSalAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase mb-1">Month</label>
                    <select
                      value={salMonth}
                      onChange={(e) => setSalMonth(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase mb-1">Year</label>
                    <input
                      type="number"
                      value={salYear}
                      onChange={(e) => setSalYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full px-3 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salLoading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center"
                >
                  {salLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : salaryType === 'SALARY' ? "Save Salary" : "Save Bonus"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* MODAL 3: Presets Selector Drawer */}
      <AnimatePresence>
        {presetsDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPresetsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm cursor-pointer z-0"
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full bg-[#0d1423] border-t border-white/10 rounded-t-3xl p-5 relative shadow-2xl max-h-[80vh] overflow-y-auto z-10"
            >
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4 shrink-0"></div>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-cyan-500"></div>

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Zap className="w-4.5 h-4.5 text-violet-400" /> Autofill Presets
                  </h3>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold block mt-0.5">Tap to log quickly</span>
                </div>
                <button onClick={() => setPresetsDrawerOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {getPresetsList().map((preset, idx) => {
                  const colors = {
                    SPENDING: 'border-rose-500/25 bg-rose-500/5 text-rose-400',
                    LENDING: 'border-blue-500/25 bg-blue-500/5 text-blue-400',
                    LOAN: 'border-orange-500/25 bg-orange-500/5 text-orange-400',
                    ADVANCE: 'border-cyan-500/25 bg-cyan-500/5 text-cyan-400',
                    SAVINGS: 'border-amber-500/25 bg-amber-500/5 text-amber-400',
                  };

                  return (
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
                      className={`p-3 border rounded-xl transition-all text-left flex items-center justify-between gap-2 cursor-pointer ${colors[preset.type] || 'border-white/10'}`}
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-black text-white truncate">{preset.title}</span>
                        <span className="block text-[8px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{preset.desc || 'Preset'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[8px] font-black uppercase bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-400">{preset.type}</span>
                        <span className="text-xs font-black text-white px-2 py-1 bg-white/5 rounded-lg border border-white/5">{formatCurrency(preset.amount)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Salary Celebration Overlay */}
      <AnimatePresence>
        {salaryCelebrationOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryCelebrationOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md cursor-pointer z-0"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-sm bg-gradient-to-br from-[#121c33] to-[#070b14] border border-emerald-500/35 rounded-3xl p-6 relative overflow-hidden shadow-2xl text-center z-10"
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <PiggyBank className="w-8 h-8" />
                  </motion.div>
                  <span className="absolute -top-2 -right-2 text-xl animate-bounce">🎉</span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-black text-white tracking-tight">Salary Logged!</h2>
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Enjoy Your Salary! 🎉</p>
                </div>

                <p className="text-slate-400 text-[10px] font-semibold leading-relaxed">
                  Your fresh monthly salary balance has been credited and synchronized! Get Gemini to customize a saving projection!
                </p>

                <button
                  type="button"
                  onClick={() => setSalaryCelebrationOpen(false)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-black tracking-wider text-[10px] uppercase transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  Superb, Let's Save!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
