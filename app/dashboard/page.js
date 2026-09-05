'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardMobile from '@/components/DashboardMobile';
import Navbar from '@/components/Navbar';
import TransactionModal from '@/components/TransactionModal';
import SpotlightCard from '@/components/ui/SpotlightCard';
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
  Pencil,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

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

  // Loading Recovery Timer Logic
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
      }, 10000);
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

  // Linear Minimalist Loading Screen
  if (loading || !user || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050506] px-6 text-center select-none relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-white/10 border-t-[#5E6AD2] rounded-full animate-spin mb-4" />
          <h3 className="text-white font-medium text-sm tracking-tight mb-1">MonthlyMoney</h3>
          <p className="text-[#8A8F98] text-xs font-mono">{loadingStep}</p>

          {showRecovery && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-[#0a0a0c] border border-white/10 rounded-2xl max-w-sm text-center shadow-2xl"
            >
              <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <h4 className="text-white font-semibold text-xs tracking-tight">Sync taking longer than usual</h4>
              <p className="text-xs text-[#8A8F98] mt-1 leading-relaxed">
                PWAs on iOS can experience cache lockups. Resetting the offline application restores connection immediately.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-linear-primary w-full py-2.5 text-xs font-medium cursor-pointer"
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
                    } catch (e) {
                      console.error(e);
                    }
                    await logout();
                  }}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer"
                >
                  Hard Logout & Reset
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Currency Formatter
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

    const list = Array.from(uniqueMap.values())
      .sort((a, b) => b.count - a.count || b.timestamp - a.timestamp)
      .slice(0, 5);

    return list.length > 0 ? list : defaultPresets;
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

  const getChartData = () => {
    if (!data?.recentTransactions || data.recentTransactions.length === 0) {
      return [
        { name: 'Start', Balance: data?.kpis?.currentBalance || 0 },
        { name: 'Current', Balance: data?.kpis?.currentBalance || 0 },
      ];
    }

    const sorted = [...data.recentTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = data.kpis.currentBalance;
    
    sorted.forEach(t => {
      const amt = parseFloat(t.amount);
      const isOutflow = t.type === 'SPENDING' || t.type === 'LENDING';
      if (isOutflow) {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }
    });

    let current = runningBalance;
    const points = sorted.map((t) => {
      const amt = parseFloat(t.amount);
      const isOutflow = t.type === 'SPENDING' || t.type === 'LENDING';
      if (isOutflow) {
        current -= amt;
      } else {
        current += amt;
      }
      return {
        name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Balance: current,
      };
    });

    return [
      { name: 'Start', Balance: runningBalance },
      ...points
    ];
  };

  return (
    <div className="relative flex flex-col justify-between min-h-screen bg-[#050506] text-[#EDEDEF]">
      <Navbar />

      {/* Main Dashboard Panel */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-6">
        
        {/* Row 1: Header Welcome and Date Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-card p-6 border border-white/[0.06] rounded-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[9px] font-mono tracking-widest rounded-md uppercase">
                v0.1.39 • Live Ledger
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider">Active Cycle</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Financial Overview
            </h1>
            <p className="text-[#8A8F98] text-xs mt-1 font-normal flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#818cf8]" />
              Cycle Boundaries:
              {dataLoading ? (
                <span className="inline-block w-24 h-3 bg-white/5 rounded animate-pulse" />
              ) : data?.startDate ? (
                <span className="text-[#EDEDEF] font-medium font-mono text-[11px]">
                  <span>
                    {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="mx-2 text-[#8A8F98]">→</span>
                  <span>
                    {new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-[#8A8F98] ml-2 px-2 py-0.5 bg-white/[0.04] rounded border border-white/[0.06]">
                    Cycle Day: {data.cycleDate}
                  </span>
                </span>
              ) : (
                <span className="text-[#8A8F98]">Not configured</span>
              )}
            </p>
          </div>

          {/* Filters Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#0a0a0c] border border-white/10 hover:border-white/20 rounded-lg px-3.5 py-2 text-xs text-[#EDEDEF] focus:outline-none focus:border-[#5E6AD2] font-medium cursor-pointer transition-colors shadow-sm min-w-[150px]"
            >
              <option value="current">Current Cycle</option>
              <option value="last">Last Cycle</option>
              <option value="last3">Last 3 Months</option>
              <option value="last6">Last 6 Months</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {filter === 'custom' && (
              <div className="flex items-center gap-2 bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-1.5 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
                />
                <span className="text-[#8A8F98]">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
                  onBlur={fetchDashboardData}
                />
              </div>
            )}
          </div>
        </div>

        {/* 12-Column Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Content Area: Left 8 Columns */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Dual Wallet Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Available Capital Card (Linear Spotlight) */}
              <SpotlightCard 
                className="p-6 flex flex-col justify-between min-h-[200px]"
                spotlightColor="rgba(94, 106, 210, 0.16)"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#8A8F98] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" /> Total Available Capital
                    </span>
                    <div className="mt-2.5">
                      {dataLoading ? (
                        <div className="w-44 h-9 bg-white/5 rounded animate-pulse" />
                      ) : (
                        <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                          {formatCurrency(data?.kpis?.currentBalance)}
                        </h2>
                      )}
                    </div>
                  </div>
                  <span className="p-3 bg-white/[0.04] border border-white/[0.08] text-[#818cf8] rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </span>
                </div>
                
                <div className="mt-6 border-t border-white/[0.04] pt-4 flex justify-between items-center text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider">
                  <span>Liquid Wealth reserves</span>
                  <span>Active Cycle balance</span>
                </div>
              </SpotlightCard>

              {/* Active Salary Balance Card */}
              <SpotlightCard 
                className="p-6 flex flex-col justify-between min-h-[200px]"
                spotlightColor="rgba(16, 185, 129, 0.14)"
                borderColor="rgba(16, 185, 129, 0.18)"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#8A8F98] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active Salary balance
                  </span>
                  <div className="mt-2.5">
                    {dataLoading ? (
                      <div className="w-32 h-8 bg-white/5 rounded animate-pulse" />
                    ) : (
                      <h2 className="text-3xl font-semibold text-emerald-400 tracking-tight">
                        {formatCurrency(data?.kpis?.salaryBalance)}
                      </h2>
                    )}
                    <span className="text-[10px] text-[#8A8F98] font-normal block mt-1">Remaining after current month allocations</span>
                  </div>
                </div>

                <div className="flex gap-2.5 mt-6">
                  <button
                    onClick={() => setSalaryModalOpen(true)}
                    className="btn-linear-secondary flex-1 px-3.5 py-2 text-xs text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inflow
                  </button>
                  <button
                    onClick={() => setEntryModalOpen(true)}
                    className="btn-linear-primary flex-1 px-3.5 py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> New Entry
                  </button>
                </div>
              </SpotlightCard>
            </div>

            {/* Cash Flow Recharts AreaChart */}
            <div className="glass-card p-6 border border-white/[0.06] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#818cf8]" /> Cash Flow Trajectory
                  </h3>
                  <p className="text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider mt-0.5">Cycle balance curve</p>
                </div>
              </div>

              <div className="h-64 w-full">
                {dataLoading ? (
                  <div className="h-full w-full bg-white/5 rounded-xl animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        stroke="#4B5563" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#4B5563" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, '')}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#0a0a0c', 
                          borderColor: 'rgba(255,255,255,0.1)', 
                          borderRadius: '10px',
                          color: '#EDEDEF',
                          fontSize: '11px',
                          boxShadow: '0 12px 32px rgba(0,0,0,0.8)'
                        }} 
                        formatter={(value) => [formatCurrency(value), 'Balance']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Balance" 
                        stroke="#5E6AD2" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              {[
                {
                  title: "Spending",
                  amount: formatCurrency(data?.kpis?.spending),
                  text: "text-rose-400",
                  icon: ArrowUpRight,
                  desc: "Expenses",
                  border: "border-rose-500/20",
                  bg: "bg-rose-500/10"
                },
                {
                  title: "Lending",
                  amount: formatCurrency(data?.kpis?.lending),
                  text: "text-blue-400",
                  icon: ArrowRightLeft,
                  desc: "Receivable",
                  border: "border-blue-500/20",
                  bg: "bg-blue-500/10"
                },
                {
                  title: "Loan Debt",
                  amount: formatCurrency(data?.kpis?.loan),
                  text: "text-orange-400",
                  icon: HelpCircle,
                  desc: "Payable",
                  border: "border-orange-500/20",
                  bg: "bg-orange-500/10"
                },
                {
                  title: "Advances",
                  amount: formatCurrency(data?.kpis?.advance),
                  text: "text-cyan-400",
                  icon: Plus,
                  desc: "Deposit",
                  border: "border-cyan-500/20",
                  bg: "bg-cyan-500/10"
                },
                {
                  title: "SIP / Savings",
                  amount: formatCurrency(data?.kpis?.savings),
                  text: "text-amber-400",
                  icon: TrendingUp,
                  desc: "Invested",
                  border: "border-amber-500/20",
                  bg: "bg-amber-500/10"
                }
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#0a0a0c]/60 border border-white/[0.06] hover:border-white/[0.12] rounded-xl flex flex-col justify-between h-28 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[#8A8F98] text-[10px] font-mono uppercase tracking-wider">{card.title}</h4>
                        <span className="block text-[9px] text-[#8A8F98]/70 mt-0.5">{card.desc}</span>
                      </div>
                      <span className={`p-1.5 rounded-lg ${card.bg} ${card.text}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="mt-2">
                      {dataLoading ? (
                        <div className="w-16 h-4 bg-white/5 rounded animate-pulse" />
                      ) : (
                        <p className={`text-sm font-semibold tracking-tight ${card.text} truncate`}>{card.amount}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* E-Passbook Ledger Feed Table */}
            <div className="glass-card p-6 border border-white/[0.06] rounded-2xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <History className="w-4 h-4 text-[#818cf8]" /> Recent Transactions
                  </h3>
                  <p className="text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider mt-0.5">Real-time ledger audit trail</p>
                </div>
                <Link
                  href="/transactions"
                  className="btn-linear-secondary px-3 py-1.5 text-xs text-[#EDEDEF] flex items-center justify-center gap-1"
                >
                  Full Passbook <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Search & Category Filter Header */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-grow">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8A8F98] pointer-events-none">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full pl-9 pr-3 py-2 bg-[#0a0a0c] border border-white/10 rounded-lg text-xs text-[#EDEDEF] placeholder-[#8A8F98]/60 focus:outline-none focus:border-[#5E6AD2] transition-colors"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto select-none py-0.5">
                  {['ALL', 'SPENDING', 'SAVINGS', 'LENDING', 'LOAN', 'ADVANCE'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTypeFilter(tab)}
                      className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer border shrink-0 ${typeFilter === tab
                        ? 'bg-white/[0.08] border-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                        : 'bg-transparent border-transparent text-[#8A8F98] hover:text-[#EDEDEF]'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions Table */}
              {dataLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-14 bg-white/5 rounded-lg animate-pulse" />
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
                    <div className="py-12 text-center text-[#8A8F98]">
                      <Wallet className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No transactions match your search.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left text-xs text-[#8A8F98] border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-[#8A8F98] text-[10px] font-mono uppercase tracking-widest">
                          <th className="pb-3">Transaction</th>
                          <th className="pb-3">Type</th>
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

                          let AvatarIcon = ArrowUpRight;
                          let avatarColor = 'bg-rose-500/10 text-rose-400';
                          if (entry.type === 'SAVINGS') { AvatarIcon = Target; avatarColor = 'bg-amber-500/10 text-amber-400'; }
                          else if (entry.type === 'LENDING') { AvatarIcon = ArrowRightLeft; avatarColor = 'bg-blue-500/10 text-blue-400'; }
                          else if (entry.type === 'LOAN') { AvatarIcon = HelpCircle; avatarColor = 'bg-orange-500/10 text-orange-400'; }
                          else if (entry.type === 'ADVANCE') { AvatarIcon = ArrowDownLeft; avatarColor = 'bg-cyan-500/10 text-cyan-400'; }

                          return (
                            <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="py-3 pr-3 text-white">
                                <div className="flex items-center gap-3">
                                  <span className={`p-2 rounded-lg border border-white/5 shrink-0 ${avatarColor}`}>
                                    <AvatarIcon className="w-3.5 h-3.5" />
                                  </span>
                                  <div>
                                    <div className="font-medium text-[#EDEDEF] group-hover:text-white transition-colors">{entry.title}</div>
                                    {entry.description && (
                                      <div className="text-[10px] text-[#8A8F98] truncate max-w-[180px] mt-0.5">{entry.description}</div>
                                    )}
                                    {entry.type === 'LENDING' && (
                                      <div className="text-[10px] mt-0.5">
                                        {entry.unpaidAmount === 0 ? (
                                          <span className="text-emerald-400 font-medium">✓ Repaid</span>
                                        ) : (
                                          <span className="text-[#8A8F98]">Unpaid: <strong className="text-blue-400 font-medium">{formatCurrency(entry.unpaidAmount)}</strong></span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border uppercase tracking-wider ${colors[entry.type]}`}>
                                  {entry.type}
                                </span>
                                {entry.useSalaryBalance && (
                                  <span className="block text-[8px] text-[#8A8F98] mt-0.5 uppercase tracking-widest font-mono">Deducted ({entry.salaryMonth}/{entry.salaryYear})</span>
                                )}
                              </td>
                              <td className="py-3 pr-3 text-[11px] text-[#8A8F98] font-mono">
                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </td>
                              <td className={`py-3 pr-3 text-right font-medium text-xs sm:text-sm ${entry.type === 'SPENDING' || entry.type === 'LENDING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {entry.type === 'SPENDING' || entry.type === 'LENDING' ? '-' : '+'}{formatCurrency(entry.amount)}
                              </td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {entry.type === 'LENDING' && entry.unpaidAmount > 0 && (
                                    <button
                                      onClick={() => {
                                        setParentLending(entry);
                                        setEntryModalOpen(true);
                                      }}
                                      title="Receive Repayment"
                                      className="p-1.5 text-[#8A8F98] hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEntryToEdit(entry);
                                      setEntryModalOpen(true);
                                    }}
                                    className="p-1.5 text-[#8A8F98] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-1.5 text-[#8A8F98] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
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

          {/* Sidebar Area: Right 4 Columns */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Streaks Card */}
            {!dataLoading && data?.streaks && (
              <div className="glass-card p-5 border border-white/[0.06] rounded-2xl text-left space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#8A8F98] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" /> Financial Discipline
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0a0a0c] border border-white/[0.06] rounded-xl">
                    <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider block">Zero Spend</span>
                    <span className="text-xl font-semibold text-white block mt-1">{data.streaks.level1} Days</span>
                    <span className="text-[9px] text-[#8A8F98] block mt-1">No outflow logged</span>
                  </div>

                  <div className="p-3 bg-[#0a0a0c] border border-white/[0.06] rounded-xl">
                    <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-wider block">Controlled</span>
                    <span className="text-xl font-semibold text-white block mt-1">{data.streaks.level2} Days</span>
                    <span className="text-[9px] text-[#8A8F98] block mt-1">Under {formatCurrency(data.streaks.level2Limit)}/d</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Presets Strip */}
            {data?.recentTransactions && data.recentTransactions.length > 0 && (
              <div className="glass-card p-5 border border-white/[0.06] rounded-2xl text-left space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#818cf8]" />
                    <span className="text-xs font-semibold text-white">Quick Presets</span>
                  </div>
                  <button
                    onClick={() => setPresetsDrawerOpen(true)}
                    className="text-[10px] font-mono text-[#818cf8] hover:text-white cursor-pointer"
                  >
                    VIEW ALL
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
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
                      className="w-full p-2.5 bg-[#0a0a0c]/80 hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/15 text-xs rounded-lg transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{preset.label.split(' ').pop()}</span>
                        <span className="font-medium text-[#EDEDEF] truncate">{preset.title}</span>
                      </div>
                      <span className="text-xs font-mono font-medium text-white px-2 py-0.5 bg-white/[0.05] rounded border border-white/[0.06]">
                        {formatCurrency(preset.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights Card */}
            <div className="glass-card p-5 border border-white/[0.06] rounded-2xl text-left space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <Sparkles className="w-4 h-4 text-[#818cf8]" />
                <h3 className="text-xs font-semibold text-white tracking-tight">AI Insights Preview</h3>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 rounded-xl space-y-1">
                  <h4 className="text-[10px] font-mono text-[#818cf8] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" /> Savings Trajectory
                  </h4>
                  <p className="text-[#EDEDEF] text-xs leading-relaxed font-normal">
                    {data?.kpis?.spending > 0
                      ? `You spent ${formatCurrency(data?.kpis?.spending)} this cycle. Your salary balance is ${formatCurrency(data?.kpis?.salaryBalance)}. Chat with Gemini to discover category-specific savings opportunities.`
                      : "No spending logged this cycle yet! Keep recording transactions to activate intelligent savings recommendations."}
                  </p>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-1">
                  <h4 className="text-[10px] font-mono text-[#8A8F98] uppercase tracking-wider">Salary Cycle</h4>
                  <p className="text-[#8A8F98] text-xs leading-relaxed">
                    Ledger cycle resets on the <span className="text-white font-medium">{data?.cycleDate}th</span> of every month.
                  </p>
                </div>
              </div>

              <Link
                href="/assistant"
                className="btn-linear-primary w-full py-2.5 text-xs text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Launch AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 bg-[#020203]">
        <div className="max-w-7xl mx-auto px-6 text-[#8A8F98] text-xs text-center font-mono">
          © {new Date().getFullYear()} MonthlyMoney. Precision-Engineered Ledger.
        </div>
      </footer>

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
              className="w-full md:max-w-md bg-[#0a0a0c] border border-white/10 rounded-t-3xl md:rounded-2xl p-6 relative shadow-2xl max-h-[90vh] md:max-h-none overflow-y-auto z-10 text-left"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-emerald-400" /> Log Inflow Capital
                </h3>
                <button onClick={() => setSalaryModalOpen(false)} className="text-[#8A8F98] hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 bg-[#050506] border border-white/[0.06] rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setSalaryType('SALARY')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    salaryType === 'SALARY'
                      ? 'bg-white/[0.08] text-white border border-white/10 shadow-sm'
                      : 'text-[#8A8F98] hover:text-white'
                  }`}
                >
                  Salary
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryType('BONUS')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    salaryType === 'BONUS'
                      ? 'bg-white/[0.08] text-white border border-white/10 shadow-sm'
                      : 'text-[#8A8F98] hover:text-white'
                  }`}
                >
                  Bonus / Extra
                </button>
              </div>

              <form onSubmit={handleAddSalary} className="space-y-4">
                <div>
                  <label className="block text-[#8A8F98] text-xs font-medium mb-1.5">
                    {salaryType === 'SALARY' ? 'Salary Amount' : 'Bonus Amount'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={salAmount}
                    onChange={(e) => setSalAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-lg text-white placeholder-[#8A8F98]/50 text-sm focus:outline-none focus:border-[#5E6AD2] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8A8F98] text-xs font-medium mb-1.5">Month</label>
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
                    <label className="block text-[#8A8F98] text-xs font-medium mb-1.5">Year</label>
                    <input
                      type="number"
                      value={salYear}
                      onChange={(e) => setSalYear(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                    />
                  </div>
                </div>

                {salError && (
                  <p className="text-xs text-rose-400">{salError}</p>
                )}

                <button
                  type="submit"
                  disabled={salLoading}
                  className="btn-linear-primary w-full py-2.5 text-xs font-medium flex items-center justify-center cursor-pointer"
                >
                  {salLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : salaryType === 'SALARY' ? "Save Salary Inflow" : "Save Bonus Inflow"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Presets Drawer */}
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
              className="w-full md:max-w-lg bg-[#0a0a0c] border border-white/10 rounded-t-3xl md:rounded-2xl p-6 relative shadow-2xl max-h-[85vh] overflow-y-auto z-10 text-left"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#818cf8]" /> One-Tap Presets
                  </h3>
                  <p className="text-xs text-[#8A8F98] mt-0.5">Quickly prefill a transaction with your common entries</p>
                </div>
                <button onClick={() => setPresetsDrawerOpen(false)} className="text-[#8A8F98] hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
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
                    className="p-3.5 bg-[#050506] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/15 rounded-xl transition-all text-left flex flex-col justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="block text-xs font-medium text-white">{preset.title}</span>
                        <span className="block text-[10px] text-[#8A8F98] mt-0.5 truncate max-w-[130px]">{preset.desc || 'Preset'}</span>
                      </div>
                      <span className="text-base shrink-0">{preset.label.split(' ').pop()}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.04]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#8A8F98]">{preset.type}</span>
                      <span className="text-xs font-mono font-medium text-white">{formatCurrency(preset.amount)}</span>
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
              className="w-full max-w-sm bg-[#0a0a0c] border border-emerald-500/30 rounded-2xl p-6 text-center z-10 shadow-2xl relative"
            >
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Salary Logged</h2>
              <p className="text-emerald-400 text-xs font-mono mt-1">Inflow added to active cycle balance.</p>
              <button
                type="button"
                onClick={() => setSalaryCelebrationOpen(false)}
                className="btn-linear-primary w-full py-2.5 text-xs mt-5 cursor-pointer"
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
