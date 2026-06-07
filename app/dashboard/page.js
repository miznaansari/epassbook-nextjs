'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardMobile from '@/components/DashboardMobile';
import Navbar from '@/components/Navbar';
import TransactionModal from '@/components/TransactionModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronDown,
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
  Pencil
} from 'lucide-react';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Recovery Loading States
  const [showRecovery, setShowRecovery] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Syncing secure session...');

  // Primary Data State
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState('current'); // current, last, last3, last6, custom

  // Custom Date Range Pickers
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Client-side Ledger Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals & Drawers State
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [presetsDrawerOpen, setPresetsDrawerOpen] = useState(false);
  const [salaryCelebrationOpen, setSalaryCelebrationOpen] = useState(false);

  // Forms State
  // 1. Salary Form
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [salAmount, setSalAmount] = useState('');
  const [salMonth, setSalMonth] = useState(currentMonth);
  const [salYear, setSalYear] = useState(currentYear);
  const [salError, setSalError] = useState('');
  const [salLoading, setSalLoading] = useState(false);

  // New States
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [parentLending, setParentLending] = useState(null);
  const [salaryType, setSalaryType] = useState('SALARY'); // 'SALARY' or 'BONUS'

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

  // Loading Recovery Timer Logic for PWA / iOS Web Apps
  useEffect(() => {
    let stepTimer1;
    let stepTimer2;
    let recoveryTimer;

    const isDashboardLoading = loading || !user || !data;

    if (isDashboardLoading) {
      stepTimer1 = setTimeout(() => setLoadingStep('Loading financial ledger...'), 2500);
      stepTimer2 = setTimeout(() => setLoadingStep('Optimizing AI insights...'), 5000);
      recoveryTimer = setTimeout(() => {
        setShowRecovery(true);
      }, 10000); // 10 seconds timeout for self-healing recovery actions
    } else {
      setShowRecovery(false);
      setLoadingStep('Syncing secure session...');
    }

    return () => {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(recoveryTimer);
    };
  }, [loading, user, data]);

  // Fetch Dashboard Aggregated Data
  const fetchDashboardData = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      let url = `/api/dashboard?filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      } else if (res.status === 401) {
        console.warn('Session expired (401), executing automatic logout.');
        logout();
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, filter]);

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



  // Handle Quick Delete Entry
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

  if (loading || !user || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] px-6 text-center select-none relative overflow-hidden">
        {/* Soft Background Mesh */}
        <div className="absolute inset-0 bg-radial-gradient from-violet-600/5 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-6"></div>

          <h3 className="text-white font-extrabold text-lg tracking-tight mb-1">ePassbook Wallet</h3>
          <p className="text-slate-400 text-xs font-semibold animate-pulse">{loadingStep}</p>

          {showRecovery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 p-6 bg-slate-900/80 border border-white/10 rounded-3xl max-w-sm text-center shadow-2xl backdrop-blur-md"
            >
              <AlertCircle className="w-7 h-7 text-amber-400 mx-auto mb-3 animate-bounce" />
              <h4 className="text-white font-extrabold text-sm tracking-tight">Sync taking longer than usual</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                PWAs on iOS can experience cache lockups. Resetting the offline application can restore connection instantly.
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Refresh Application
                </button>
                <button
                  onClick={async () => {
                    try {
                      if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (let registration of registrations) {
                          await registration.unregister();
                        }
                      }
                      const cacheNames = await caches.keys();
                      await Promise.all(cacheNames.map(name => caches.delete(name)));
                      window.location.reload();
                    } catch (e) {
                      window.location.reload();
                    }
                  }}
                  className="w-full py-3 bg-slate-950/60 border border-white/10 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Force Clear PWA Caches
                </button>
                <button
                  onClick={async () => {
                    try {
                      if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (let registration of registrations) {
                          await registration.unregister();
                        }
                      }
                      const cacheNames = await caches.keys();
                      await Promise.all(cacheNames.map(name => caches.delete(name)));
                    } catch (e) {
                      console.error(e);
                    }
                    await logout();
                  }}
                  className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-xl text-xs font-black tracking-wider uppercase transition-all active:scale-95 cursor-pointer"
                >
                  Hard Logout & Reset PWA
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Format Helper
  const formatCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(val || 0);
  };

  // Preset Generation Helper
  const getPresetsList = () => {
    const defaultPresets = [
      { label: 'Dinner 🍔', title: 'Dinner', amount: 15, type: 'SPENDING', desc: 'Dining out / food' },
      { label: 'Uber/Cab 🚗', title: 'Uber/Cab', amount: 10, type: 'SPENDING', desc: 'Transport ride' },
      { label: 'Coffee ☕', title: 'Coffee', amount: 5, type: 'SPENDING', desc: 'Daily caffeine run' },
      { label: 'SIP 📈', title: 'SIP', amount: 250, type: 'SAVINGS', desc: 'Invested savings / SIP' },
      { label: 'Lending 💸', title: 'Lending', amount: 50, type: 'LENDING', desc: 'Lent money' }
    ];

    if (!data?.recentTransactions) return defaultPresets;

    const uniqueMap = new Map();
    data.recentTransactions.forEach(t => {
      const title = t.title || 'Untitled';
      const type = t.type || 'SPENDING';
      const key = `${title.trim().toLowerCase()}_${type}`;
      if (!uniqueMap.has(key)) {
        let emoji = '💸';
        const titleLower = title.toLowerCase();
        if (type === 'SAVINGS' || titleLower.includes('sip') || titleLower.includes('save') || titleLower.includes('invest') || titleLower.includes('saving')) emoji = '📈';
        else if (titleLower.includes('food') || titleLower.includes('eat') || titleLower.includes('restaurant') || titleLower.includes('cafe') || titleLower.includes('dinner') || titleLower.includes('lunch') || titleLower.includes('breakfast')) emoji = '🍔';
        else if (titleLower.includes('uber') || titleLower.includes('cab') || titleLower.includes('taxi') || titleLower.includes('fuel') || titleLower.includes('travel') || titleLower.includes('car')) emoji = '🚗';
        else if (titleLower.includes('coffee') || titleLower.includes('starbucks') || titleLower.includes('tea')) emoji = '☕';
        else if (titleLower.includes('rent') || titleLower.includes('room') || titleLower.includes('flat') || titleLower.includes('home')) emoji = '🏠';

        uniqueMap.set(key, {
          label: `${title} ${emoji}`,
          title: title,
          amount: parseFloat(t.amount || 0),
          type: type,
          desc: t.description || '',
          count: 1,
          timestamp: new Date(t.date || Date.now()).getTime()
        });
      } else {
        const existing = uniqueMap.get(key);
        existing.count += 1;
      }
    });

    const presets = Array.from(uniqueMap.values())
      .sort((a, b) => b.count - a.count || b.timestamp - a.timestamp)
      .slice(0, 6);

    if (presets.length < 4) {
      defaultPresets.forEach(def => {
        const isDup = presets.some(p => p.type === def.type && (p.title || '').toLowerCase() === def.title.toLowerCase());
        if (!isDup && presets.length < 6) {
          presets.push(def);
        }
      });
    }
    return presets;
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
          getPresetsList={getPresetsList}
          monthsList={monthsList}
          entryToEdit={entryToEdit}
          setEntryToEdit={setEntryToEdit}
          salaryType={salaryType}
          setSalaryType={setSalaryType}
          parentLending={parentLending}
          setParentLending={setParentLending}
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

  return (
    <div className="relative  flex flex-col justify-between bg-[#030712] text-slate-100 selection:bg-violet-500/30 ">
      {/* Ambient Backlight Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-gradient-to-br from-violet-600/10 to-cyan-500/0 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-gradient-to-tr from-emerald-500/5 to-amber-500/0 rounded-full blur-[140px] pointer-events-none z-0"></div>

      <Navbar />

      {/* Main Dashboard Panel */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 relative z-10">

        {/* Row 1: Header Welcome and Date Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 bg-slate-950/20 border border-white/[0.04] p-4 rounded-2xl backdrop-blur-md">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                ePassbook Hub v0.1.3
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Synced Ledger</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Financial Overview
            </h1>
            <p className="text-slate-400 text-[11px] mt-0.5 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-500" />
              Cycle Boundaries:{' '}
              {dataLoading ? (
                <span className="inline-block w-28 h-3 bg-white/5 rounded animate-pulse"></span>
              ) : data?.startDate ? (
                <span className="text-slate-300 font-semibold">
                  <span className="text-violet-400">
                    {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="mx-1 text-slate-600">→</span>
                  <span className="text-violet-400">
                    {new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-slate-500 text-[9px] ml-1.5 font-bold px-1.5 py-0.5 bg-slate-950/40 rounded border border-white/5">Cycle Day: {data.cycleDate}</span>
                </span>
              ) : (
                <span className="text-slate-500">Not configured</span>
              )}
            </p>
          </div>

          {/* Filters Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-950/80 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-violet-500 font-bold cursor-pointer transition-all shadow-lg"
            >
              <option value="current">Current Cycle</option>
              <option value="last">Last Cycle</option>
              <option value="last3">Last 3 Months</option>
              <option value="last6">Last 6 Months</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {filter === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/5 rounded-xl px-2.5 py-1 text-[11px]">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold text-[11px]"
                />
                <span className="text-slate-600 font-bold">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold text-[11px]"
                  onBlur={fetchDashboardData}
                />
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Hero Balance Cards & Action Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Main Hero Wallet Card */}
          <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#131b2e] to-[#0a0f1d] border border-white/[0.08] p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col justify-between min-h-[190px]">
            {/* Accent Glowing Orb */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span> Total Available Capital
                </span>
                <div className="mt-2">
                  {dataLoading ? (
                    <div className="w-48 h-10 bg-white/5 rounded animate-pulse"></div>
                  ) : (
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-1.5">
                      {formatCurrency(data?.kpis?.currentBalance)}
                    </h2>
                  )}
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Combined balance including salary and reserves</p>
                </div>
              </div>
              <span className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl shadow-inner">
                <Wallet className="w-6 h-6" />
              </span>
            </div>

            {/* Salary Breakdown Segment */}
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Active Salary Balance</span>
                {dataLoading ? (
                  <div className="w-24 h-5 bg-white/5 rounded animate-pulse mt-0.5"></div>
                ) : (
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatCurrency(data?.kpis?.salaryBalance)}</p>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSalaryModalOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Salary
                </button>
                <button
                  onClick={() => setEntryModalOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-violet-600/20 hover:shadow-violet-600/35 active:scale-95 cursor-pointer font-black tracking-wider uppercase"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Log Entry
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Mini Highlight Card */}
          <div className="bg-gradient-to-br from-[#121c2c] to-[#080d17] border border-white/[0.08] p-6 rounded-3xl flex flex-col justify-between min-h-[190px]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Investments & Savings
              </span>
              <div className="mt-2">
                {dataLoading ? (
                  <div className="w-32 h-8 bg-white/5 rounded animate-pulse"></div>
                ) : (
                  <h3 className="text-2xl font-black text-amber-400 tracking-tight">
                    {formatCurrency(data?.kpis?.savings)}
                  </h3>
                )}
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Accumulated SIP, Growth Asset allocations</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-2.5">
              <span className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                <Target className="w-4 h-4 animate-pulse" />
              </span>
              <div className="text-left">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Saving Goal Ratio</span>
                <span className="block text-xs font-bold text-slate-300">Targeting 30% Monthly SIP Ratio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Quick Action Presets Row */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <div className="mb-8 text-left bg-gradient-to-r from-slate-950/40 to-slate-900/10 border border-white/[0.04] p-4 rounded-3xl flex flex-col md:flex-row md:items-center gap-4 shadow-xl backdrop-blur-md">
            <div className="shrink-0 flex items-center gap-2">
              <span className="p-2 bg-gradient-to-br from-violet-500/20 to-cyan-500/10 border border-violet-500/35 text-violet-400 rounded-xl shadow-lg shadow-violet-500/5">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <span className="block text-xs font-black tracking-tight text-white uppercase">One-Tap Autofill</span>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Pre-fill transaction preset</span>
              </div>
            </div>
            <div
              className="flex gap-2.5 overflow-x-auto py-1 scroll-smooth select-none max-w-full w-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Show Drawer Presets Trigger */}
              <button
                onClick={() => setPresetsDrawerOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-violet-600/20 to-cyan-500/20 hover:from-violet-600/30 hover:to-cyan-500/30 border border-violet-500/30 hover:border-violet-500/50 text-xs font-black rounded-2xl text-violet-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <span>View All</span>
                <span className="p-0.5 bg-violet-500/30 text-white rounded-lg"><ArrowUpRight className="w-3 h-3" /></span>
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
                  className="px-3.5 py-2 bg-white/[0.03] hover:bg-violet-600/10 border border-white/[0.06] hover:border-violet-500/30 text-xs font-bold rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
                >
                  <span>{preset.label}</span>
                  <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg font-black">{formatCurrency(preset.amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: KPI Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            {
              title: "Spending",
              amount: formatCurrency(data?.kpis?.spending),
              borderColor: "border-rose-500/25 hover:border-rose-500/40",
              bgColor: "bg-rose-500/5",
              glow: "shadow-[0_0_20px_rgba(244,63,94,0.02)]",
              text: "text-rose-400",
              icon: ArrowUpRight,
              desc: "Expenses this cycle"
            },
            {
              title: "Lending",
              amount: formatCurrency(data?.kpis?.lending),
              borderColor: "border-blue-500/25 hover:border-blue-500/40",
              bgColor: "bg-blue-500/5",
              glow: "shadow-[0_0_20px_rgba(59,130,246,0.02)]",
              text: "text-blue-400",
              icon: ArrowRightLeft,
              desc: "Money lent out"
            },
            {
              title: "Loan Debts",
              amount: formatCurrency(data?.kpis?.loan),
              borderColor: "border-orange-500/25 hover:border-orange-500/40",
              bgColor: "bg-orange-500/5",
              glow: "shadow-[0_0_20px_rgba(249,115,22,0.02)]",
              text: "text-orange-400",
              icon: HelpCircle,
              desc: "Active debts"
            },
            {
              title: "Advances",
              amount: formatCurrency(data?.kpis?.advance),
              borderColor: "border-cyan-500/25 hover:border-cyan-500/40",
              bgColor: "bg-cyan-500/5",
              glow: "shadow-[0_0_20px_rgba(6,182,212,0.02)]",
              text: "text-cyan-400",
              icon: Plus,
              desc: "Advance deposits"
            },
            {
              title: "SIP / Wealth",
              amount: formatCurrency(data?.kpis?.savings),
              borderColor: "border-amber-500/25 hover:border-amber-500/40",
              bgColor: "bg-amber-500/5",
              glow: "shadow-[0_0_20px_rgba(245,158,11,0.02)]",
              text: "text-amber-400",
              icon: TrendingUp,
              desc: "Savings & SIPs"
            }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`bg-gradient-to-br from-[#0c1221] to-[#060a14] border ${card.borderColor} p-4 sm:p-5 text-left flex flex-col justify-between h-28 sm:h-36 cursor-default rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${card.glow} group`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{card.title}</h3>
                    <span className="hidden sm:block text-[9px] text-slate-500 font-medium mt-1 leading-tight group-hover:text-slate-400 transition-colors">{card.desc}</span>
                  </div>
                  <span className={`p-1.5 rounded-lg ${card.bgColor} ${card.text} border border-white/5`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="mt-2">
                  {dataLoading ? (
                    <div className="w-16 sm:w-24 h-5 bg-white/5 rounded animate-pulse"></div>
                  ) : (
                    <p className={`text-base sm:text-lg font-black tracking-tight ${card.text} truncate`}>{card.amount}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 4: Recent Ledger & AI Insights Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Recent E-Passbook Ledger */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#0c1221] to-[#060a14] border border-white/[0.06] p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              {/* Ledger Header Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-violet-400 animate-pulse" /> E-Passbook Ledger
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Real-time ledger audit log</p>
                </div>
                <Link
                  href="/transactions"
                  className="px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/25 hover:border-violet-500/40 text-violet-400 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  View Full Passbook <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Dynamic Search & Category Filters Bar */}
              <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-grow">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search recent ledger..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all font-semibold"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto select-none py-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {['ALL', 'SPENDING', 'SAVINGS', 'LENDING', 'LOAN', 'ADVANCE'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTypeFilter(tab)}
                      className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border shrink-0 ${typeFilter === tab
                        ? 'bg-violet-600/10 border-violet-500/40 text-violet-400 font-black shadow-lg shadow-violet-600/5'
                        : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
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
                    <div className="py-12 text-center text-slate-500 font-medium">
                      <Wallet className="w-8 h-8 mx-auto mb-3 opacity-30 text-slate-400" />
                      <p className="text-xs font-bold text-slate-400">No transactions match your search filter.</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Try typing a different name or type</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left text-sm text-slate-300 border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                          <th className="pb-3">Transaction</th>
                          <th className="pb-3">Category Type</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3 text-right">Amount</th>
                          <th className="pb-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredTransactions.map((entry) => {
                          const colors = {
                            SPENDING: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                            LENDING: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                            LOAN: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                            ADVANCE: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                            SAVINGS: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                          };

                          // Determine dynamic avatars
                          let AvatarIcon = ArrowUpRight;
                          let avatarColor = 'bg-rose-500/10 text-rose-400';
                          if (entry.type === 'SAVINGS') { AvatarIcon = Target; avatarColor = 'bg-amber-500/10 text-amber-400'; }
                          else if (entry.type === 'LENDING') { AvatarIcon = ArrowRightLeft; avatarColor = 'bg-blue-500/10 text-blue-400'; }
                          else if (entry.type === 'LOAN') { AvatarIcon = HelpCircle; avatarColor = 'bg-orange-500/10 text-orange-400'; }
                          else if (entry.type === 'ADVANCE') { AvatarIcon = ArrowDownLeft; avatarColor = 'bg-cyan-500/10 text-cyan-400'; }

                          return (
                            <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="py-3.5 pr-2 font-semibold text-white">
                                <div className="flex items-center gap-3">
                                  <span className={`p-2 rounded-xl border border-white/5 shrink-0 ${avatarColor}`}>
                                    <AvatarIcon className="w-3.5 h-3.5" />
                                  </span>
                                  <div>
                                    <div className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-400 transition-colors">{entry.title}</div>
                                    {entry.description && (
                                      <div className="text-[10px] text-slate-500 font-medium truncate max-w-[140px] mt-0.5">{entry.description}</div>
                                    )}
                                    {entry.type === 'LENDING' && (
                                      <div className="text-[10px] font-medium mt-0.5">
                                        {entry.unpaidAmount === 0 ? (
                                          <span className="text-emerald-400 font-extrabold">✓ Fully Repaid</span>
                                        ) : (
                                          <span className="text-slate-400">Unpaid: <strong className="text-blue-400">{formatCurrency(entry.unpaidAmount)}</strong></span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 pr-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${colors[entry.type]}`}>
                                  {entry.type}
                                </span>
                                {entry.useSalaryBalance && (
                                  <span className="block text-[8px] text-slate-500 mt-0.5 uppercase tracking-widest font-black">Deducted ({entry.salaryMonth}/{entry.salaryYear})</span>
                                )}
                              </td>
                              <td className="py-3.5 pr-2 text-xs text-slate-400 font-medium">
                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                              </td>
                              <td className={`py-3.5 pr-2 text-right font-black tracking-tight text-xs sm:text-sm ${entry.type === 'SPENDING' || entry.type === 'LENDING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {entry.type === 'SPENDING' || entry.type === 'LENDING' ? '-' : '+'}{formatCurrency(entry.amount)}
                              </td>
                              <td className="py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {entry.type === 'LENDING' && entry.unpaidAmount > 0 && (
                                    <button
                                      onClick={() => {
                                        setParentLending(entry);
                                        setEntryModalOpen(true);
                                      }}
                                      title="Receive Repayment"
                                      className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded-xl transition-all cursor-pointer active:scale-90 flex items-center justify-center"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEntryToEdit(entry);
                                      setEntryModalOpen(true);
                                    }}
                                    className="p-2 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 rounded-xl transition-all cursor-pointer active:scale-90"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer active:scale-90"
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

          {/* Quick AI Analytics Summary Sidebar */}
          <div className="bg-gradient-to-br from-[#0c1221] to-[#060a14] border border-white/[0.06] p-6 rounded-3xl shadow-xl flex flex-col justify-between text-left relative overflow-hidden">
            {/* Soft Ambient Light */}
            <div className="absolute right-[-20%] bottom-[-20%] w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" /> AI Insights Preview
              </h2>

              <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl mb-4 relative overflow-hidden">
                <h4 className="text-xs font-black text-violet-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping"></span> Savings Engine Active
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed font-semibold">
                  {data?.kpis?.spending > 0
                    ? `You spent ${formatCurrency(data?.kpis?.spending)} this cycle. Your salary balance is ${formatCurrency(data?.kpis?.salaryBalance)}. Try talking to your AI Assistant to compare budgets and get saving suggestions!`
                    : "No spending logged this cycle yet! Keep track of expenses to let Gemini analyze savings trends and give optimization ideas."}
                </p>
              </div>

              <div className="p-4 bg-cyan-600/10 border border-cyan-500/20 rounded-2xl">
                <h4 className="text-xs font-black text-cyan-300 uppercase tracking-widest mb-2">Cycle Outlook</h4>
                <p className="text-slate-300 text-xs leading-relaxed font-semibold">
                  Based on your salary cycle beginning on the <span className="font-black text-cyan-400">{data?.cycleDate}th</span>, all monthly ledgers are computed dynamically. Go to settings to modify the billing boundaries.
                </p>
              </div>
            </div>

            <Link
              href="/assistant"
              className="mt-6 w-full py-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-2xl font-black tracking-wider text-xs text-center uppercase transition-all btn-glow shadow-md shadow-violet-600/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4 shrink-0" /> Ask AI Assistant
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6 bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-xs text-center font-bold">
          © {new Date().getFullYear()} ePassbook. Crafted with HSL Theme.
        </div>
      </footer>

      {/* MODAL 1: Add Salary */}
      <AnimatePresence>
        {salaryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
            {/* Smooth fading backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryModalOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm cursor-pointer z-0"
            />

            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 400 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(event, info) => {
                if (info.offset.y > 100 || info.velocity.y > 100) {
                  setSalaryModalOpen(false);
                }
              }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full md:max-w-md bg-[#0d1423] border border-white/10 rounded-t-3xl md:rounded-2xl p-6 relative overflow-hidden shadow-2xl max-h-[90vh] md:max-h-none overflow-y-auto cursor-grab active:cursor-grabbing select-none z-10"
            >
              {/* Mobile Drawer Handle */}
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4 md:hidden shrink-0"></div>

              <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500"></div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-emerald-400" /> Log Month-Wise Inflow
                </h3>
                <button onClick={() => setSalaryModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Sliding Toggle Tab */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/50 border border-white/5 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setSalaryType('SALARY')}
                  className={`py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
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
                  className={`py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                    salaryType === 'BONUS'
                      ? 'bg-cyan-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Bonus
                </button>
              </div>

              {salError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{salError}</span>
                </div>
              )}

              <form onSubmit={handleAddSalary} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">
                    {salaryType === 'SALARY' ? 'Salary Amount' : 'Bonus Amount'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={salAmount}
                    onChange={(e) => setSalAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Month</label>
                    <select
                      value={salMonth}
                      onChange={(e) => setSalMonth(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Year</label>
                    <input
                      type="number"
                      value={salYear}
                      onChange={(e) => setSalYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salLoading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center"
                >
                  {salLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
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
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
            {/* Smooth fading backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPresetsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm cursor-pointer z-0"
            />

            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 400 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(event, info) => {
                if (info.offset.y > 100 || info.velocity.y > 100) {
                  setPresetsDrawerOpen(false);
                }
              }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full md:max-w-lg bg-[#0d1423] border border-white/10 rounded-t-3xl md:rounded-2xl p-6 relative overflow-hidden shadow-2xl max-h-[85vh] overflow-y-auto cursor-grab active:cursor-grabbing select-none z-10"
            >
              {/* Mobile Drawer Handle */}
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4 md:hidden shrink-0"></div>

              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-cyan-500"></div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-violet-400 animate-pulse animate-duration-1000 shrink-0" /> One-Tap Autofill
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">Select a transaction preset to pre-fill the form</p>
                </div>
                <button onClick={() => setPresetsDrawerOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Grid of Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {getPresetsList().map((preset, idx) => {
                  const colors = {
                    SPENDING: 'border-rose-500/25 hover:border-rose-500/40 bg-rose-500/5 text-rose-400',
                    LENDING: 'border-blue-500/25 hover:border-blue-500/40 bg-blue-500/5 text-blue-400',
                    LOAN: 'border-orange-500/25 hover:border-orange-500/40 bg-orange-500/5 text-orange-400',
                    ADVANCE: 'border-cyan-500/25 hover:border-cyan-500/40 bg-cyan-500/5 text-cyan-400',
                    SAVINGS: 'border-amber-500/25 hover:border-amber-500/40 bg-amber-500/5 text-amber-400',
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
                      className={`p-4 border rounded-2xl transition-all text-left flex flex-col justify-between gap-3 group relative overflow-hidden cursor-pointer hover:bg-white/[0.02] active:scale-98 ${colors[preset.type] || 'border-white/10'}`}
                    >
                      {/* Ambient background hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-violet-500/0 to-violet-500/0 group-hover:to-violet-500/[0.02] transition-all"></div>

                      <div className="flex justify-between items-start">
                        <div>
                          <span className="block text-xs font-black tracking-tight text-white uppercase group-hover:text-violet-400 transition-colors">{preset.title}</span>
                          <span className="block text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold truncate max-w-[140px]">{preset.desc || 'No description preset'}</span>
                        </div>
                        <span className="text-lg shrink-0">{preset.label.split(' ').pop()}</span>
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-white/[0.04] pt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{preset.type}</span>
                        <span className="text-xs font-black text-white px-2.5 py-1 bg-white/5 rounded-xl border border-white/5">{formatCurrency(preset.amount)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-violet-600/10 border border-violet-500/25 rounded-2xl text-center">
                <span className="text-[9px] text-violet-300 font-bold uppercase tracking-widest">💡 Quick Tip</span>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mt-1">Select any tile to immediately load its configurations into the ledger form drawer.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Salary Success Celebration Overlay */}
      <AnimatePresence>
        {salaryCelebrationOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
            {/* Smooth fading backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSalaryCelebrationOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md cursor-pointer z-0"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-gradient-to-br from-[#121c33] to-[#070b14] border border-emerald-500/35 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] text-center z-10"
            >
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl animate-pulse"></div>

              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10"
                  >
                    <PiggyBank className="w-10 h-10" />
                  </motion.div>
                  <span className="absolute -top-2 -right-2 text-2xl animate-bounce">🎉</span>
                  <span className="absolute -bottom-2 -left-2 text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>💰</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Salary Logged!</h2>
                  <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Congrats! Enjoy Your Salary! 🎉</p>
                </div>

                <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                  Your fresh monthly salary balance has been successfully credited and synchronized with your E-Passbook ledger! Ask Gemini AI to customize a strict monthly budget or saving projections!
                </p>

                <button
                  type="button"
                  onClick={() => setSalaryCelebrationOpen(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-2xl font-black tracking-wider text-xs uppercase transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center cursor-pointer"
                >
                  Superb, Let's Save!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* TransactionModal component rendered at the root level */}
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
