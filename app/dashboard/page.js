'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import DashboardMobile from '@/components/DashboardMobile';
import Navbar from '@/components/Navbar';
import TransactionModal from '@/components/TransactionModal';
import AiQuickAddInput from '@/components/AiQuickAddInput';
import Ai503020PromptInput from '@/components/Ai503020PromptInput';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
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
  Filter,
  Target,
  Pencil,
  Flame,
  CheckCircle2,
  RefreshCw,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  HeartPulse,
  Film,
  BookOpen,
  PieChart,
  ShieldCheck,
  TrendingDown,
  Activity,
  Layers,
  BarChart3,
  Cpu,
  Coins,
  Bot,
  Info,
  Banknote,
  Landmark
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

// In-memory cache for instant zero-flash navigation
let cachedDashboardData = null;
let cachedAiIntelligence = null;

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();

  // Active Dashboard Sub-Tab
  const [activeTab, setActiveTab] = useState('overview'); // overview, daily, categories, structure, ai

  // Primary Data State
  const [data, setData] = useState(cachedDashboardData);
  const [dataLoading, setDataLoading] = useState(!cachedDashboardData);
  const [filter, setFilter] = useState('current'); // current, last, last3, last6, custom

  // Custom Date Range Pickers
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // AI Intelligence States
  const [aiData, setAiData] = useState(cachedAiIntelligence);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiThinkingStep, setAiThinkingStep] = useState(0);
  const [aiRemainingRefreshes, setAiRemainingRefreshes] = useState(5);
  const [aiCustomPromptNotes, setAiCustomPromptNotes] = useState('');
  const [aiQuotaError, setAiQuotaError] = useState('');

  // Client-side Ledger Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Expanded Daily & AI Item Rows State
  const [expandedDays, setExpandedDays] = useState({});
  const [expandedAiBucket, setExpandedAiBucket] = useState({ needs: true, wants: true, savings: true });

  // Modals & Drawers State
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [presetsDrawerOpen, setPresetsDrawerOpen] = useState(false);
  const [salaryCelebrationOpen, setSalaryCelebrationOpen] = useState(false);

  // Forms State
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [salAmount, setSalAmount] = useState('');
  const [salMonth, setSalMonth] = useState(currentMonth);
  const [salYear, setSalYear] = useState(currentYear);
  const [salError, setSalError] = useState('');
  const [salLoading, setSalLoading] = useState(false);

  // Edit / Repayment States
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [parentLending, setParentLending] = useState(null);
  const [salaryType, setSalaryType] = useState('SALARY');

  // Mobile viewport detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch Dashboard Aggregated Data
  const fetchDashboardData = async () => {
    if (!user) return;
    if (!cachedDashboardData) setDataLoading(true);
    try {
      let url = `/api/dashboard?filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
        cachedDashboardData = payload;
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch AI 2050 Intelligence & 50/30/20 Grouping
  const fetchAiIntelligence = async (forceRefresh = false, userPrompt = '') => {
    if (!user) return;
    setAiLoading(true);
    setAiQuotaError('');
    setAiThinkingStep(0);

    const stepInterval = setInterval(() => {
      setAiThinkingStep(prev => (prev < 2 ? prev + 1 : prev));
    }, 900);

    try {
      const res = await fetch('/api/dashboard/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter, forceRefresh, userPrompt })
      });

      const payload = await res.json();
      if (res.ok && payload.intelligence) {
        setAiData(payload.intelligence);
        if (payload.remainingRefreshes !== undefined) {
          setAiRemainingRefreshes(payload.remainingRefreshes);
        }
        if (payload.customPromptNotes) {
          setAiCustomPromptNotes(payload.customPromptNotes);
        }
        cachedAiIntelligence = payload.intelligence;
      } else if (res.status === 429) {
        setAiQuotaError(payload.error || 'Daily AI 50/30/20 refresh limit of 5 reached. Quota resets tomorrow.');
        if (payload.remainingRefreshes !== undefined) {
          setAiRemainingRefreshes(payload.remainingRefreshes);
        }
      }
    } catch (err) {
      console.error('Error fetching AI intelligence:', err);
    } finally {
      clearInterval(stepInterval);
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchAiIntelligence(false); // Immediately load cached DB AI summary
    }
  }, [user, filter]);

  // Toggle Day Accordion
  const toggleDayExpansion = (dateKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // Handle Salary Submit
  const handleAddSalary = async (e) => {
    e.preventDefault();
    if (!salAmount || parseFloat(salAmount) <= 0) {
      setSalError(`Please enter a valid ${salaryType === 'SALARY' ? 'salary' : 'bonus'} amount.`);
      return;
    }
    setSalError('');
    setSalLoading(true);

    try {
      const endpoint = salaryType === 'SALARY' ? '/api/salary' : '/api/bonus';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(salAmount),
          month: parseInt(salMonth),
          year: parseInt(salYear),
        }),
      });

      if (res.ok) {
        setSalAmount('');
        setSalaryModalOpen(false);
        if (salaryType === 'SALARY' && user?.notifSalary !== false) {
          setSalaryCelebrationOpen(true);
        }
        await fetchDashboardData();
        fetchAiIntelligence();
      } else {
        const errData = await res.json();
        setSalError(errData.error || `Failed to add ${salaryType === 'SALARY' ? 'salary' : 'bonus'}.`);
      }
    } catch (err) {
      setSalError('Network error. Please try again.');
    } finally {
      setSalLoading(false);
    }
  };

  // Quick Delete Entry
  const handleDeleteEntry = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/entries?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Currency Formatter
  const formatCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(val || 0);
  };

  // Dynamic Quick Presets generated from user's actual latest transactions
  const getDynamicQuickAddPresets = () => {
    const defaultPresets = [
      { label: 'Dinner', icon: '🍔', title: 'Dinner', amount: 250, type: 'SPENDING', desc: 'Dining / Food' },
      { label: 'Coffee', icon: '☕', title: 'Coffee', amount: 50, type: 'SPENDING', desc: 'Daily caffeine run' },
      { label: 'Cab/Fuel', icon: '🚗', title: 'Cab / Fuel', amount: 150, type: 'SPENDING', desc: 'Transport ride' },
      { label: 'Groceries', icon: '🛒', title: 'Groceries', amount: 500, type: 'SPENDING', desc: 'Daily essentials' },
      { label: 'SIP Invest', icon: '📈', title: 'SIP Investment', amount: 1000, type: 'SAVINGS', desc: 'Invested savings / SIP' },
      { label: 'Lent Money', icon: '💸', title: 'Lent to Friend', amount: 500, type: 'LENDING', desc: 'Lending receivable' },
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
          label: title.length > 14 ? title.substring(0, 12) + '..' : title,
          icon,
          title,
          amount: parseFloat(t.amount || 0),
          type,
          desc: t.description || `Recent ${type.toLowerCase()} entry`
        });

        if (dynamicPresets.length >= 7) break;
      }
    }

    return dynamicPresets.length > 0 ? dynamicPresets : defaultPresets;
  };

  const monthsList = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  // Category Icon Resolver
  const getCategoryIconComponent = (catName) => {
    switch (catName) {
      case 'Food & Dining': return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'Transport & Commute': return <Car className="w-4 h-4 text-blue-500" />;
      case 'Housing & Utilities': return <Home className="w-4 h-4 text-purple-500" />;
      case 'Shopping & Lifestyle': return <ShoppingBag className="w-4 h-4 text-pink-500" />;
      case 'Subscriptions & Tech': return <Zap className="w-4 h-4 text-cyan-500" />;
      case 'Health & Wellness': return <HeartPulse className="w-4 h-4 text-emerald-500" />;
      case 'Entertainment & Leisure': return <Film className="w-4 h-4 text-rose-500" />;
      case 'Investments & Savings': return <TrendingUp className="w-4 h-4 text-indigo-500" />;
      case 'Education & Learning': return <BookOpen className="w-4 h-4 text-teal-500" />;
      default: return <PieChart className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-deep)]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <DashboardMobile
          user={user}
          logout={logout}
          data={data}
          dataLoading={dataLoading}
          filter={filter}
          setFilter={setFilter}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          salaryModalOpen={salaryModalOpen}
          setSalaryModalOpen={setSalaryModalOpen}
          entryModalOpen={entryModalOpen}
          setEntryModalOpen={setEntryModalOpen}
          presetsDrawerOpen={presetsDrawerOpen}
          setPresetsDrawerOpen={setPresetsDrawerOpen}
          salaryCelebrationOpen={salaryCelebrationOpen}
          setSalaryCelebrationOpen={setSalaryCelebrationOpen}
          salAmount={salAmount}
          setSalAmount={setSalAmount}
          salMonth={salMonth}
          setSalMonth={setSalMonth}
          salYear={salYear}
          setSalYear={setSalYear}
          salError={salError}
          setSalError={setSalError}
          salLoading={salLoading}
          handleAddSalary={handleAddSalary}
          handleDeleteEntry={handleDeleteEntry}
          formatCurrency={formatCurrency}
          getPresetsList={() => quickPresets}
          monthsList={monthsList}
          entryToEdit={entryToEdit}
          setEntryToEdit={setEntryToEdit}
          salaryType={salaryType}
          setSalaryType={setSalaryType}
          parentLending={parentLending}
          setParentLending={setParentLending}
          aiData={aiData}
          aiLoading={aiLoading}
          aiThinkingStep={aiThinkingStep}
          aiRemainingRefreshes={aiRemainingRefreshes}
          aiCustomPromptNotes={aiCustomPromptNotes}
          aiQuotaError={aiQuotaError}
          fetchAiIntelligence={fetchAiIntelligence}
        />
        <TransactionModal
          isOpen={entryModalOpen}
          onClose={() => {
            setEntryModalOpen(false);
            setEntryToEdit(null);
            setParentLending(null);
          }}
          entryToEdit={entryToEdit}
          parentLending={parentLending}
          onSuccess={fetchDashboardData}
          user={user}
          monthsList={monthsList}
          formatCurrency={formatCurrency}
        />
      </>
    );
  }

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const pData = payload[0]?.payload;
      return (
        <div className="bg-[#0f1117]/95 dark:bg-[#0f1117]/95 backdrop-blur-xl border border-white/15 dark:border-white/15 p-3.5 rounded-xl shadow-2xl text-white text-xs space-y-2 min-w-[170px]">
          <div className="text-[10px] font-mono text-slate-400 border-b border-white/10 pb-1.5 flex justify-between items-center">
            <span>{pData?.fullDate || label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10">{pData?.dayName || 'Day'}</span>
          </div>
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium text-[11px]">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Inflow:
              </span>
              <span className="font-mono font-semibold">{formatCurrency(pData?.Revenue || 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-rose-400 font-medium text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Expenses:
              </span>
              <span className="font-mono font-semibold">{formatCurrency(pData?.Expenses || 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Net Balance:
              </span>
              <span className="font-mono font-semibold text-emerald-400">{formatCurrency(pData?.Balance || 0)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative flex flex-col justify-between min-h-screen bg-[var(--background-deep)] text-[var(--foreground)] app-sidebar-offset overflow-x-hidden transition-colors duration-200">
      <Navbar />

      {/* Main Cockpit Panel */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 space-y-6 overflow-x-hidden">
        
        {/* TOP LEVEL HEADER: Title, Date Boundaries & Global Pill Navigation */}
        <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm backdrop-blur-md space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-500 dark:text-indigo-400 text-[10px] font-mono tracking-widest rounded-md uppercase font-semibold">
                  2050 AI Cockpit
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-[var(--foreground-muted)] font-mono uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Financial Intelligence
              </h1>
              <div className="text-[var(--foreground-muted)] text-xs mt-1 font-normal flex flex-wrap items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Cycle:</span>
                {dataLoading ? (
                  <span className="inline-block w-28 h-3.5 bg-slate-500/10 rounded animate-pulse" />
                ) : data?.startDate ? (
                  <span className="font-mono text-[11px] font-medium text-[var(--foreground)]">
                    {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className="mx-1.5 opacity-40">→</span>
                    {new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-sans">
                      Cycle Day: {data.cycleDate}
                    </span>
                  </span>
                ) : (
                  <span>Active</span>
                )}
              </div>
            </div>

            {/* Quick Actions & Date Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-[var(--background-base)] border border-[var(--border-default)] hover:border-indigo-500/40 rounded-xl px-3.5 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium cursor-pointer transition-all shadow-sm"
              >
                <option value="current">Current Cycle</option>
                <option value="last">Last Cycle</option>
                <option value="last3">Last 3 Months</option>
                <option value="last6">Last 6 Months</option>
                <option value="custom">Custom Range</option>
              </select>

              {filter === 'custom' && (
                <div className="flex items-center gap-1.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl px-3 py-1.5 text-xs">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-transparent text-[var(--foreground)] focus:outline-none cursor-pointer text-xs"
                  />
                  <span className="text-[var(--foreground-muted)]">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-transparent text-[var(--foreground)] focus:outline-none cursor-pointer text-xs"
                    onBlur={fetchDashboardData}
                  />
                </div>
              )}

              <button
                onClick={() => setSalaryModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Inflow
              </button>

              <button
                onClick={() => setEntryModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Entry
              </button>

              <button
                onClick={fetchAiIntelligence}
                disabled={aiLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Refresh Gemini 2050 Intelligence & 50/30/20 Grouping"
              >
                <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin text-purple-500' : ''}`} />
                <span>{aiLoading ? 'Analyzing...' : 'AI Analyze'}</span>
              </button>
            </div>
          </div>

          {/* 🔮 AI-POWERED NATURAL LANGUAGE QUICK-ADD & DYNAMIC PRESETS */}
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
          />

          {/* Pill Navigation Tabs (Clean Wrapping without horizontal overflow) */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-default)] pt-4 select-none">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'daily', label: 'Daily Ledger', icon: Calendar, badge: data?.dailySpending?.length },
              { id: 'categories', label: 'Spending & AI 50/30/20', icon: Layers, isAi: true },
              { id: 'structure', label: 'Asset Distribution', icon: Coins },
              { id: 'ai', label: 'Gemini 2050 AI Engine', icon: Bot, isSparkle: true }
            ].map((tab) => {
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
                  className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 shadow-sm font-semibold'
                      : 'bg-transparent text-[var(--foreground-muted)] border-transparent hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.isSparkle || tab.isAi ? 'text-purple-500' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-[var(--surface-active)] font-mono">
                      {tab.badge}
                    </span>
                  )}
                  {(tab.isSparkle || tab.isAi) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TOP KPI SUMMARY METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Revenue / Inflow */}
          <SpotlightCard 
            className="p-5 flex flex-col justify-between min-h-[130px]"
            spotlightColor="rgba(99, 102, 241, 0.12)"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                <span>Total Inflow</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> +14.2%
                </span>
              </div>
              <div className="mt-2">
                {dataLoading ? (
                  <div className="w-28 h-7 bg-slate-500/10 rounded animate-pulse" />
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    {formatCurrency(data?.kpis?.salaryTotal || 0)}
                  </h3>
                )}
              </div>
            </div>
            <div className="text-[10px] text-[var(--foreground-muted)] mt-2 flex items-center justify-between">
              <span>Salary & Bonuses</span>
              <span className="font-mono text-indigo-500">Active</span>
            </div>
          </SpotlightCard>

          {/* Expenses / Spending */}
          <SpotlightCard 
            className="p-5 flex flex-col justify-between min-h-[130px]"
            spotlightColor="rgba(244, 63, 94, 0.12)"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                <span>Expenses</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border flex items-center gap-0.5 ${
                  (data?.trends?.spendingDeltaPct || 0) <= 0 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}>
                  {(data?.trends?.spendingDeltaPct || 0) <= 0 ? (
                    <><TrendingDown className="w-2.5 h-2.5" /> {Math.abs(data?.trends?.spendingDeltaPct || 6.2)}%</>
                  ) : (
                    <><TrendingUp className="w-2.5 h-2.5" /> +{data?.trends?.spendingDeltaPct}%</>
                  )}
                </span>
              </div>
              <div className="mt-2">
                {dataLoading ? (
                  <div className="w-28 h-7 bg-slate-500/10 rounded animate-pulse" />
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight text-rose-500">
                    {formatCurrency(data?.kpis?.spending || 0)}
                  </h3>
                )}
              </div>
            </div>
            <div className="text-[10px] text-[var(--foreground-muted)] mt-2 flex items-center justify-between">
              <span>Cycle Outflow</span>
              <span className="font-mono text-rose-400">Total Spent</span>
            </div>
          </SpotlightCard>

          {/* Active Liquid Salary Balance */}
          <SpotlightCard 
            className="p-5 flex flex-col justify-between min-h-[130px]"
            spotlightColor="rgba(16, 185, 129, 0.14)"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                <span>Active Balance</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-0.5">
                  <Activity className="w-2.5 h-2.5" /> Liquid
                </span>
              </div>
              <div className="mt-2">
                {dataLoading ? (
                  <div className="w-28 h-7 bg-slate-500/10 rounded animate-pulse" />
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight text-emerald-500">
                    {formatCurrency(data?.kpis?.salaryBalance || 0)}
                  </h3>
                )}
              </div>
            </div>
            <div className="text-[10px] text-[var(--foreground-muted)] mt-2 flex items-center justify-between">
              <span>Remaining Capital</span>
              <span className="font-mono text-emerald-500">Safe Run</span>
            </div>
          </SpotlightCard>

          {/* Net Savings & SIPs */}
          <SpotlightCard 
            className="p-5 flex flex-col justify-between min-h-[130px]"
            spotlightColor="rgba(139, 92, 246, 0.12)"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                <span>Savings & SIP</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> +18.9%
                </span>
              </div>
              <div className="mt-2">
                {dataLoading ? (
                  <div className="w-28 h-7 bg-slate-500/10 rounded animate-pulse" />
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight text-purple-500">
                    {formatCurrency(data?.kpis?.savings || 0)}
                  </h3>
                )}
              </div>
            </div>
            <div className="text-[10px] text-[var(--foreground-muted)] mt-2 flex items-center justify-between">
              <span>Invested Capital</span>
              <span className="font-mono text-purple-400">Wealth Growth</span>
            </div>
          </SpotlightCard>

        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* FINANCIAL TRENDS MULTI-SERIES AREA CHART */}
            <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" /> Financial Trends & Trajectory
                  </h2>
                  <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5 font-normal">
                    Multi-dimensional Cash Inflow, Burn Outflow, and Cumulative Liquidity
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-indigo-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Revenue / Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Net Balance
                  </span>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                {dataLoading ? (
                  <div className="h-full w-full bg-slate-500/10 rounded-xl animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.trendSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradientExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.20}/>
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradientBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.20}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, '')}
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="Revenue" 
                        stroke="#6366F1" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#gradientRevenue)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Expenses" 
                        stroke="#F43F5E" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#gradientExpenses)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Balance" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#gradientBalance)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* DUAL WIDGET SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT 6-COLS: Categories Performance Matrix with Segmented LED Bars */}
              <div className="lg:col-span-6 bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" /> Spending Performance
                    </h3>
                    <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider font-mono mt-0.5">
                      Category allocation & velocity
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('categories')}
                    className="text-[11px] font-medium text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    View AI 50/30/20 &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  {(!data?.spendingCategories || data.spendingCategories.length === 0) ? (
                    <div className="py-8 text-center text-[var(--foreground-muted)] text-xs">
                      No expense categories logged this cycle yet.
                    </div>
                  ) : (
                    data.spendingCategories.slice(0, 5).map((cat, idx) => (
                      <div key={idx} className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1.5 rounded-lg bg-[var(--surface-active)] shrink-0">
                              {getCategoryIconComponent(cat.category)}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-[var(--foreground)] truncate block">
                                {cat.category}
                              </span>
                              <span className="text-[10px] text-[var(--foreground-muted)]">
                                {cat.count} transactions
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-[var(--foreground)] block">
                              {formatCurrency(cat.amount)}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-indigo-500">
                              {cat.percentage}% of total
                            </span>
                          </div>
                        </div>

                        {/* Segmented LED Progress Matrix (20 segments) */}
                        <div className="flex items-center gap-0.5 pt-1">
                          {Array.from({ length: 20 }).map((_, sIdx) => {
                            const isLit = sIdx < cat.segments;
                            return (
                              <div
                                key={sIdx}
                                className={`h-2 flex-1 rounded-xs transition-all ${
                                  isLit 
                                    ? 'bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)]' 
                                    : 'bg-slate-200 dark:bg-slate-800'
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT 6-COLS: CRYSTAL-CLEAR ASSET DISTRIBUTION (Net Worth & Savings) */}
              <div className="lg:col-span-6 bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                      <Coins className="w-4 h-4 text-purple-500" /> Asset Distribution & Wealth Structure
                    </h3>
                    <p className="text-[10px] text-[var(--foreground-muted)] font-mono mt-0.5">
                      Where your capital is stored, invested, and receivable
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('structure')}
                    className="text-[11px] font-medium text-purple-500 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    Deep View &rarr;
                  </button>
                </div>

                {/* Total Asset Base Banner */}
                <div className="p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Landmark className="w-5 h-5 text-purple-500" />
                    <div>
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase block">Total Net Assets</span>
                      <span className="text-base font-bold font-mono text-[var(--foreground)]">
                        {formatCurrency(data?.financialStructure?.totalAssetBase || 0)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500 border border-purple-500/25">
                    Net Worth Base
                  </span>
                </div>

                {/* 4 Clear Explanation Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-500 text-xs font-semibold">
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Liquid In-Hand</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--foreground)] font-mono block">
                      {formatCurrency(data?.financialStructure?.liquidCapital?.amount || 0)}
                    </span>
                    <span className="text-[9px] text-[var(--foreground-muted)] block">
                      Checking account & readily spendable capital ({data?.financialStructure?.liquidCapital?.percentage || 0}%)
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold">
                      <PiggyBank className="w-3.5 h-3.5" />
                      <span>Savings Pots</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--foreground)] font-mono block">
                      {formatCurrency(data?.financialStructure?.savingsPots?.amount || 0)}
                    </span>
                    <span className="text-[9px] text-[var(--foreground-muted)] block">
                      Locked savings pots & emergency reserves ({data?.financialStructure?.savingsPots?.percentage || 0}%)
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-500 text-xs font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Stock Equity</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--foreground)] font-mono block">
                      {formatCurrency(data?.financialStructure?.stockEquity?.amount || 0)}
                    </span>
                    <span className="text-[9px] text-[var(--foreground-muted)] block">
                      Live valuation of equity & mutual funds ({data?.financialStructure?.stockEquity?.percentage || 0}%)
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-500 text-xs font-semibold">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Receivables</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--foreground)] font-mono block">
                      {formatCurrency(data?.financialStructure?.lendingReceivables?.amount || 0)}
                    </span>
                    <span className="text-[9px] text-[var(--foreground-muted)] block">
                      Outstanding debt owed back by friends ({data?.financialStructure?.lendingReceivables?.percentage || 0}%)
                    </span>
                  </div>
                </div>

                {/* Proportional Segmented Bar */}
                <div className="space-y-1 pt-1">
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
              </div>

            </div>

            {/* RECENT PASSBOOK LEDGER TABLE */}
            <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" /> Recent Transactions Audit
                  </h3>
                  <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider font-mono mt-0.5">
                    Live chronological ledger feed
                  </p>
                </div>
                <Link
                  href="/transactions"
                  className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  Full Passbook <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Table */}
              {dataLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-12 bg-slate-500/10 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (() => {
                const filtered = (data?.recentTransactions || []).filter(t => {
                  const title = t.title || '';
                  const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
                  const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
                  return matchesSearch && matchesType;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-[var(--foreground-muted)]">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No transactions match your search filter.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] text-[var(--foreground-muted)] text-[10px] font-mono uppercase tracking-wider">
                          <th className="pb-3">Transaction</th>
                          <th className="pb-3">Category</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3 text-right">Amount</th>
                          <th className="pb-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)]">
                        {filtered.map((entry) => {
                          const isOutflow = entry.type === 'SPENDING' || entry.type === 'LENDING';
                          return (
                            <tr key={entry.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                              <td className="py-3 pr-3 text-[var(--foreground)] font-medium">
                                <div className="flex items-center gap-2.5">
                                  <span className="p-1.5 rounded-lg bg-[var(--surface-active)] shrink-0">
                                    {getCategoryIconComponent(entry.category)}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-[var(--foreground)]">{entry.title}</span>
                                      {entry.isAiGenerated && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 font-mono">
                                          <Sparkles className="w-2 h-2" /> AI
                                        </span>
                                      )}
                                    </div>
                                    {entry.description && (
                                      <div className="text-[10px] text-[var(--foreground-muted)] truncate max-w-[180px] mt-0.5">{entry.description}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-[11px] text-[var(--foreground-muted)]">
                                {entry.category}
                              </td>
                              <td className="py-3 pr-3">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono border uppercase tracking-wider ${
                                  entry.type === 'SPENDING' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                  entry.type === 'SAVINGS' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                  entry.type === 'LENDING' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                  'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                }`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="py-3 pr-3 text-[11px] text-[var(--foreground-muted)] font-mono">
                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </td>
                              <td className={`py-3 pr-3 text-right font-mono font-semibold text-xs sm:text-sm ${
                                isOutflow ? 'text-rose-500' : 'text-emerald-500'
                              }`}>
                                {isOutflow ? '-' : '+'}{formatCurrency(entry.amount)}
                              </td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEntryToEdit(entry);
                                      setEntryModalOpen(true);
                                    }}
                                    className="p-1.5 text-[var(--foreground-muted)] hover:text-indigo-500 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-1.5 text-[var(--foreground-muted)] hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* TAB 2: DAILY BREAKDOWN ROWS */}
        {activeTab === 'daily' && (
          <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" /> Daily Spending Ledger & Burn Breakdown
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Day-by-day expenditure audit with expandable transaction logs
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--foreground-muted)]">
                  Total Active Days: <strong className="text-[var(--foreground)]">{data?.dailySpending?.length || 0}</strong>
                </span>
              </div>
            </div>

            {/* Day by Day Cards List */}
            <div className="space-y-3">
              {(!data?.dailySpending || data.dailySpending.length === 0) ? (
                <div className="py-12 text-center text-[var(--foreground-muted)] text-xs">
                  No days recorded in this cycle range yet.
                </div>
              ) : (
                data.dailySpending.map((day) => {
                  const isExpanded = expandedDays[day.date];
                  const isZeroSpend = day.spending === 0;
                  const isHighSpend = day.spending > 100;

                  return (
                    <div
                      key={day.date}
                      className="bg-[var(--background-base)] border border-[var(--border-default)] hover:border-indigo-500/30 rounded-2xl p-4 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isZeroSpend 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25' 
                              : isHighSpend 
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/25' 
                              : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/25'
                          }`}>
                            {day.dayName}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--foreground)]">
                                {day.fullDate}
                              </span>
                              {isZeroSpend ? (
                                <span className="px-2 py-0.2 text-[9px] font-mono font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  <Flame className="w-2.5 h-2.5" /> ZERO SPEND
                                </span>
                              ) : isHighSpend ? (
                                <span className="px-2 py-0.2 text-[9px] font-mono font-semibold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  HIGH BURN
                                </span>
                              ) : (
                                <span className="px-2 py-0.2 text-[9px] font-mono font-semibold rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                                  CONTROLLED
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[var(--foreground-muted)] block mt-0.5">
                              {day.count} transaction{day.count !== 1 ? 's' : ''} logged
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-[var(--foreground-muted)] block uppercase">Daily Spend</span>
                            <span className={`text-base font-bold font-mono ${isZeroSpend ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {formatCurrency(day.spending)}
                            </span>
                          </div>

                          <button
                            onClick={() => toggleDayExpansion(day.date)}
                            className="p-2 rounded-xl bg-[var(--surface-active)] hover:bg-indigo-500/20 text-[var(--foreground)] transition-all cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Transaction Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="pt-3 mt-3 border-t border-[var(--border-default)] space-y-2 overflow-hidden"
                          >
                            {day.transactions.length === 0 ? (
                              <p className="text-xs text-[var(--foreground-muted)] italic py-1">No transaction line items for this date.</p>
                            ) : (
                              day.transactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--background-elevated)] border border-[var(--border-default)] text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="p-1.5 rounded-lg bg-[var(--surface-active)] shrink-0">
                                      {getCategoryIconComponent(tx.category)}
                                    </span>
                                    <div className="min-w-0">
                                      <span className="font-semibold text-[var(--foreground)] truncate block">{tx.title}</span>
                                      <span className="text-[10px] text-[var(--foreground-muted)]">{tx.category}</span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`font-mono font-bold ${tx.type === 'SPENDING' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                      {tx.type === 'SPENDING' ? '-' : '+'}{formatCurrency(tx.amount)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SPENDING & AI-POWERED 50/30/20 GROUPING */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            
            {/* AI 50/30/20 Grouping Header & Interactive Refinement Capsule */}
            <div className="bg-[var(--background-elevated)] border border-purple-500/30 p-5 sm:p-6 rounded-2xl shadow-sm space-y-5">
              
              {/* Interactive AI Refinement Prompt Bar (Like Quick Add) */}
              <Ai503020PromptInput
                onSubmitPrompt={(userPrompt) => fetchAiIntelligence(true, userPrompt)}
                onDirectRefresh={() => fetchAiIntelligence(true)}
                isLoading={aiLoading}
                remainingRefreshes={aiRemainingRefreshes}
                maxDailyRefreshes={5}
              />

              {/* Quota Error Alert */}
              {aiQuotaError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center justify-between gap-2.5 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{aiQuotaError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiQuotaError('')}
                    className="text-rose-500 hover:text-rose-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Active AI Custom Rule Badge */}
              {aiCustomPromptNotes && (
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs text-[var(--foreground)]">
                  <div className="flex items-center gap-2 truncate mr-3">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="text-[11px] text-[var(--foreground-muted)] truncate">
                      Active User Prompt Override: <strong className="text-purple-600 dark:text-purple-400 font-medium">&ldquo;{aiCustomPromptNotes}&rdquo;</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchAiIntelligence(true, 'RESET_TO_DEFAULT')}
                    disabled={aiLoading}
                    className="text-[11px] font-mono text-purple-600 dark:text-purple-400 hover:underline font-semibold shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    Reset to Standard
                  </button>
                </div>
              )}

              {/* AI Verdict Banner */}
              {aiData?.needsWantsSavingsAI?.aiVerdict && (
                <div className="p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-500/20 rounded-xl text-xs text-[var(--foreground)] flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-purple-500 shrink-0" />
                  <span><strong>AI Verdict:</strong> {aiData.needsWantsSavingsAI.aiVerdict}</span>
                </div>
              )}

              {/* Full Shimmering AI Skeletons during initial / background loading */}
              {aiLoading && !aiData?.needsWantsSavingsAI ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                  {/* Needs Skeleton */}
                  <div className="p-4 bg-[var(--background-base)] border border-blue-500/20 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-blue-500/20 rounded-md" />
                      <div className="h-4 w-16 bg-blue-500/10 rounded-full" />
                    </div>
                    <div className="h-8 w-32 bg-slate-200 dark:bg-white/10 rounded-md" />
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="h-3 w-48 bg-slate-200 dark:bg-white/5 rounded-md" />
                    <div className="pt-3 border-t border-[var(--border-default)] space-y-2">
                      <div className="h-7 w-full bg-slate-100 dark:bg-white/5 rounded-lg" />
                      <div className="h-7 w-full bg-slate-100 dark:bg-white/5 rounded-lg" />
                    </div>
                  </div>

                  {/* Wants Skeleton */}
                  <div className="p-4 bg-[var(--background-base)] border border-pink-500/20 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-pink-500/20 rounded-md" />
                      <div className="h-4 w-16 bg-pink-500/10 rounded-full" />
                    </div>
                    <div className="h-8 w-32 bg-slate-200 dark:bg-white/10 rounded-md" />
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="h-3 w-48 bg-slate-200 dark:bg-white/5 rounded-md" />
                    <div className="pt-3 border-t border-[var(--border-default)] space-y-2">
                      <div className="h-7 w-full bg-slate-100 dark:bg-white/5 rounded-lg" />
                      <div className="h-7 w-full bg-slate-100 dark:bg-white/5 rounded-lg" />
                    </div>
                  </div>

                  {/* Savings Skeleton */}
                  <div className="p-4 bg-[var(--background-base)] border border-emerald-500/20 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-emerald-500/20 rounded-md" />
                      <div className="h-4 w-16 bg-emerald-500/10 rounded-full" />
                    </div>
                    <div className="h-8 w-32 bg-slate-200 dark:bg-white/10 rounded-md" />
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="h-3 w-48 bg-slate-200 dark:bg-white/5 rounded-md" />
                    <div className="pt-3 border-t border-[var(--border-default)] space-y-2">
                      <div className="h-7 w-full bg-slate-100 dark:bg-white/5 rounded-lg" />
                      <div className="h-7 w-full bg-slate-100 dark:bg-white/5 rounded-lg" />
                    </div>
                  </div>
                </div>
              ) : (
                /* 3 Pure AI Interactive Buckets Grid */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* NEEDS (50%) */}
                  <div className="p-4 bg-[var(--background-base)] border border-blue-500/30 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5" /> Needs (50% Target)
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {aiData?.needsWantsSavingsAI?.needs?.status || 'Optimal'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
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
                    </div>

                    {/* AI Classified Line Items Breakdown */}
                    <div className="pt-3 border-t border-[var(--border-default)] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--foreground-muted)] uppercase">
                        <span>Classified Items ({aiData?.needsWantsSavingsAI?.needs?.items?.length || 0}):</span>
                      </div>
                      
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {(aiData?.needsWantsSavingsAI?.needs?.items || []).length === 0 ? (
                          <div className="text-[10px] text-slate-400 font-mono text-center py-3">
                            No transactions in Needs bucket.
                          </div>
                        ) : (
                          aiData.needsWantsSavingsAI.needs.items.map((item, i) => (
                            <div key={item.id || i} className="p-2 bg-[var(--background-elevated)] border border-blue-500/15 rounded-xl space-y-1">
                              <div className="flex justify-between items-center text-xs gap-2">
                                <span className="font-semibold text-[var(--foreground)] truncate">{item.title}</span>
                                <span className="font-mono font-bold text-blue-500 shrink-0">{formatCurrency(item.amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-[var(--foreground-muted)] font-mono">
                                <span>{item.date || 'Cycle'} • {item.category || 'Essential'}</span>
                                {item.reason && (
                                  <span className="text-blue-600 dark:text-blue-400 truncate max-w-[140px]" title={item.reason}>
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
                  <div className="p-4 bg-[var(--background-base)] border border-pink-500/30 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-pink-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5" /> Wants (30% Target)
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                          {aiData?.needsWantsSavingsAI?.wants?.status || 'Optimal'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
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
                    </div>

                    {/* AI Classified Line Items Breakdown */}
                    <div className="pt-3 border-t border-[var(--border-default)] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--foreground-muted)] uppercase">
                        <span>Classified Items ({aiData?.needsWantsSavingsAI?.wants?.items?.length || 0}):</span>
                      </div>
                      
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {(aiData?.needsWantsSavingsAI?.wants?.items || []).length === 0 ? (
                          <div className="text-[10px] text-slate-400 font-mono text-center py-3">
                            No transactions in Wants bucket.
                          </div>
                        ) : (
                          aiData.needsWantsSavingsAI.wants.items.map((item, i) => (
                            <div key={item.id || i} className="p-2 bg-[var(--background-elevated)] border border-pink-500/15 rounded-xl space-y-1">
                              <div className="flex justify-between items-center text-xs gap-2">
                                <span className="font-semibold text-[var(--foreground)] truncate">{item.title}</span>
                                <span className="font-mono font-bold text-pink-500 shrink-0">{formatCurrency(item.amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-[var(--foreground-muted)] font-mono">
                                <span>{item.date || 'Cycle'} • {item.category || 'Discretionary'}</span>
                                {item.reason && (
                                  <span className="text-pink-600 dark:text-pink-400 truncate max-w-[140px]" title={item.reason}>
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
                  <div className="p-4 bg-[var(--background-base)] border border-emerald-500/30 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" /> Savings (20% Target)
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {aiData?.needsWantsSavingsAI?.savings?.status || 'Supercharged'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
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
                    </div>

                    {/* AI Classified Line Items Breakdown */}
                    <div className="pt-3 border-t border-[var(--border-default)] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--foreground-muted)] uppercase">
                        <span>Classified Items ({aiData?.needsWantsSavingsAI?.savings?.items?.length || 0}):</span>
                      </div>
                      
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {(aiData?.needsWantsSavingsAI?.savings?.items || []).length === 0 ? (
                          <div className="text-[10px] text-slate-400 font-mono text-center py-3">
                            No transactions in Savings bucket.
                          </div>
                        ) : (
                          aiData.needsWantsSavingsAI.savings.items.map((item, i) => (
                            <div key={item.id || i} className="p-2 bg-[var(--background-elevated)] border border-emerald-500/15 rounded-xl space-y-1">
                              <div className="flex justify-between items-center text-xs gap-2">
                                <span className="font-semibold text-[var(--foreground)] truncate">{item.title}</span>
                                <span className="font-mono font-bold text-emerald-500 shrink-0">{formatCurrency(item.amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-[var(--foreground-muted)] font-mono">
                                <span>{item.date || 'Cycle'} • {item.category || 'Investment'}</span>
                                {item.reason && (
                                  <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[140px]" title={item.reason}>
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

            {/* Detailed Categories Breakdown Grid */}
            <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)]">
                All Expense Categories Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(data?.spendingCategories || []).map((cat, idx) => (
                  <div key={idx} className="p-4 bg-[var(--background-base)] border border-[var(--border-default)] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-[var(--surface-active)]">
                          {getCategoryIconComponent(cat.category)}
                        </span>
                        <div>
                          <span className="font-bold text-xs text-[var(--foreground)] block">{cat.category}</span>
                          <span className="text-[10px] text-[var(--foreground-muted)]">{cat.count} line items</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-[var(--foreground)] block">{formatCurrency(cat.amount)}</span>
                        <span className="text-[10px] font-mono text-indigo-500 font-semibold">{cat.percentage}% share</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 pt-1">
                      {Array.from({ length: 20 }).map((_, sIdx) => (
                        <div
                          key={sIdx}
                          className={`h-2 flex-1 rounded-xs transition-all ${
                            sIdx < cat.segments ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: ASSET DISTRIBUTION & WEALTH STRUCTURE */}
        {activeTab === 'structure' && (
          <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-6">
            <div className="border-b border-[var(--border-default)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                  <Coins className="w-4 h-4 text-purple-500" /> Asset Distribution & Wealth Structure (Net Worth & Asset Footprint)
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Understand your exact Net Worth and where every dollar/rupee is stored
                </p>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-500 font-mono text-xs font-bold">
                Net Worth: {formatCurrency(data?.financialStructure?.totalAssetBase || 0)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[var(--background-base)] border border-indigo-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase font-mono">
                  <Banknote className="w-4 h-4" />
                  <span>1. Liquid In-Hand Cash</span>
                </div>
                <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
                  {formatCurrency(data?.financialStructure?.liquidCapital?.amount || 0)}
                </div>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                  Checking account and liquid cash immediately available to spend ({data?.financialStructure?.liquidCapital?.percentage || 0}% of net worth).
                </p>
              </div>

              <div className="p-4 bg-[var(--background-base)] border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase font-mono">
                  <PiggyBank className="w-4 h-4" />
                  <span>2. Savings Pots & FDs</span>
                </div>
                <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
                  {formatCurrency(data?.financialStructure?.savingsPots?.amount || 0)}
                </div>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                  Emergency reserves, goal-based savings pots, and high-yield deposits ({data?.financialStructure?.savingsPots?.percentage || 0}% of net worth).
                </p>
              </div>

              <div className="p-4 bg-[var(--background-base)] border border-purple-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase font-mono">
                  <TrendingUp className="w-4 h-4" />
                  <span>3. Stock Equity Portfolio</span>
                </div>
                <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
                  {formatCurrency(data?.financialStructure?.stockEquity?.amount || 0)}
                </div>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                  Live market valuation of equity stocks, index funds, and mutual funds ({data?.financialStructure?.stockEquity?.percentage || 0}% of net worth).
                </p>
              </div>

              <div className="p-4 bg-[var(--background-base)] border border-cyan-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-cyan-500 font-bold text-xs uppercase font-mono">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>4. Lending Receivables</span>
                </div>
                <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
                  {formatCurrency(data?.financialStructure?.lendingReceivables?.amount || 0)}
                </div>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                  Money lent to peers and receivables scheduled for repayment ({data?.financialStructure?.lendingReceivables?.percentage || 0}% of net worth).
                </p>
              </div>
            </div>

            {/* Connected Bar */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[var(--foreground)]">Proportional Net Worth Breakdown</span>
              <div className="h-8 w-full rounded-2xl overflow-hidden flex gap-1 p-1 bg-[var(--background-base)] border border-[var(--border-default)]">
                {(data?.financialStructure?.liquidCapital?.percentage || 0) > 0 && (
                  <div 
                    style={{ width: `${data.financialStructure.liquidCapital.percentage}%` }} 
                    className="bg-indigo-600 rounded-xl transition-all h-full flex items-center justify-center text-xs text-white font-mono font-bold"
                  >
                    Liquid {data.financialStructure.liquidCapital.percentage}%
                  </div>
                )}
                {(data?.financialStructure?.savingsPots?.percentage || 0) > 0 && (
                  <div 
                    style={{ width: `${data.financialStructure.savingsPots.percentage}%` }} 
                    className="bg-emerald-500 rounded-xl transition-all h-full flex items-center justify-center text-xs text-white font-mono font-bold"
                  >
                    Savings {data.financialStructure.savingsPots.percentage}%
                  </div>
                )}
                {(data?.financialStructure?.stockEquity?.percentage || 0) > 0 && (
                  <div 
                    style={{ width: `${data.financialStructure.stockEquity.percentage}%` }} 
                    className="bg-purple-500 rounded-xl transition-all h-full flex items-center justify-center text-xs text-white font-mono font-bold"
                  >
                    Stocks {data.financialStructure.stockEquity.percentage}%
                  </div>
                )}
                {(data?.financialStructure?.lendingReceivables?.percentage || 0) > 0 && (
                  <div 
                    style={{ width: `${data.financialStructure.lendingReceivables.percentage}%` }} 
                    className="bg-cyan-500 rounded-xl transition-all h-full flex items-center justify-center text-xs text-white font-mono font-bold"
                  >
                    Lending {data.financialStructure.lendingReceivables.percentage}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: GEMINI 2050 AI INTELLIGENCE COCKPIT */}
        {activeTab === 'ai' && (
          <div className="space-y-6">

            {/* AI Control Strip */}
            <div className="bg-[var(--background-elevated)] border border-purple-500/30 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 shrink-0">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                    Gemini 2050 Autonomous Intelligence Engine
                  </h2>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Deep neural financial analysis, predictive runaway, and automated budgeting audits
                  </p>
                </div>
              </div>

              <button
                onClick={fetchAiIntelligence}
                disabled={aiLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                {aiLoading ? 'Synthesizing...' : 'Regenerate Intelligence'}
              </button>
            </div>

            {/* AI THINKING SKELETON STATE */}
            {aiLoading && (
              <div className="bg-[var(--background-elevated)] border border-purple-500/30 p-8 rounded-2xl shadow-sm text-center space-y-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/30">
                    <Bot className="w-10 h-10 animate-bounce" />
                  </div>
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Gemini Neural Reasoning in Progress...
                  </h3>
                  <p className="text-xs text-purple-500 dark:text-purple-400 font-mono font-medium">
                    {aiThinkingStep === 0 && 'Phase 1/3: Clustering cycle transactions and category vectors...'}
                    {aiThinkingStep === 1 && 'Phase 2/3: Evaluating 50/30/20 fiscal health and burn rates...'}
                    {aiThinkingStep === 2 && 'Phase 3/3: Synthesizing 2050 predictive runway & saving strategies...'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-24 bg-purple-500/5 border border-purple-500/20 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            )}

            {/* AI INTELLIGENCE DASHBOARD CARDS */}
            {!aiLoading && aiData && (
              <div className="space-y-6">
                
                {/* Executive Briefing Card */}
                <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-500/30 p-6 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-500 dark:text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Executive Intelligence Briefing
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-purple-500/15 text-purple-500 border border-purple-500/25 font-semibold">
                      Grade: {aiData.healthGrade || 'A'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed font-normal">
                    {aiData.executiveSummary}
                  </p>
                  <div className="pt-2 border-t border-[var(--border-default)] flex items-center gap-2 text-xs text-purple-400 font-medium">
                    <Zap className="w-3.5 h-3.5 text-purple-500" />
                    <span>2050 Recommendation: {aiData.predictiveAdvice2050}</span>
                  </div>
                </div>

                {/* KPI Dial Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Health Score Gauge */}
                  <div className="p-5 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl space-y-3">
                    <span className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase block">
                      Financial Health Index
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold font-mono text-emerald-500">
                        {aiData.financialHealthScore || 85}
                      </span>
                      <span className="text-xs text-[var(--foreground-muted)] font-mono">/ 100</span>
                    </div>
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                      {aiData.healthStatus || 'Hyper-Optimal'}
                    </span>
                  </div>

                  {/* Daily Burn Rate */}
                  <div className="p-5 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl space-y-3">
                    <span className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase block">
                      Daily Burn vs Safe Budget
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[var(--foreground)]">
                        {formatCurrency(aiData.burnRateAnalysis?.dailyAverageSpend || 0)}
                      </span>
                      <span className="text-[10px] text-[var(--foreground-muted)]">/ day</span>
                    </div>
                    <span className="text-[11px] text-[var(--foreground-muted)] block">
                      Safe allowance: <strong className="text-indigo-500">{formatCurrency(aiData.burnRateAnalysis?.dailySafeBudget || 0)}/d</strong>
                    </span>
                  </div>

                  {/* Runway Forecast */}
                  <div className="p-5 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-2xl space-y-3">
                    <span className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase block">
                      Projected Cycle Runway
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-indigo-500">
                        {formatCurrency(aiData.projectedRunway?.projectedEndOfCycleBalance || 0)}
                      </span>
                      <span className="text-[10px] text-[var(--foreground-muted)]">at cycle close</span>
                    </div>
                    <span className="text-[11px] text-[var(--foreground-muted)] block">
                      {aiData.projectedRunway?.daysRemainingInCycle || 0} days left in cycle
                    </span>
                  </div>

                </div>

                {/* Actionable Savings Opportunities */}
                <div className="bg-[var(--background-elevated)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-500" /> Actionable 2050 Savings Strategies
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(aiData.savingsOpportunities || []).map((opp, idx) => (
                      <div key={idx} className="p-4 bg-[var(--background-base)] border border-[var(--border-default)] rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--foreground)]">{opp.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            +{formatCurrency(opp.potentialMonthlySavings)} / mo
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">{opp.description}</p>
                        <div className="text-[11px] font-semibold text-indigo-500 pt-1">
                          &rarr; {opp.actionableStep}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* MODAL 1: Add Salary / Inflow */}
      <AnimatePresence>
        {salaryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
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
              className="w-full md:max-w-md bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-t-3xl md:rounded-2xl p-6 relative shadow-2xl z-10 text-left"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-emerald-500" /> Log Capital Inflow
                </h3>
                <button onClick={() => setSalaryModalOpen(false)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setSalaryType('SALARY')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    salaryType === 'SALARY'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Salary Inflow
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryType('BONUS')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    salaryType === 'BONUS'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Bonus / Extra
                </button>
              </div>

              <form onSubmit={handleAddSalary} className="space-y-4">
                <div>
                  <label className="block text-[var(--foreground-muted)] text-xs font-medium mb-1.5">
                    {salaryType === 'SALARY' ? 'Salary Amount' : 'Bonus Amount'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={salAmount}
                    onChange={(e) => setSalAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2.5 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground-muted)]/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--foreground-muted)] text-xs font-medium mb-1.5">Month</label>
                    <select
                      value={salMonth}
                      onChange={(e) => setSalMonth(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none cursor-pointer"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--foreground-muted)] text-xs font-medium mb-1.5">Year</label>
                    <input
                      type="number"
                      value={salYear}
                      onChange={(e) => setSalYear(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--background-base)] border border-[var(--border-default)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {salError && <p className="text-xs text-rose-500">{salError}</p>}

                <button
                  type="submit"
                  disabled={salLoading}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                >
                  {salLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Capital Inflow'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Quick Presets Drawer */}
      <AnimatePresence>
        {presetsDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
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
              className="w-full md:max-w-lg bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-t-3xl md:rounded-2xl p-6 relative shadow-2xl max-h-[85vh] overflow-y-auto z-10 text-left"
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" /> One-Tap Presets
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Quickly prefill a transaction</p>
                </div>
                <button onClick={() => setPresetsDrawerOpen(false)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
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
                    className="p-3.5 bg-[var(--background-base)] hover:border-indigo-500/40 border border-[var(--border-default)] rounded-xl transition-all text-left flex flex-col justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="block text-xs font-bold text-[var(--foreground)]">{preset.title}</span>
                        <span className="block text-[10px] text-[var(--foreground-muted)] mt-0.5">{preset.type}</span>
                      </div>
                      <span className="text-base shrink-0">{preset.icon}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[var(--border-default)]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">{preset.type}</span>
                      <span className="text-xs font-mono font-bold text-[var(--foreground)]">{formatCurrency(preset.amount)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Salary Success Celebration */}
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
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm bg-[var(--background-elevated)] border border-emerald-500/30 rounded-2xl p-6 text-center z-10 shadow-2xl relative"
            >
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight">Salary Capital Logged!</h2>
              <p className="text-emerald-500 text-xs font-mono mt-1">Inflow added to active cycle liquidity.</p>
              <button
                type="button"
                onClick={() => setSalaryCelebrationOpen(false)}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white mt-5 cursor-pointer shadow-md"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TransactionModal component */}
      <TransactionModal
        isOpen={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false);
          setEntryToEdit(null);
          setParentLending(null);
        }}
        entryToEdit={entryToEdit}
        parentLending={parentLending}
        onSuccess={fetchDashboardData}
        user={user}
        monthsList={monthsList}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
