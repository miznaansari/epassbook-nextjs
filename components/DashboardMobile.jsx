'use client';

import { useState } from 'react';
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
  TrendingDown,
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
  Flame,
  ChevronDown,
  ChevronUp,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  HeartPulse,
  Film,
  BookOpen,
  PieChart,
  ShieldCheck,
  RefreshCw,
  Bot,
  Coins,
  Layers,
  BarChart3,
  Banknote,
  Landmark,
  CheckCircle2,
  Info
} from 'lucide-react';
import Navbar from './Navbar';
import SpotlightCard from './ui/SpotlightCard';
import AiQuickAddInput from './AiQuickAddInput';
import Ai503020PromptInput from './Ai503020PromptInput';

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
  // States
  entryToEdit,
  setEntryToEdit,
  salaryType,
  setSalaryType,
  parentLending,
  setParentLending,
  // AI Intelligence Props
  aiData: propAiData,
  aiLoading: propAiLoading,
  aiThinkingStep: propAiThinkingStep,
  aiRemainingRefreshes = 5,
  aiCustomPromptNotes = '',
  aiQuotaError = '',
  fetchAiIntelligence: propFetchAiIntelligence
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedDays, setExpandedDays] = useState({});
  const [localAiData, setLocalAiData] = useState(null);
  const [localAiLoading, setLocalAiLoading] = useState(false);
  const [localAiThinkingStep, setLocalAiThinkingStep] = useState(0);

  const aiData = propAiData !== undefined ? propAiData : localAiData;
  const aiLoading = propAiLoading !== undefined ? propAiLoading : localAiLoading;
  const aiThinkingStep = propAiThinkingStep !== undefined ? propAiThinkingStep : localAiThinkingStep;

  const toggleDayExpansion = (dateKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const getDynamicQuickAddPresets = () => {
    const defaultPresets = [
      { label: 'Dinner', icon: '🍔', title: 'Dinner', amount: 250, type: 'SPENDING', desc: 'Dining / Food' },
      { label: 'Coffee', icon: '☕', title: 'Coffee', amount: 50, type: 'SPENDING', desc: 'Daily caffeine run' },
      { label: 'Cab/Fuel', icon: '🚗', title: 'Cab / Fuel', amount: 150, type: 'SPENDING', desc: 'Transport ride' },
      { label: 'Groceries', icon: '🛒', title: 'Groceries', amount: 500, type: 'SPENDING', desc: 'Daily essentials' },
      { label: 'SIP', icon: '📈', title: 'SIP Investment', amount: 1000, type: 'SAVINGS', desc: 'Invested savings / SIP' },
      { label: 'Lent', icon: '💸', title: 'Lent to Friend', amount: 500, type: 'LENDING', desc: 'Lending receivable' },
    ];

    if (!data?.recentTransactions || data.recentTransactions.length === 0) {
      return defaultPresets;
    }

    const seenKeys = new Set();
    const dynamicPresets = [];

    for (const t of data.recentTransactions) {
      const title = (t.title || 'Untitled').trim();
      const type = t.type || 'SPENDING';
      const key = `${title.toLowerCase()}_${type}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);

        let icon = '💸';
        const text = `${title} ${t.description || ''}`.toLowerCase();
        if (type === 'SAVINGS' || /sip|invest|save|stock|fund/i.test(text)) icon = '📈';
        else if (/coffee|starbucks|tea|chai|cafe/i.test(text)) icon = '☕';
        else if (/dinner|lunch|breakfast|food|swiggy|zomato|burger|pizza|restaurant/i.test(text)) icon = '🍔';
        else if (/uber|ola|cab|taxi|fuel|petrol|diesel|gas|auto/i.test(text)) icon = '🚗';
        else if (/grocer|blinkit|zepto|instamart|supermarket|vegetable|milk/i.test(text)) icon = '🛒';
        else if (/rent|flat|room|house|electricity|water|wifi|broadband/i.test(text)) icon = '🏠';
        else if (/recharge|airtel|jio|netflix|spotify|subscription/i.test(text)) icon = '⚡';
        else if (/amazon|flipkart|myntra|shop|clothes|shoes/i.test(text)) icon = '🛍️';
        else if (/doctor|medicine|pharmacy|hospital|gym/i.test(text)) icon = '💊';
        else if (/movie|cinema|game|party|drinks/i.test(text)) icon = '🍿';
        else if (type === 'LENDING') icon = '🤝';
        else if (type === 'LOAN') icon = '💳';
        else if (type === 'ADVANCE') icon = '📥';

        dynamicPresets.push({
          label: title.length > 10 ? title.substring(0, 8) + '..' : title,
          icon,
          title,
          amount: parseFloat(t.amount || 0),
          type,
          desc: t.description || `Recent ${type.toLowerCase()} entry`
        });

        if (dynamicPresets.length >= 6) break;
      }
    }

    return dynamicPresets.length > 0 ? dynamicPresets : defaultPresets;
  };

  const fetchAiIntelligence = async (forceRefresh = false, userPrompt = '') => {
    if (propFetchAiIntelligence) {
      return propFetchAiIntelligence(forceRefresh, userPrompt);
    }
    setLocalAiLoading(true);
    setLocalAiThinkingStep(0);
    const stepInterval = setInterval(() => {
      setLocalAiThinkingStep(prev => (prev < 2 ? prev + 1 : prev));
    }, 900);

    try {
      const res = await fetch('/api/dashboard/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter, forceRefresh, userPrompt })
      });
      if (res.ok) {
        const payload = await res.json();
        setLocalAiData(payload.intelligence);
      }
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(stepInterval);
      setLocalAiLoading(false);
    }
  };

  const getCategoryIconComponent = (catName) => {
    switch (catName) {
      case 'Food & Dining': return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
      case 'Transport & Commute': return <Car className="w-3.5 h-3.5 text-blue-500" />;
      case 'Housing & Utilities': return <Home className="w-3.5 h-3.5 text-purple-500" />;
      case 'Shopping & Lifestyle': return <ShoppingBag className="w-3.5 h-3.5 text-pink-500" />;
      case 'Subscriptions & Tech': return <Zap className="w-3.5 h-3.5 text-cyan-500" />;
      case 'Health & Wellness': return <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Entertainment & Leisure': return <Film className="w-3.5 h-3.5 text-rose-500" />;
      case 'Investments & Savings': return <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Education & Learning': return <BookOpen className="w-3.5 h-3.5 text-teal-500" />;
      default: return <PieChart className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="relative min-h-screen pb-28 bg-[var(--background-deep)] text-[var(--foreground)] overflow-x-hidden transition-colors duration-200">
      <Navbar />

      <main className="px-3.5 py-4 relative z-10 space-y-4 overflow-x-hidden">
        
        {/* Header Card */}
        <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-500 dark:text-indigo-400 text-[9px] font-mono uppercase tracking-widest rounded-md font-semibold">
              2050 Cockpit
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-[var(--foreground-muted)] font-mono">Live Sync</span>
            </div>
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              {user?.displayName ? user.displayName.split(' ')[0] : 'User'}&apos;s Finances
            </h1>
            <p className="text-[11px] text-[var(--foreground-muted)] font-mono mt-0.5">
              Cycle Day: {data?.cycleDate || 1} • {data?.startDate ? new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} - {data?.endDate ? new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            </p>
          </div>

          {/* Quick Filter & Actions */}
          <div className="flex items-center gap-2 pt-1">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--foreground)] flex-1 font-medium"
            >
              <option value="current">Current Cycle</option>
              <option value="last">Last Cycle</option>
              <option value="last3">Last 3 Months</option>
              <option value="last6">Last 6 Months</option>
            </select>

            <button
              onClick={() => setSalaryModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Inflow
            </button>

            <button
              onClick={() => setEntryModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1 shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Entry
            </button>
          </div>

          {/* 🔮 AI-POWERED NATURAL LANGUAGE QUICK-ADD & PRESETS */}
          <div className="pt-2 border-t border-[var(--border-default)]">
            <AiQuickAddInput
              onPrefill={(parsedTx) => {
                setEntryToEdit(parsedTx);
                setEntryModalOpen(true);
              }}
              dynamicPresets={getDynamicQuickAddPresets()}
              formatCurrency={formatCurrency}
              onOpenCustomModal={() => {
                setEntryToEdit(null);
                setEntryModalOpen(true);
              }}
              isCompact={true}
            />
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border-default)] pt-3 select-none">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'daily', label: 'Daily Log', icon: Calendar },
              { id: 'categories', label: 'AI 50/30/20', icon: Layers, isAi: true },
              { id: 'structure', label: 'Assets', icon: Coins },
              { id: 'ai', label: 'Gemini AI', icon: Bot, isSparkle: true },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if ((tab.id === 'ai' || tab.id === 'categories') && !aiData && !aiLoading) {
                      fetchAiIntelligence();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-all border ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 font-semibold'
                      : 'bg-transparent text-[var(--foreground-muted)] border-transparent'
                  }`}
                >
                  <Icon className={`w-3 h-3 ${tab.isSparkle || tab.isAi ? 'text-purple-500' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TOP KPI ROW */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl">
            <span className="text-[9px] font-mono text-[var(--foreground-muted)] uppercase block">Inflow</span>
            <div className="text-lg font-bold text-[var(--foreground)] font-mono mt-0.5">
              {formatCurrency(data?.kpis?.salaryTotal || 0)}
            </div>
            <span className="text-[9px] text-emerald-500 font-semibold font-mono flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> +14.2%
            </span>
          </div>

          <div className="p-3.5 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl">
            <span className="text-[9px] font-mono text-[var(--foreground-muted)] uppercase block">Expenses</span>
            <div className="text-lg font-bold text-rose-500 font-mono mt-0.5">
              {formatCurrency(data?.kpis?.spending || 0)}
            </div>
            <span className="text-[9px] text-emerald-500 font-semibold font-mono flex items-center gap-0.5 mt-0.5">
              <TrendingDown className="w-2.5 h-2.5" /> -6.2%
            </span>
          </div>

          <div className="p-3.5 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl">
            <span className="text-[9px] font-mono text-[var(--foreground-muted)] uppercase block">Active Balance</span>
            <div className="text-lg font-bold text-emerald-500 font-mono mt-0.5">
              {formatCurrency(data?.kpis?.salaryBalance || 0)}
            </div>
            <span className="text-[9px] text-[var(--foreground-muted)] font-mono">Liquid reserve</span>
          </div>

          <div className="p-3.5 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl">
            <span className="text-[9px] font-mono text-[var(--foreground-muted)] uppercase block">Savings & SIP</span>
            <div className="text-lg font-bold text-purple-500 font-mono mt-0.5">
              {formatCurrency(data?.kpis?.savings || 0)}
            </div>
            <span className="text-[9px] text-purple-500 font-mono font-semibold">+18.9%</span>
          </div>
        </div>

        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            
            {/* Top Categories */}
            <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-4 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center justify-between">
                <span>Top Spending Categories</span>
                <button onClick={() => setActiveTab('categories')} className="text-indigo-500 text-[10px]">View AI 50/30/20 &rarr;</button>
              </h3>

              <div className="space-y-2">
                {(data?.spendingCategories || []).slice(0, 4).map((cat, idx) => (
                  <div key={idx} className="p-2.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-[var(--surface-active)]">{getCategoryIconComponent(cat.category)}</span>
                        <span className="font-semibold text-[var(--foreground)]">{cat.category}</span>
                      </div>
                      <span className="font-mono font-bold text-[var(--foreground)]">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 15 }).map((_, sIdx) => (
                        <div
                          key={sIdx}
                          className={`h-1.5 flex-1 rounded-xs ${
                            sIdx < Math.round((cat.percentage / 100) * 15) ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Distribution */}
            <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--foreground)]">Asset Distribution (Net Worth)</h3>
                  <span className="text-[10px] text-[var(--foreground-muted)] font-mono">Net Worth: {formatCurrency(data?.financialStructure?.totalAssetBase || 0)}</span>
                </div>
                <button onClick={() => setActiveTab('structure')} className="text-purple-500 text-[10px] font-semibold">Details &rarr;</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[var(--background-base)] rounded-xl border border-[var(--border-default)]">
                  <span className="text-[9px] font-mono text-indigo-500 uppercase block">Liquid Cash</span>
                  <span className="text-xs font-bold font-mono text-[var(--foreground)] block mt-0.5">{formatCurrency(data?.financialStructure?.liquidCapital?.amount || 0)}</span>
                  <span className="text-[9px] text-[var(--foreground-muted)]">In-Hand ({data?.financialStructure?.liquidCapital?.percentage || 0}%)</span>
                </div>
                <div className="p-2.5 bg-[var(--background-base)] rounded-xl border border-[var(--border-default)]">
                  <span className="text-[9px] font-mono text-emerald-500 uppercase block">Savings Pots</span>
                  <span className="text-xs font-bold font-mono text-[var(--foreground)] block mt-0.5">{formatCurrency(data?.financialStructure?.savingsPots?.amount || 0)}</span>
                  <span className="text-[9px] text-[var(--foreground-muted)]">Pots ({data?.financialStructure?.savingsPots?.percentage || 0}%)</span>
                </div>
              </div>

              <div className="h-6 w-full rounded-xl overflow-hidden flex gap-1 p-0.5 bg-[var(--background-base)] border border-[var(--border-default)]">
                <div style={{ width: `${Math.max(10, data?.financialStructure?.liquidCapital?.percentage || 35)}%` }} className="bg-indigo-600 rounded-lg h-full flex items-center justify-center text-[8px] text-white font-mono font-bold">
                  {data?.financialStructure?.liquidCapital?.percentage || 0}%
                </div>
                <div style={{ width: `${Math.max(10, data?.financialStructure?.savingsPots?.percentage || 25)}%` }} className="bg-emerald-500 rounded-lg h-full flex items-center justify-center text-[8px] text-white font-mono font-bold">
                  {data?.financialStructure?.savingsPots?.percentage || 0}%
                </div>
                <div style={{ width: `${Math.max(10, data?.financialStructure?.stockEquity?.percentage || 20)}%` }} className="bg-purple-500 rounded-lg h-full flex items-center justify-center text-[8px] text-white font-mono font-bold">
                  {data?.financialStructure?.stockEquity?.percentage || 0}%
                </div>
                <div style={{ width: `${Math.max(10, data?.financialStructure?.lendingReceivables?.percentage || 20)}%` }} className="bg-cyan-500 rounded-lg h-full flex items-center justify-center text-[8px] text-white font-mono font-bold">
                  {data?.financialStructure?.lendingReceivables?.percentage || 0}%
                </div>
              </div>
            </div>

            {/* Quick Transactions */}
            <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--foreground)]">Recent Activity</h3>
                <Link href="/transactions" className="text-xs text-indigo-500 font-semibold">View All &rarr;</Link>
              </div>

              <div className="space-y-2">
                {(data?.recentTransactions || []).slice(0, 6).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1 rounded bg-[var(--surface-active)] shrink-0">{getCategoryIconComponent(tx.category)}</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-[var(--foreground)] truncate block">{tx.title}</span>
                        <span className="text-[10px] text-[var(--foreground-muted)]">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${tx.type === 'SPENDING' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {tx.type === 'SPENDING' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB CONTENT: DAILY LOG */}
        {activeTab === 'daily' && (
          <div className="space-y-3">
            {(data?.dailySpending || []).map((day) => {
              const isExpanded = expandedDays[day.date];
              const isZeroSpend = day.spending === 0;

              return (
                <div key={day.date} className="bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--foreground)]">{day.displayDate}</span>
                        {isZeroSpend ? (
                          <span className="px-1.5 py-0.2 text-[8px] font-mono rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">ZERO SPEND</span>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{day.count} items</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--foreground-muted)] font-mono">{day.dayName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-sm ${isZeroSpend ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(day.spending)}
                      </span>
                      <button
                        onClick={() => toggleDayExpansion(day.date)}
                        className="p-1 rounded-lg bg-[var(--surface-active)] text-[var(--foreground)]"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-[var(--border-default)] space-y-1.5">
                      {day.transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center text-[11px] p-2 bg-[var(--background-base)] rounded-xl border border-[var(--border-default)]">
                          <span className="font-semibold text-[var(--foreground)] truncate max-w-[170px]">{tx.title}</span>
                          <span className={`font-mono font-bold ${tx.type === 'SPENDING' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB CONTENT: AI 50/30/20 CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            
            {/* 50/30/20 Header & Quota Card */}
            <div className="bg-[var(--background-elevated)] border border-purple-500/30 p-4 rounded-2xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-500" /> Pure AI 50/30/20 Budgeting
                  </h3>
                  <p className="text-[10px] text-[var(--foreground-muted)] font-mono mt-0.5">
                    100% AI Classified • Zero keyword assumptions
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Daily Quota Counter Badge */}
                  <div className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/25 text-[10px] font-mono text-purple-500 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>{aiRemainingRefreshes ?? 5}/5 left today</span>
                  </div>

                  <button
                    onClick={() => fetchAiIntelligence(true)}
                    disabled={aiLoading}
                    className="p-1.5 rounded-xl bg-purple-600 text-white shadow-sm hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
                    title="Force AI Re-evaluation"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* 🔮 AI Natural Language Refinement Input */}
              <Ai503020PromptInput
                onApplyPrompt={(userPrompt) => fetchAiIntelligence(true, userPrompt)}
                loading={aiLoading}
                remainingRefreshes={aiRemainingRefreshes}
                isCompact={true}
              />

              {/* Quota Error Notification */}
              {aiQuotaError && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-mono text-[11px] leading-tight">{aiQuotaError}</span>
                </div>
              )}

              {/* Active User Custom Override Indicator */}
              {aiCustomPromptNotes && (
                <div className="flex items-center justify-between p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-indigo-500">Customized:</span>
                    <span className="text-[11px] text-[var(--foreground)] truncate italic">&ldquo;{aiCustomPromptNotes}&rdquo;</span>
                  </div>
                  <button
                    onClick={() => fetchAiIntelligence(true, 'RESET_TO_DEFAULT')}
                    disabled={aiLoading}
                    className="text-[10px] font-mono text-indigo-500 hover:underline shrink-0 font-semibold"
                  >
                    Reset Standard
                  </button>
                </div>
              )}

              {/* AI Overall Verdict */}
              {aiData?.needsWantsSavingsAI?.aiVerdict && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" /> Gemini AI Verdict
                  </div>
                  <p className="text-xs text-[var(--foreground)] leading-relaxed">
                    {aiData.needsWantsSavingsAI.aiVerdict}
                  </p>
                </div>
              )}

              {/* Full Shimmering Skeleton Loader */}
              {aiLoading && !aiData ? (
                <div className="space-y-3 pt-2 animate-pulse">
                  <div className="p-3.5 bg-[var(--background-base)] border border-blue-500/20 rounded-xl space-y-2">
                    <div className="h-4 w-28 bg-blue-500/20 rounded" />
                    <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded" />
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                  </div>
                  <div className="p-3.5 bg-[var(--background-base)] border border-pink-500/20 rounded-xl space-y-2">
                    <div className="h-4 w-28 bg-pink-500/20 rounded" />
                    <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded" />
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                  </div>
                  <div className="p-3.5 bg-[var(--background-base)] border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="h-4 w-28 bg-emerald-500/20 rounded" />
                    <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded" />
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                  </div>
                </div>
              ) : (
                /* 3 AI Classified Buckets Cards */
                <div className="space-y-3 pt-1">
                  
                  {/* NEEDS (50%) */}
                  <div className="p-3.5 bg-[var(--background-base)] border border-blue-500/30 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-wider font-mono flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" /> Needs (50% Target)
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {aiData?.needsWantsSavingsAI?.needs?.status || 'Optimal'}
                      </span>
                    </div>
                    
                    <div className="text-xl font-bold text-[var(--foreground)] font-mono">
                      {formatCurrency(aiData?.needsWantsSavingsAI?.needs?.amount || 0)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[var(--foreground-muted)]">
                        <span>Actual Allocation</span>
                        <span>{aiData?.needsWantsSavingsAI?.needs?.percentage || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, aiData?.needsWantsSavingsAI?.needs?.percentage || 0)}%` }} 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--foreground-muted)] italic leading-tight">
                      {aiData?.needsWantsSavingsAI?.needs?.advice || "Essential non-negotiable living costs (Rent, Groceries, Utilities, Health, Fuel)."}
                    </p>

                    {/* Classified Transactions List */}
                    <div className="pt-2 border-t border-[var(--border-default)] space-y-1.5">
                      <div className="text-[9px] font-mono font-bold text-[var(--foreground-muted)] uppercase">
                        Classified Items ({aiData?.needsWantsSavingsAI?.needs?.items?.length || 0}):
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                        {(aiData?.needsWantsSavingsAI?.needs?.items || []).length === 0 ? (
                          <div className="text-[10px] text-slate-400 font-mono text-center py-2">
                            No transactions in Needs bucket.
                          </div>
                        ) : (
                          aiData.needsWantsSavingsAI.needs.items.map((item, i) => (
                            <div key={item.id || i} className="p-2 bg-[var(--background-elevated)] border border-blue-500/15 rounded-lg space-y-0.5">
                              <div className="flex justify-between items-center text-xs gap-1.5">
                                <span className="font-medium text-[var(--foreground)] truncate">{item.title}</span>
                                <span className="font-mono font-bold text-blue-500 shrink-0">{formatCurrency(item.amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-[var(--foreground-muted)] font-mono">
                                <span>{item.date || 'Cycle'} • {item.category || 'Essential'}</span>
                                {item.reason && (
                                  <span className="text-blue-600 dark:text-blue-400 truncate max-w-[120px]" title={item.reason}>
                                    {item.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WANTS (30%) */}
                  <div className="p-3.5 bg-[var(--background-base)] border border-pink-500/30 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-pink-500 uppercase tracking-wider font-mono flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" /> Wants (30% Target)
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                        {aiData?.needsWantsSavingsAI?.wants?.status || 'Optimal'}
                      </span>
                    </div>
                    
                    <div className="text-xl font-bold text-[var(--foreground)] font-mono">
                      {formatCurrency(aiData?.needsWantsSavingsAI?.wants?.amount || 0)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[var(--foreground-muted)]">
                        <span>Actual Allocation</span>
                        <span>{aiData?.needsWantsSavingsAI?.wants?.percentage || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, aiData?.needsWantsSavingsAI?.wants?.percentage || 0)}%` }} 
                          className="h-full bg-pink-500 rounded-full transition-all duration-300" 
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--foreground-muted)] italic leading-tight">
                      {aiData?.needsWantsSavingsAI?.wants?.advice || "Discretionary lifestyle choices (Dining out, Entertainment, Shopping, Subscriptions)."}
                    </p>

                    {/* Classified Transactions List */}
                    <div className="pt-2 border-t border-[var(--border-default)] space-y-1.5">
                      <div className="text-[9px] font-mono font-bold text-[var(--foreground-muted)] uppercase">
                        Classified Items ({aiData?.needsWantsSavingsAI?.wants?.items?.length || 0}):
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                        {(aiData?.needsWantsSavingsAI?.wants?.items || []).length === 0 ? (
                          <div className="text-[10px] text-slate-400 font-mono text-center py-2">
                            No transactions in Wants bucket.
                          </div>
                        ) : (
                          aiData.needsWantsSavingsAI.wants.items.map((item, i) => (
                            <div key={item.id || i} className="p-2 bg-[var(--background-elevated)] border border-pink-500/15 rounded-lg space-y-0.5">
                              <div className="flex justify-between items-center text-xs gap-1.5">
                                <span className="font-medium text-[var(--foreground)] truncate">{item.title}</span>
                                <span className="font-mono font-bold text-pink-500 shrink-0">{formatCurrency(item.amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-[var(--foreground-muted)] font-mono">
                                <span>{item.date || 'Cycle'} • {item.category || 'Lifestyle'}</span>
                                {item.reason && (
                                  <span className="text-pink-600 dark:text-pink-400 truncate max-w-[120px]" title={item.reason}>
                                    {item.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SAVINGS (20%) */}
                  <div className="p-3.5 bg-[var(--background-base)] border border-emerald-500/30 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider font-mono flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" /> Savings (20% Target)
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {aiData?.needsWantsSavingsAI?.savings?.status || 'Supercharged'}
                      </span>
                    </div>
                    
                    <div className="text-xl font-bold text-[var(--foreground)] font-mono">
                      {formatCurrency(aiData?.needsWantsSavingsAI?.savings?.amount || 0)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[var(--foreground-muted)]">
                        <span>Actual Allocation</span>
                        <span>{aiData?.needsWantsSavingsAI?.savings?.percentage || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, aiData?.needsWantsSavingsAI?.savings?.percentage || 0)}%` }} 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--foreground-muted)] italic leading-tight">
                      {aiData?.needsWantsSavingsAI?.savings?.advice || "Wealth compounding (SIPs, Stocks, Savings pots, Emergency reserves)."}
                    </p>

                    {/* Classified Transactions List */}
                    <div className="pt-2 border-t border-[var(--border-default)] space-y-1.5">
                      <div className="text-[9px] font-mono font-bold text-[var(--foreground-muted)] uppercase">
                        Classified Items ({aiData?.needsWantsSavingsAI?.savings?.items?.length || 0}):
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                        {(aiData?.needsWantsSavingsAI?.savings?.items || []).length === 0 ? (
                          <div className="text-[10px] text-slate-400 font-mono text-center py-2">
                            No transactions in Savings bucket.
                          </div>
                        ) : (
                          aiData.needsWantsSavingsAI.savings.items.map((item, i) => (
                            <div key={item.id || i} className="p-2 bg-[var(--background-elevated)] border border-emerald-500/15 rounded-lg space-y-0.5">
                              <div className="flex justify-between items-center text-xs gap-1.5">
                                <span className="font-medium text-[var(--foreground)] truncate">{item.title}</span>
                                <span className="font-mono font-bold text-emerald-500 shrink-0">{formatCurrency(item.amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-[var(--foreground-muted)] font-mono">
                                <span>{item.date || 'Cycle'} • {item.category || 'Investment'}</span>
                                {item.reason && (
                                  <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]" title={item.reason}>
                                    {item.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Expense Categories Breakdown */}
            <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-4 rounded-2xl space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                All Expense Categories Breakdown
              </h3>
              <div className="space-y-2">
                {(data?.spendingCategories || []).map((cat, idx) => (
                  <div key={idx} className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-[var(--surface-active)]">
                          {getCategoryIconComponent(cat.category)}
                        </span>
                        <span className="text-xs font-semibold text-[var(--foreground)]">{cat.category}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[var(--foreground)]">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[var(--foreground-muted)]">
                        <span>{cat.count} transactions</span>
                        <span>{cat.percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div style={{ width: `${cat.percentage}%` }} className="h-full bg-indigo-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: STRUCTURE */}
        {activeTab === 'structure' && (
          <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[var(--foreground)]">Asset Distribution (Net Worth)</h3>
              <span className="text-[10px] font-mono text-purple-500 font-bold">{formatCurrency(data?.financialStructure?.totalAssetBase || 0)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-indigo-500 uppercase block font-bold">1. Liquid In-Hand</span>
                <span className="text-sm font-bold text-[var(--foreground)] font-mono block">{formatCurrency(data?.financialStructure?.liquidCapital?.amount || 0)}</span>
                <span className="text-[9px] text-[var(--foreground-muted)] block">Readily available cash ({data?.financialStructure?.liquidCapital?.percentage || 0}%)</span>
              </div>

              <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-emerald-500 uppercase block font-bold">2. Savings Pots</span>
                <span className="text-sm font-bold text-[var(--foreground)] font-mono block">{formatCurrency(data?.financialStructure?.savingsPots?.amount || 0)}</span>
                <span className="text-[9px] text-[var(--foreground-muted)] block">Goal pots & bank savings ({data?.financialStructure?.savingsPots?.percentage || 0}%)</span>
              </div>

              <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-purple-500 uppercase block font-bold">3. Stock Holdings</span>
                <span className="text-sm font-bold text-[var(--foreground)] font-mono block">{formatCurrency(data?.financialStructure?.stockEquity?.amount || 0)}</span>
                <span className="text-[9px] text-[var(--foreground-muted)] block">Equities & mutual funds ({data?.financialStructure?.stockEquity?.percentage || 0}%)</span>
              </div>

              <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-cyan-500 uppercase block font-bold">4. Receivables</span>
                <span className="text-sm font-bold text-[var(--foreground)] font-mono block">{formatCurrency(data?.financialStructure?.lendingReceivables?.amount || 0)}</span>
                <span className="text-[9px] text-[var(--foreground-muted)] block">Money lent to others ({data?.financialStructure?.lendingReceivables?.percentage || 0}%)</span>
              </div>
            </div>

            {/* Proportional Segmented Bar */}
            <div className="h-6 w-full rounded-xl overflow-hidden flex gap-1 p-1 bg-[var(--background-base)] border border-[var(--border-default)]">
              {(data?.financialStructure?.liquidCapital?.percentage || 0) > 0 && (
                <div 
                  style={{ width: `${data.financialStructure.liquidCapital.percentage}%` }} 
                  className="bg-indigo-600 rounded-lg transition-all h-full flex items-center justify-center text-[9px] text-white font-mono font-semibold"
                >
                  {data.financialStructure.liquidCapital.percentage > 8 && `${data.financialStructure.liquidCapital.percentage}%`}
                </div>
              )}
              {(data?.financialStructure?.savingsPots?.percentage || 0) > 0 && (
                <div 
                  style={{ width: `${data.financialStructure.savingsPots.percentage}%` }} 
                  className="bg-emerald-500 rounded-lg transition-all h-full flex items-center justify-center text-[9px] text-white font-mono font-semibold"
                >
                  {data.financialStructure.savingsPots.percentage > 8 && `${data.financialStructure.savingsPots.percentage}%`}
                </div>
              )}
              {(data?.financialStructure?.stockEquity?.percentage || 0) > 0 && (
                <div 
                  style={{ width: `${data.financialStructure.stockEquity.percentage}%` }} 
                  className="bg-purple-500 rounded-lg transition-all h-full flex items-center justify-center text-[9px] text-white font-mono font-semibold"
                >
                  {data.financialStructure.stockEquity.percentage > 8 && `${data.financialStructure.stockEquity.percentage}%`}
                </div>
              )}
              {(data?.financialStructure?.lendingReceivables?.percentage || 0) > 0 && (
                <div 
                  style={{ width: `${data.financialStructure.lendingReceivables.percentage}%` }} 
                  className="bg-cyan-500 rounded-lg transition-all h-full flex items-center justify-center text-[9px] text-white font-mono font-semibold"
                >
                  {data.financialStructure.lendingReceivables.percentage > 8 && `${data.financialStructure.lendingReceivables.percentage}%`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: GEMINI AI */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="p-4 bg-[var(--background-elevated)] border border-purple-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-[var(--foreground)]">Gemini 2050 AI</span>
                </div>
                <button
                  onClick={fetchAiIntelligence}
                  disabled={aiLoading}
                  className="px-2.5 py-1 text-[10px] font-semibold bg-purple-600 text-white rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
                  {aiLoading ? 'Thinking...' : 'Refresh'}
                </button>
              </div>

              {aiLoading && (
                <div className="py-6 text-center space-y-2">
                  <Bot className="w-8 h-8 text-purple-500 mx-auto animate-bounce" />
                  <p className="text-[11px] text-purple-500 font-mono font-semibold">
                    {aiThinkingStep === 0 && 'Clustering transaction vectors...'}
                    {aiThinkingStep === 1 && 'Analyzing 50/30/20 runway...'}
                    {aiThinkingStep === 2 && 'Generating 2050 wealth hacks...'}
                  </p>
                </div>
              )}

              {!aiLoading && aiData && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-[var(--foreground)] leading-relaxed bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl">
                    {aiData.executiveSummary}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl">
                      <span className="text-[9px] font-mono text-[var(--foreground-muted)] uppercase block">Health Score</span>
                      <span className="text-lg font-bold text-emerald-500 font-mono">{aiData.financialHealthScore || 85}/100</span>
                    </div>

                    <div className="p-2.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl">
                      <span className="text-[9px] font-mono text-[var(--foreground-muted)] uppercase block">Daily Safe Budget</span>
                      <span className="text-sm font-bold text-indigo-500 font-mono block mt-0.5">{formatCurrency(aiData.burnRateAnalysis?.dailySafeBudget || 0)}/d</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[var(--foreground)]">2050 Savings Strategies</span>
                    {(aiData.savingsOpportunities || []).map((opp, idx) => (
                      <div key={idx} className="p-2.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-[var(--foreground)]">{opp.title}</span>
                          <span className="text-emerald-500 font-mono">+{formatCurrency(opp.potentialMonthlySavings)}/mo</span>
                        </div>
                        <p className="text-[10px] text-[var(--foreground-muted)]">{opp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Salary Modal */}
      <AnimatePresence>
        {salaryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer z-0"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-[var(--background-elevated)] border-t border-[var(--border-default)] rounded-t-3xl p-5 relative z-10 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--foreground)]">Log Capital Inflow</h3>
                <button onClick={() => setSalaryModalOpen(false)}><X className="w-4 h-4 text-[var(--foreground-muted)]" /></button>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl">
                <button
                  type="button"
                  onClick={() => setSalaryType('SALARY')}
                  className={`py-1.5 text-xs font-semibold rounded-lg ${salaryType === 'SALARY' ? 'bg-indigo-600 text-white' : 'text-[var(--foreground-muted)]'}`}
                >
                  Salary
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryType('BONUS')}
                  className={`py-1.5 text-xs font-semibold rounded-lg ${salaryType === 'BONUS' ? 'bg-indigo-600 text-white' : 'text-[var(--foreground-muted)]'}`}
                >
                  Bonus
                </button>
              </div>

              <form onSubmit={handleAddSalary} className="space-y-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={salAmount}
                  onChange={(e) => setSalAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full px-3.5 py-2.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--foreground)]"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={salMonth}
                    onChange={(e) => setSalMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--foreground)]"
                  >
                    {monthsList.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                  </select>
                  <input
                    type="number"
                    value={salYear}
                    onChange={(e) => setSalYear(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--foreground)]"
                  />
                </div>

                {salError && <p className="text-xs text-rose-500">{salError}</p>}

                <button
                  type="submit"
                  disabled={salLoading}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  {salLoading ? 'Saving...' : 'Save Inflow'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Presets Drawer */}
      <AnimatePresence>
        {presetsDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPresetsDrawerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer z-0"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-[var(--background-elevated)] border-t border-[var(--border-default)] rounded-t-3xl p-5 relative z-10 space-y-3 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--foreground)]">Quick Presets</h3>
                <button onClick={() => setPresetsDrawerOpen(false)}><X className="w-4 h-4 text-[var(--foreground-muted)]" /></button>
              </div>

              <div className="space-y-2">
                {getDynamicQuickAddPresets().map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEntryToEdit({
                        amount: preset.amount,
                        type: preset.type,
                        title: preset.title,
                        description: `Quick added ${preset.title}`,
                        useSalaryBalance: preset.type === 'SPENDING'
                      });
                      setPresetsDrawerOpen(false);
                      setEntryModalOpen(true);
                    }}
                    className="w-full p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl flex items-center justify-between text-left"
                  >
                    <div>
                      <span className="text-xs font-bold text-[var(--foreground)] block">{preset.title}</span>
                      <span className="text-[10px] text-[var(--foreground-muted)]">{preset.type}</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-[var(--foreground)]">{formatCurrency(preset.amount)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebration Modal */}
      <AnimatePresence>
        {salaryCelebrationOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryCelebrationOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-xs bg-[var(--background-elevated)] border border-emerald-500/30 rounded-2xl p-5 text-center z-10 shadow-2xl space-y-3"
            >
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Capital Logged!</h2>
              <p className="text-xs text-emerald-500 font-mono">Inflow added to active cycle balance.</p>
              <button
                type="button"
                onClick={() => setSalaryCelebrationOpen(false)}
                className="w-full py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl"
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
