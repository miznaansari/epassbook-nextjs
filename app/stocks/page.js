'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import SpotlightCard from '@/components/ui/SpotlightCard';
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
    '#5E6AD2', // Linear Indigo
    '#06B6D4', // Cyan
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#38BDF8', // Sky
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050506] px-6 text-center select-none relative overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-[#5E6AD2]/10 border border-[#5E6AD2]/30 flex items-center justify-center shadow-lg shadow-[#5E6AD2]/10 mb-4 animate-pulse">
          <Briefcase className="w-6 h-6 text-[#5E6AD2]" />
        </div>
        <h3 className="text-white font-semibold text-base tracking-tight mb-1">Portfolio Ledger</h3>
        <p className="text-slate-400 text-xs font-mono">Syncing market quotes...</p>
      </div>
    );
  }

  const isProfit = summary.totalReturns >= 0;

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-slate-100 selection:bg-[#5E6AD2]/30">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 relative z-10">
        {/* Header Title and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 glass-card p-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[10px] font-mono uppercase tracking-wider rounded-md">
                Groww Portfolio
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                MARKET ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Stock Portfolio
            </h1>
            <p className="text-xs text-slate-400 mt-1">Live market valuations and capital return metrics</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {inMarketHours ? (
              <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto select-none">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-mono text-[11px]">LIVE STREAMING (5s)</span>
              </div>
            ) : (
              <button
                onClick={handleRefresh}
                disabled={refreshing || apiLimitRemaining <= 0}
                className={`btn-linear-secondary text-xs flex items-center justify-center gap-2 w-full sm:w-auto ${
                  apiLimitRemaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={`Daily Refresh Limit: 10 refreshes. Remaining today: ${apiLimitRemaining}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin text-[#5E6AD2]' : ''}`} />
                <span className="font-mono text-[11px]">
                  Refresh ({apiLimitRemaining}/10)
                </span>
              </button>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-linear-primary text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holding</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Portfolio Summary Dashboard Card & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Main Portfolio Overview Panel */}
          <SpotlightCard
            className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[220px]"
            spotlightColor="rgba(94, 106, 210, 0.12)"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]"></span>
                  Portfolio Valuation
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight mt-2">
                  {formatCurrency(summary.totalCurrentValue)}
                </h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300">
                <Briefcase className="w-5 h-5 text-[#5E6AD2]" />
              </div>
            </div>

            {/* Total Invested and Returns Segment */}
            <div className="mt-8 pt-4 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Invested Capital</span>
                <p className="text-base sm:text-lg font-mono font-semibold text-slate-200 mt-1">
                  {formatCurrency(summary.totalInvested)}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Net Returns</span>
                <p className={`text-base sm:text-lg font-mono font-semibold mt-1 flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : ''}{formatCurrency(summary.totalReturns)}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Gain / Loss</span>
                <p className={`text-base sm:text-lg font-mono font-bold mt-1 flex items-center gap-1.5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                  {isProfit ? '+' : ''}{summary.totalReturnsPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </SpotlightCard>

          {/* Allocation Recharts Card */}
          <SpotlightCard
            className="p-5 flex flex-col justify-between min-h-[220px]"
            spotlightColor="rgba(6, 182, 212, 0.1)"
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full"></span>
                Asset Allocation
              </span>
            </div>

            <div className="h-40 w-full flex items-center justify-center my-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={4}
                      stroke="rgba(10,10,12,0.8)"
                      strokeWidth={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0c',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center text-slate-500 text-xs gap-2 py-4">
                  <Coins className="w-8 h-8 opacity-25" />
                  <span>No holdings logged</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-h-16 overflow-y-auto">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>

        {/* Portfolio Performance Chart */}
        {holdings.length > 0 && (
          <SpotlightCard className="p-6 mb-6 text-left" spotlightColor="rgba(94, 106, 210, 0.08)">
            <div className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#5E6AD2] rounded-full"></span>
                  Capital Allocation vs Value
                </span>
                <h2 className="text-base font-semibold text-white mt-1">Invested vs Current Market Price</h2>
              </div>
              <div className="flex gap-4 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#5E6AD2]"></span> Invested
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#06B6D4]"></span> Current
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={(val) => formatCurrency(val).replace(/\.00$/, '')} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0c',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                    }}
                    formatter={(value) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="Invested" fill="#5E6AD2" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Current" fill="#06B6D4" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>
        )}

        {/* Holdings Table Section */}
        <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#5E6AD2]" /> Holdings Ledger
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Active equity positions and individual cost basis</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-lg self-start sm:self-auto">
              {holdings.length} {holdings.length === 1 ? 'POSITION' : 'POSITIONS'}
            </span>
          </div>

          {holdings.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3 border border-dashed border-white/[0.06] rounded-xl">
              <Coins className="w-10 h-10 text-slate-600 opacity-40 animate-pulse" />
              <h4 className="text-slate-300 font-medium text-sm">No Stock Holdings Registered</h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Add your shares of stock to automatically track live portfolio valuations and returns.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 btn-linear-secondary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Share</span>
              </button>
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Avg Buy</th>
                      <th className="py-3 px-4 text-right">Current</th>
                      <th className="py-3 px-4 text-right">Invested</th>
                      <th className="py-3 px-4 text-right">Market Value</th>
                      <th className="py-3 px-4 text-right">P&L Returns</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                    {holdings.map((h) => {
                      const rowProfit = h.totalReturns >= 0;
                      const isExpanded = expandedSymbol === h.symbol;
                      return (
                        <Fragment key={h.symbol}>
                          <tr 
                            onClick={() => setExpandedSymbol(isExpanded ? null : h.symbol)}
                            className="hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="text-slate-500 shrink-0">
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[#5E6AD2]" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-200 font-sans text-xs">{h.name}</div>
                                  <div className="text-[10px] text-[#818cf8] font-mono mt-0.5">{h.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right text-slate-300 font-semibold">{h.quantity}</td>
                            <td className="py-4 px-4 text-right text-slate-400">{formatCurrency(h.buyPrice)}</td>
                            <td className="py-4 px-4 text-right text-slate-200 font-semibold">{formatCurrency(h.currentPrice)}</td>
                            <td className="py-4 px-4 text-right text-slate-400">{formatCurrency(h.investedValue)}</td>
                            <td className="py-4 px-4 text-right font-bold text-white">{formatCurrency(h.currentValue)}</td>
                            <td className="py-4 px-4 text-right">
                              <div className={`font-semibold ${rowProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {rowProfit ? '+' : ''}{formatCurrency(h.totalReturns)}
                              </div>
                              <div className={`text-[10px] font-mono mt-0.5 ${rowProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                                {rowProfit ? '+' : ''}{h.returnsPercentage.toFixed(2)}%
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded hover:border-white/[0.12] transition-all">
                                {isExpanded ? 'Hide' : 'Details'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-[#050506]/70">
                              <td colSpan={8} className="py-3 px-6">
                                <div className="border-l-2 border-[#5E6AD2]/60 pl-4 py-2 my-1 space-y-2 text-left">
                                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]"></span>
                                    Purchase History & Cost Lots
                                  </div>
                                  <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a0c] max-w-3xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[9px] uppercase font-mono tracking-wider text-slate-400">
                                          <th className="py-2 px-3">Date</th>
                                          <th className="py-2 px-3 text-right">Qty</th>
                                          <th className="py-2 px-3 text-right">Buy Price</th>
                                          <th className="py-2 px-3 text-right">Cost</th>
                                          <th className="py-2 px-3 text-right">Unrealized P&L</th>
                                          <th className="py-2 px-3 text-center">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/[0.03] font-mono text-xs">
                                        {h.purchases.map((p) => {
                                          const pInvested = p.quantity * p.buyPrice;
                                          const pCurrentValue = p.quantity * h.currentPrice;
                                          const pReturns = pCurrentValue - pInvested;
                                          const pReturnsPercentage = p.buyPrice > 0 ? ((h.currentPrice - p.buyPrice) / p.buyPrice) * 100 : 0;
                                          const pProfit = pReturns >= 0;

                                          return (
                                            <tr key={p.id} className="hover:bg-white/[0.02]">
                                              <td className="py-2 px-3 text-slate-400 text-[11px]">
                                                {new Date(p.createdAt).toLocaleDateString(undefined, {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: 'numeric'
                                                })}
                                              </td>
                                              <td className="py-2 px-3 text-right text-slate-300 font-semibold">{p.quantity}</td>
                                              <td className="py-2 px-3 text-right text-slate-400">{formatCurrency(p.buyPrice)}</td>
                                              <td className="py-2 px-3 text-right text-slate-300">{formatCurrency(pInvested)}</td>
                                              <td className="py-2 px-3 text-right">
                                                <div className={`font-semibold ${pProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                  {pProfit ? '+' : ''}{formatCurrency(pReturns)}
                                                </div>
                                                <div className={`text-[9px] ${pProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                                                  {pProfit ? '+' : ''}{pReturnsPercentage.toFixed(2)}%
                                                </div>
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteHolding(p.id, `${h.name} (Bought for ${formatCurrency(p.buyPrice)})`);
                                                  }}
                                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                                  title="Delete this purchase record"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
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
              <div className="md:hidden space-y-3">
                {holdings.map((h) => {
                  const rowProfit = h.totalReturns >= 0;
                  const isExpanded = expandedSymbol === h.symbol;
                  return (
                    <div 
                      key={h.symbol} 
                      className="bg-[#0a0a0c] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3 relative hover:border-white/[0.1] transition-all"
                    >
                      {/* Ticker & Name & Expand toggle */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-10 text-left">
                          <h4 className="font-semibold text-white truncate text-xs font-sans">{h.name}</h4>
                          <span className="inline-block text-[9px] text-[#818cf8] bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 px-1.5 py-0.5 rounded font-mono mt-1">
                            {h.symbol}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSymbol(isExpanded ? null : h.symbol);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.06] rounded-lg transition-all cursor-pointer"
                          title="Toggle Purchase History"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#5E6AD2]" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Info Row 1: Qty & Buy Price */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/[0.04] font-mono">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Quantity</span>
                          <span className="font-semibold text-slate-200 text-xs">{h.quantity}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Avg Buy</span>
                          <span className="font-semibold text-slate-300 text-xs">{formatCurrency(h.buyPrice)}</span>
                        </div>
                      </div>

                      {/* Info Row 2: Invested vs Current Value */}
                      <div className="grid grid-cols-2 gap-4 text-xs py-1 font-mono">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Invested</span>
                          <span className="text-slate-400 text-xs">{formatCurrency(h.investedValue)}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Market Value</span>
                          <span className="font-bold text-white text-xs">{formatCurrency(h.currentValue)}</span>
                        </div>
                      </div>

                      {/* Info Row 3: Current Price and Returns */}
                      <div className="bg-[#050506] border border-white/[0.04] p-2.5 rounded-lg flex items-center justify-between font-mono">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Current Price</span>
                          <span className="text-slate-300 font-semibold text-xs">{formatCurrency(h.currentPrice)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Total Returns</span>
                          <div className={`font-semibold text-xs ${rowProfit ? 'text-emerald-400' : 'text-rose-400'} flex items-center justify-end gap-1.5`}>
                            {rowProfit ? '+' : ''}{formatCurrency(h.totalReturns)}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${rowProfit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {rowProfit ? '+' : ''}{h.returnsPercentage.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Mobile Purchase History */}
                      {isExpanded && (
                        <div className="mt-2 pt-3 border-t border-white/[0.06] space-y-2 text-left">
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">
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
                                  className="bg-[#050506] border border-white/[0.04] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono"
                                >
                                  <div>
                                    <div className="text-slate-400 text-[10px]">
                                      {new Date(p.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </div>
                                    <div className="text-[11px] text-slate-300 mt-0.5">
                                      {p.quantity} shares @ {formatCurrency(p.buyPrice)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      Cost: {formatCurrency(pInvested)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <div className="text-right">
                                      <div className={`text-xs font-semibold ${pProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pProfit ? '+' : ''}{formatCurrency(pReturns)}
                                      </div>
                                      <span className={`inline-block text-[9px] px-1 py-0.2 rounded ${pProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pProfit ? '+' : ''}{pReturnsPercentage.toFixed(2)}%
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteHolding(p.id, `${h.name} (Bought for ${formatCurrency(p.buyPrice)})`);
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
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
      <footer className="border-t border-white/[0.06] bg-[#050506]/60 backdrop-blur-xl py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs font-mono">
          <p>© {new Date().getFullYear()} ePassbook Portfolio. Real-time Equity Analytics.</p>
          <div className="flex gap-4">
            <span className="text-slate-400">Finnhub & Yahoo Finance APIs</span>
          </div>
        </div>
      </footer>

      {/* Add Stock Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-md bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-linear-elevated p-6 overflow-hidden max-h-[90vh] overflow-y-auto text-left"
            >
              {/* Top hairline specular highlight */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 flex items-center justify-center text-[#5E6AD2]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Log Share Purchase</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Add equity position or lots</span>
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium rounded-xl">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddStock} className="space-y-4">
                {/* Autocomplete Search input */}
                <div className="relative" ref={searchContainerRef}>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Search Ticker or Company
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin text-[#5E6AD2]" /> : <Search className="w-4 h-4" />}
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedStock) setSelectedStock(null);
                      }}
                      placeholder="e.g. AAPL, RELIANCE, TSLA"
                      className="w-full pl-9 pr-4 py-2.5 bg-[#050506] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/40 transition-all font-mono"
                      autoComplete="off"
                    />
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-[#0a0a0c] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-[110] divide-y divide-white/[0.04]">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedStock(item);
                            setSearchQuery(`${item.name} (${item.symbol})`);
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-[#5E6AD2]/10 text-xs text-slate-200 transition-colors flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <div className="font-medium text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.type}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-[#818cf8] rounded">
                            {item.symbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Stock confirmation badge */}
                  {selectedStock && (
                    <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between">
                      <span className="text-[11px] font-medium text-emerald-400">
                        Selected: <strong className="text-white">{selectedStock.name}</strong> ({selectedStock.symbol})
                      </span>
                      <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">VERIFIED</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Quantity Input */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/40 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* Price Input */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Buy Price
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      placeholder="e.g. 150.00"
                      className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/40 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Transaction & Salary Balance Options */}
                <div className="p-3.5 bg-[#050506] border border-white/[0.06] rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="recordTransactionCheckbox"
                      checked={recordTransaction}
                      onChange={(e) => setRecordTransaction(e.target.checked)}
                      className="w-4 h-4 accent-[#5E6AD2] cursor-pointer rounded"
                    />
                    <label htmlFor="recordTransactionCheckbox" className="text-xs font-medium text-slate-200 cursor-pointer select-none">
                      Record in Passbook Ledger
                    </label>
                  </div>

                  {recordTransaction && (
                    <div className="space-y-3 pt-2.5 border-t border-white/[0.06]">
                      {/* Transaction Type */}
                      <div>
                        <label className="block text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                          Ledger Category
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#0a0a0c] border border-white/[0.06] rounded-lg">
                          <button
                            type="button"
                            onClick={() => setTransactionType('SAVINGS')}
                            className={`py-1.5 text-[10px] font-mono uppercase rounded transition-all cursor-pointer ${
                              transactionType === 'SAVINGS'
                                ? 'bg-[#5E6AD2] text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Savings (Invest)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransactionType('SPENDING')}
                            className={`py-1.5 text-[10px] font-mono uppercase rounded transition-all cursor-pointer ${
                              transactionType === 'SPENDING'
                                ? 'bg-[#5E6AD2] text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Spending (Cost)
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
                          className="w-4 h-4 accent-[#5E6AD2] cursor-pointer rounded"
                        />
                        <label htmlFor="useSalaryBalanceCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                          Deduct from monthly salary balance
                        </label>
                      </div>

                      {useSalaryBalance && (
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-slate-400 text-[9px] font-mono uppercase tracking-wider mb-1">
                              Salary Month
                            </label>
                            <select
                              value={salaryMonth}
                              onChange={(e) => setSalaryMonth(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-white/[0.08] rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2] font-mono"
                            >
                              {monthsList.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[9px] font-mono uppercase tracking-wider mb-1">
                              Salary Year
                            </label>
                            <input
                              type="number"
                              value={salaryYear}
                              onChange={(e) => setSalaryYear(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-white/[0.08] rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2] font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1 btn-linear-secondary text-xs py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding || !selectedStock}
                    className="flex-1 btn-linear-primary text-xs py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
