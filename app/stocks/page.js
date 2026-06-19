'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Briefcase,
  Loader2,
  X,
  ArrowUpRight,
  TrendingUp as ProfitIcon,
  HelpCircle,
  Percent,
  Coins,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { isMarketHours } from '@/lib/market';

export default function StocksPage() {
  const { user, loading: authLoading } = useAuth();
  
  // State variables
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalReturns: 0,
    totalReturnsPercentage: 0,
  });
  const [apiLimitRemaining, setApiLimitRemaining] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState(null);

  // Add stock modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');

  // Transaction integration states
  const [recordTransaction, setRecordTransaction] = useState(true);
  const [useSalaryBalance, setUseSalaryBalance] = useState(true);
  const [transactionType, setTransactionType] = useState('SAVINGS');
  const [salaryMonth, setSalaryMonth] = useState((new Date().getMonth() + 1).toString());
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear().toString());

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

  const resetForm = () => {
    setSelectedStock(null);
    setSearchQuery('');
    setQuantity('');
    setBuyPrice('');
    setRecordTransaction(true);
    setUseSalaryBalance(true);
    setTransactionType('SAVINGS');
    setSalaryMonth((new Date().getMonth() + 1).toString());
    setSalaryYear(new Date().getFullYear().toString());
    setFormError('');
  };

  // UI helper ref for autocomplete dropdown click outside detection
  const searchContainerRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch holdings data
  const fetchHoldings = async (showSilently = false) => {
    if (!showSilently) setLoading(true);
    try {
      const res = await fetch('/api/stocks/holdings');
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings || []);
        setSummary(data.summary || {
          totalInvested: 0,
          totalCurrentValue: 0,
          totalReturns: 0,
          totalReturnsPercentage: 0,
        });
        setApiLimitRemaining(data.apiLimitRemaining ?? 10);
      } else {
        setError('Failed to fetch stock holdings.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading holdings.');
    } finally {
      setLoading(false);
    }
  };

  const [inMarketHours, setInMarketHours] = useState(false);

  // Check market hours status on mount and update it periodically
  useEffect(() => {
    const checkMarketStatus = () => {
      setInMarketHours(isMarketHours());
    };
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchHoldings();
    }
  }, [user]);

  // Polling effect: Poll every 5 seconds during market hours
  useEffect(() => {
    if (!user || !inMarketHours) return;

    const pollRefresh = async () => {
      try {
        const res = await fetch('/api/stocks/refresh', {
          method: 'POST',
        });
        if (res.ok) {
          await fetchHoldings(true);
        }
      } catch (err) {
        console.error('Polling error during market hours:', err);
      }
    };

    // Initial delay/trigger, then poll every 5 seconds
    const interval = setInterval(pollRefresh, 5000);
    return () => clearInterval(interval);
  }, [user, inMarketHours]);

  // Handle click outside search dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.result || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle Refresh prices
  const handleRefresh = async () => {
    if (refreshing || apiLimitRemaining <= 0) return;
    setRefreshing(true);
    setError('');
    try {
      const res = await fetch('/api/stocks/refresh', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        await fetchHoldings(true);
      } else {
        setError(data.message || 'Failed to refresh prices.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Add Stock Holding
  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!selectedStock) {
      setFormError('Please select a stock from the autocomplete list.');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      setFormError('Please enter a valid quantity.');
      return;
    }
    if (!buyPrice || parseFloat(buyPrice) <= 0) {
      setFormError('Please enter a valid buy price.');
      return;
    }

    setAdding(true);
    setFormError('');
    try {
      const res = await fetch('/api/stocks/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          quantity: parseInt(quantity),
          buyPrice: parseFloat(buyPrice),
          recordTransaction,
          useSalaryBalance: recordTransaction ? useSalaryBalance : false,
          transactionType,
          salaryMonth: recordTransaction && useSalaryBalance ? parseInt(salaryMonth) : undefined,
          salaryYear: recordTransaction && useSalaryBalance ? parseInt(salaryYear) : undefined,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        // Reload data
        await fetchHoldings();
      } else {
        const errData = await res.json();
        setFormError(errData.error || errData.message || 'Failed to add holding.');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred while adding holding.');
    } finally {
      setAdding(false);
    }
  };

  // Handle Delete Stock Holding
  const handleDeleteHolding = async (id, name) => {
    if (!confirm(`Are you sure you want to delete your holding in ${name}?`)) return;
    try {
      const res = await fetch(`/api/stocks/holdings?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchHoldings();
      } else {
        setError('Failed to delete holding.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during deletion.');
    }
  };

  // Format helper
  const formatCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(val || 0);
  };

  // Chart Data preparation
  const chartData = holdings.map(h => ({
    name: h.symbol.split('.')[0], // Short symbol
    value: h.currentValue,
  })).filter(item => item.value > 0);

  const performanceData = holdings.map(h => ({
    name: h.symbol.split('.')[0],
    Invested: h.investedValue,
    Current: h.currentValue,
  }));

  const COLORS = [
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#f43f5e', // Rose
    '#d946ef', // Fuchsia
    '#3b82f6', // Blue
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] px-6 text-center select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-violet-600/5 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-6"></div>
          <h3 className="text-white font-extrabold text-lg tracking-tight mb-1">Stock Portfolio</h3>
          <p className="text-slate-400 text-xs font-semibold animate-pulse">Loading holdings ledger...</p>
        </div>
      </div>
    );
  }

  const isProfit = summary.totalReturns >= 0;

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#030712] text-slate-100 selection:bg-violet-500/30">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-gradient-to-br from-violet-600/10 to-cyan-500/0 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-gradient-to-tr from-emerald-500/5 to-amber-500/0 rounded-full blur-[140px] pointer-events-none z-0"></div>

      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 relative z-10">
        
        {/* Header Title and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 glass-card p-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                Groww Portfolio
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Stock Assets</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Share Holdings
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {inMarketHours ? (
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto select-none shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Auto-Refreshing (Every 5s)</span>
              </div>
            ) : (
              <button
                onClick={handleRefresh}
                disabled={refreshing || apiLimitRemaining <= 0}
                className={`px-4 py-2 border text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md w-full sm:w-auto ${
                  apiLimitRemaining <= 0
                    ? 'bg-slate-900/40 border-white/5 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-950/80 border-white/10 hover:border-white/20 hover:bg-slate-900 text-white cursor-pointer'
                }`}
                title={`Daily Refresh Limit: 10 refreshes. Remaining today: ${apiLimitRemaining}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>
                  <span className="inline sm:hidden">Refresh ({apiLimitRemaining}/10)</span>
                  <span className="hidden sm:inline">Refresh Prices ({apiLimitRemaining}/10 remaining)</span>
                </span>
              </button>
            )}
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-violet-600/20 active:scale-95 cursor-pointer font-black tracking-wider uppercase w-full sm:w-auto shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Share
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Portfolio Summary Dashboard Card & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Main Portfolio Overview Panel */}
          <div className="lg:col-span-2 relative overflow-hidden glass-card p-6 flex flex-col justify-between min-h-[200px]">
            <div className="absolute right-0 top-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span> Total Portfolio Value
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2 flex items-baseline gap-1.5">
                  {formatCurrency(summary.totalCurrentValue)}
                </h2>
              </div>
              <span className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl shadow-inner">
                <Briefcase className="w-6 h-6" />
              </span>
            </div>

            {/* Total Invested and Returns Segment */}
            <div className="mt-8 pt-4 border-t border-white/[0.05] grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Invested</span>
                <p className="text-lg font-bold text-slate-300 mt-0.5">{formatCurrency(summary.totalInvested)}</p>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Returns</span>
                <p className={`text-lg font-bold mt-0.5 flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : ''}{formatCurrency(summary.totalReturns)}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Returns %</span>
                <p className={`text-lg font-black mt-0.5 flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isProfit ? '+' : ''}{summary.totalReturnsPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Allocation Recharts Card */}
          <div className="glass-card p-5 flex flex-col justify-between min-h-[200px]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span> Portfolio Allocation
              </span>
            </div>
            
            <div className="h-44 w-full flex items-center justify-center my-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'inherit',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center text-slate-500 text-xs gap-2 py-4">
                  <Coins className="w-8 h-8 opacity-25" />
                  <span>No allocation data available</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-h-16 overflow-y-auto">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Performance Chart */}
        {holdings.length > 0 && (
          <div className="glass-card p-6 mb-8 text-left">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></span> Portfolio Growth
                </span>
                <h2 className="text-lg font-black text-white mt-1">Invested Capital vs Current Market Value</h2>
              </div>
              <div className="flex gap-4 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-violet-600"></span> Invested
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-cyan-500"></span> Current Value
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} tickFormatter={(val) => formatCurrency(val).replace(/\.00$/, '')} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                    }}
                    formatter={(value) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="Invested" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Current" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Holdings Table Section */}
        <div className="glass-card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-violet-400" /> Holdings Ledger
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Individual shares and returns</p>
          </div>

          {holdings.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <Coins className="w-12 h-12 text-slate-600 opacity-30 animate-pulse" />
              <h4 className="text-slate-400 font-extrabold text-sm">No Stock Holdings Registered</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Add your shares of stock (e.g. Adani Power, Apple) to automatically monitor current values and returns.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 px-4 py-2 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Log First Share
              </button>
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] uppercase tracking-wider text-slate-500 font-black">
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Avg Buy Price</th>
                      <th className="py-3 px-4 text-right">Current Price</th>
                      <th className="py-3 px-4 text-right">Invested Value</th>
                      <th className="py-3 px-4 text-right">Current Value</th>
                      <th className="py-3 px-4 text-right">Total Returns</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-xs font-semibold">
                    {holdings.map((h) => {
                      const rowProfit = h.totalReturns >= 0;
                      const isExpanded = expandedSymbol === h.symbol;
                      return (
                        <Fragment key={h.symbol}>
                          <tr 
                            onClick={() => setExpandedSymbol(isExpanded ? null : h.symbol)}
                            className="hover:bg-white/[0.01] transition-colors cursor-pointer select-none"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="text-slate-500 shrink-0">
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-200">{h.name}</div>
                                  <div className="text-[10px] text-slate-500 font-bold tracking-wider mt-0.5">{h.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right font-mono font-bold text-slate-300">{h.quantity}</td>
                            <td className="py-4 px-4 text-right font-mono text-slate-400">{formatCurrency(h.buyPrice)}</td>
                            <td className="py-4 px-4 text-right font-mono text-slate-200">{formatCurrency(h.currentPrice)}</td>
                            <td className="py-4 px-4 text-right font-mono text-slate-400">{formatCurrency(h.investedValue)}</td>
                            <td className="py-4 px-4 text-right font-mono font-bold text-slate-200">{formatCurrency(h.currentValue)}</td>
                            <td className="py-4 px-4 text-right">
                              <div className={`font-mono font-bold ${rowProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {rowProfit ? '+' : ''}{formatCurrency(h.totalReturns)}
                              </div>
                              <div className={`text-[10px] font-bold mt-0.5 ${rowProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {rowProfit ? '+' : ''}{h.returnsPercentage.toFixed(2)}%
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              {isExpanded ? 'Hide' : 'View'}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-950/40">
                              <td colSpan={8} className="py-3 px-6">
                                <div className="border-l-2 border-violet-500/50 pl-4 py-2 my-1 space-y-2 text-left">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Purchase History / Ledger Transactions
                                  </div>
                                  <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950/60 max-w-3xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] uppercase tracking-wider text-slate-500 font-black">
                                          <th className="py-2 px-3">Purchase Date</th>
                                          <th className="py-2 px-3 text-right">Quantity</th>
                                          <th className="py-2 px-3 text-right">Purchase Price</th>
                                          <th className="py-2 px-3 text-right">Total Invested</th>
                                          <th className="py-2 px-3 text-right">Returns (P&L)</th>
                                          <th className="py-2 px-3 text-center">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/[0.02] font-semibold">
                                        {h.purchases.map((p) => {
                                          const pInvested = p.quantity * p.buyPrice;
                                          const pCurrentValue = p.quantity * h.currentPrice;
                                          const pReturns = pCurrentValue - pInvested;
                                          const pReturnsPercentage = p.buyPrice > 0 ? ((h.currentPrice - p.buyPrice) / p.buyPrice) * 100 : 0;
                                          const pProfit = pReturns >= 0;

                                          return (
                                            <tr key={p.id} className="hover:bg-white/[0.01]">
                                              <td className="py-2 px-3 text-slate-400 font-mono">
                                                {new Date(p.createdAt).toLocaleDateString(undefined, {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </td>
                                              <td className="py-2 px-3 text-right text-slate-300 font-mono">{p.quantity}</td>
                                              <td className="py-2 px-3 text-right text-slate-350 font-mono">{formatCurrency(p.buyPrice)}</td>
                                              <td className="py-2 px-3 text-right text-slate-200 font-mono">{formatCurrency(pInvested)}</td>
                                              <td className="py-2 px-3 text-right font-mono">
                                                <div className={`font-bold ${pProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                  {pProfit ? '+' : ''}{formatCurrency(pReturns)}
                                                </div>
                                                <div className={`text-[9px] font-bold ${pProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                  {pProfit ? '+' : ''}{pReturnsPercentage.toFixed(2)}%
                                                </div>
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteHolding(p.id, `${h.name} (Bought for ${formatCurrency(p.buyPrice)})`);
                                                  }}
                                                  className="p-1 text-slate-500 hover:text-rose-450 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                                                  title="Delete this purchase transaction"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="md:hidden space-y-4">
                {holdings.map((h) => {
                  const rowProfit = h.totalReturns >= 0;
                  const isExpanded = expandedSymbol === h.symbol;
                  return (
                    <div 
                      key={h.symbol} 
                      className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 relative hover:border-white/[0.08] transition-all"
                    >
                      {/* Ticker & Name & Expand toggle */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-10 text-left">
                          <h4 className="font-extrabold text-slate-100 truncate text-xs">{h.name}</h4>
                          <span className="inline-block text-[8px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded font-black tracking-wider uppercase mt-1">
                            {h.symbol}
                          </span>
                        </div>
                        {/* Expand/Collapse Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSymbol(isExpanded ? null : h.symbol);
                          }}
                          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all cursor-pointer"
                          title="Toggle Purchase History"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Info Row 1: Qty & Buy Price */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/[0.04]">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Quantity</span>
                          <span className="font-mono font-bold text-slate-200 text-xs">{h.quantity}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Avg Buy Price</span>
                          <span className="font-mono font-bold text-slate-350 text-xs">{formatCurrency(h.buyPrice)}</span>
                        </div>
                      </div>

                      {/* Info Row 2: Invested vs Current Value */}
                      <div className="grid grid-cols-2 gap-4 text-xs py-1">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Invested Value</span>
                          <span className="font-mono font-bold text-slate-400 text-xs">{formatCurrency(h.investedValue)}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Current Value</span>
                          <span className="font-mono font-bold text-slate-200 text-xs">{formatCurrency(h.currentValue)}</span>
                        </div>
                      </div>

                      {/* Info Row 3: Current Price and Returns */}
                      <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl flex items-center justify-between mt-1">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Current Price</span>
                          <span className="font-mono text-slate-300 font-bold text-xs">{formatCurrency(h.currentPrice)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Returns</span>
                          <div className={`font-mono font-bold text-xs ${rowProfit ? 'text-emerald-400' : 'text-rose-400'} flex items-center justify-end gap-1`}>
                            {rowProfit ? '+' : ''}{formatCurrency(h.totalReturns)}
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${rowProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {rowProfit ? '+' : ''}{h.returnsPercentage.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Mobile Purchase History */}
                      {isExpanded && (
                        <div className="mt-2 pt-3 border-t border-white/[0.05] space-y-2 text-left">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">
                            Purchase Transactions
                          </span>
                          <div className="space-y-2">
                            {h.purchases.map((p) => {
                              const pInvested = p.quantity * p.buyPrice;
                              const pCurrentValue = p.quantity * h.currentPrice;
                              const pReturns = pCurrentValue - pInvested;
                              const pReturnsPercentage = p.buyPrice > 0 ? ((h.currentPrice - p.buyPrice) / p.buyPrice) * 100 : 0;
                              const pProfit = pReturns >= 0;

                              return (
                                <div 
                                  key={p.id} 
                                  className="bg-slate-950/45 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold"
                                >
                                  <div>
                                    <div className="text-slate-400 font-mono text-[9px]">
                                      {new Date(p.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                                      {p.quantity} shares @ {formatCurrency(p.buyPrice)}
                                    </div>
                                    <div className="text-[9px] text-slate-450 mt-0.5 font-bold">
                                      Cost: {formatCurrency(pInvested)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className={`font-mono text-xs font-bold ${pProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pProfit ? '+' : ''}{formatCurrency(pReturns)}
                                      </div>
                                      <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded ${pProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {pProfit ? '+' : ''}{pReturnsPercentage.toFixed(2)}%
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteHolding(p.id, `${h.name} (Bought for ${formatCurrency(p.buyPrice)})`);
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-rose-450 hover:bg-rose-500/5 rounded-lg border border-white/5 transition-all cursor-pointer"
                                      title="Delete this transaction"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/20 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs font-semibold">
          <p>© {new Date().getFullYear()} MonthlyMoney Share Tracker. Groww Engine Integration.</p>
          <div className="flex gap-6">
            <span>Powered by Finnhub & Yahoo Finance APIs</span>
          </div>
        </div>
      </footer>

      {/* Add Stock Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-gradient-to-b from-slate-900/70 to-slate-950/70 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] text-left scrollbar-thin"
            >
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-600/10 text-violet-400 rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Log Share Purchase</h3>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Add holding details</span>
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddStock} className="space-y-4">
                {/* Autocomplete Search input */}
                <div className="relative" ref={searchContainerRef}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Share Name / Ticker
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> : <Search className="w-4 h-4" />}
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedStock) setSelectedStock(null); // Reset selection on edits
                      }}
                      placeholder="e.g. Adani Power, Apple"
                      className="w-full pl-9 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all font-semibold"
                      autoComplete="off"
                    />
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-[110] divide-y divide-white/[0.04]">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedStock(item);
                            setSearchQuery(`${item.name} (${item.symbol})`);
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-violet-600/15 text-xs font-semibold text-slate-200 transition-colors flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <div className="font-extrabold text-white">{item.name}</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{item.type}</div>
                          </div>
                          <span className="px-2 py-1 bg-white/5 border border-white/5 text-[9px] font-mono text-slate-400 rounded-lg">
                            {item.symbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Stock confirmation badge */}
                  {selectedStock && (
                    <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400">
                        Selected: <strong className="text-white">{selectedStock.name}</strong> ({selectedStock.symbol})
                      </span>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.5 rounded uppercase">Verified</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity Input */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 4"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all font-semibold"
                      required
                    />
                  </div>

                  {/* Price Input */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Buy Price (per share)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      placeholder="e.g. 150.00"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Transaction & Salary Balance Options */}
                <div className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="recordTransactionCheckbox"
                      checked={recordTransaction}
                      onChange={(e) => setRecordTransaction(e.target.checked)}
                      className="w-4 h-4 accent-violet-600 cursor-pointer"
                    />
                    <label htmlFor="recordTransactionCheckbox" className="text-xs font-bold text-white cursor-pointer select-none">
                      Record in E-Passbook Ledger
                    </label>
                  </div>

                  {recordTransaction && (
                    <div className="space-y-3 pt-2.5 border-t border-white/5">
                      {/* Transaction Type */}
                      <div>
                        <label className="block text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1.5">
                          Ledger Category
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#0b0f19] border border-white/10 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setTransactionType('SAVINGS')}
                            className={`py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                              transactionType === 'SAVINGS'
                                ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow'
                                : 'text-slate-500 hover:text-slate-350'
                            }`}
                          >
                            Savings (Investment)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransactionType('SPENDING')}
                            className={`py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                              transactionType === 'SPENDING'
                                ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow'
                                : 'text-slate-500 hover:text-slate-350'
                            }`}
                          >
                            Spending (Expense)
                          </button>
                        </div>
                      </div>

                      {/* Deduct from Salary */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useSalaryBalanceCheckbox"
                          checked={useSalaryBalance}
                          onChange={(e) => setUseSalaryBalance(e.target.checked)}
                          className="w-4 h-4 accent-violet-600 cursor-pointer"
                        />
                        <label htmlFor="useSalaryBalanceCheckbox" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                          Deduct from monthly salary balance
                        </label>
                      </div>

                      {useSalaryBalance && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-slate-500 text-[9px] font-black uppercase tracking-wider mb-1">
                              Salary Month
                            </label>
                            <select
                              value={salaryMonth}
                              onChange={(e) => setSalaryMonth(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500"
                            >
                              {monthsList.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-500 text-[9px] font-black uppercase tracking-wider mb-1">
                              Salary Year
                            </label>
                            <input
                              type="number"
                              value={salaryYear}
                              onChange={(e) => setSalaryYear(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500 font-semibold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding || !selectedStock}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-violet-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase font-black tracking-wider"
                  >
                    {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Save Holding</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
