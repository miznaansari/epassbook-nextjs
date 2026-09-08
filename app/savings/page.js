'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiggyBank,
  Coins,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Search,
  Plus,
  History,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  ChevronRight,
  X,
  Trash2,
  Loader2,
  Percent,
  Layers,
  ArrowRightLeft,
  Check,
  Building,
  RefreshCw,
  ExternalLink,
  Briefcase,
  LineChart as LineChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from 'recharts';

export default function SavingsManagement() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Main Data States
  const [data, setData] = useState({ summary: null, pots: [], sips: [], stocks: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'STOCKS' | 'SIP' | 'WITHDRAWN'

  // Modal States
  const [selectedPotForWithdraw, setSelectedPotForWithdraw] = useState(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDate, setWithdrawDate] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Deposit Modal States
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositPotTitle, setDepositPotTitle] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositUseSalary, setDepositUseSalary] = useState(false);
  const [depositSalaryMonth, setDepositSalaryMonth] = useState('');
  const [depositSalaryYear, setDepositSalaryYear] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositError, setDepositError] = useState('');

  // History Drawer State
  const [selectedPotForHistory, setSelectedPotForHistory] = useState(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch Savings Data
  const fetchSavings = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const res = await fetch('/api/savings');
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Error fetching savings:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavings();
    }
  }, [user]);

  // Refresh live stock prices
  const handleRefreshStockPrices = async () => {
    if (refreshingPrices) return;
    setRefreshingPrices(true);
    try {
      const res = await fetch('/api/stocks/refresh', { method: 'POST' });
      if (res.ok) {
        await fetchSavings();
      }
    } catch (err) {
      console.error('Error refreshing stock prices:', err);
    } finally {
      setRefreshingPrices(false);
    }
  };

  const formatCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(val || 0);
  };

  // Open Withdrawal Modal for a Pot
  const handleOpenWithdraw = (pot) => {
    if (pot.isStock) {
      // Direct user to stocks page for selling shares
      router.push('/stocks');
      return;
    }
    setSelectedPotForWithdraw(pot);
    setWithdrawAmount('');
    setWithdrawDate(new Date().toISOString().split('T')[0]);
    setWithdrawNotes('');
    setWithdrawError('');
    setWithdrawModalOpen(true);
  };

  // Handle Percentage Quick Selection for Withdrawal
  const handleSetWithdrawPercentage = (pct) => {
    if (!selectedPotForWithdraw) return;
    const calculated = (selectedPotForWithdraw.currentBalance * pct) / 100;
    setWithdrawAmount(calculated.toFixed(2));
  };

  // Submit Withdrawal
  const handleConfirmWithdraw = async (e) => {
    e.preventDefault();
    if (!selectedPotForWithdraw || withdrawSubmitting) return;

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }

    if (amt > selectedPotForWithdraw.currentBalance + 0.01) {
      setWithdrawError(`Amount cannot exceed available pot balance of ${formatCurrency(selectedPotForWithdraw.currentBalance)}.`);
      return;
    }

    setWithdrawSubmitting(true);
    setWithdrawError('');

    try {
      const res = await fetch('/api/savings/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          potTitle: selectedPotForWithdraw.title,
          amount: amt,
          date: withdrawDate,
          description: withdrawNotes,
        })
      });

      if (res.ok) {
        setWithdrawModalOpen(false);
        await fetchSavings();
      } else {
        const errData = await res.json().catch(() => ({}));
        setWithdrawError(errData.message || errData.error || 'Failed to process withdrawal.');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      setWithdrawError('An unexpected error occurred. Please try again.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  // Open Deposit Modal
  const handleOpenDeposit = (pot = null) => {
    if (pot?.isStock) {
      router.push('/stocks');
      return;
    }
    const now = new Date();
    setDepositPotTitle(pot ? pot.title : '');
    setDepositAmount('');
    setDepositDate(now.toISOString().split('T')[0]);
    setDepositNotes('');
    setDepositUseSalary(false);
    setDepositSalaryMonth((now.getMonth() + 1).toString());
    setDepositSalaryYear(now.getFullYear().toString());
    setDepositError('');
    setDepositModalOpen(true);
  };

  // Submit Deposit
  const handleConfirmDeposit = async (e) => {
    e.preventDefault();
    if (!depositPotTitle.trim() || depositSubmitting) return;

    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      setDepositError('Please enter a valid deposit amount.');
      return;
    }

    setDepositSubmitting(true);
    setDepositError('');

    try {
      const res = await fetch('/api/savings/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          potTitle: depositPotTitle.trim(),
          amount: amt,
          date: depositDate,
          description: depositNotes,
          useSalaryBalance: depositUseSalary,
          salaryMonth: depositUseSalary ? depositSalaryMonth : undefined,
          salaryYear: depositUseSalary ? depositSalaryYear : undefined,
        })
      });

      if (res.ok) {
        setDepositModalOpen(false);
        await fetchSavings();
      } else {
        const errData = await res.json().catch(() => ({}));
        setDepositError(errData.message || errData.error || 'Failed to deposit into savings.');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setDepositError('An unexpected error occurred. Please try again.');
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Open History Drawer for a Pot
  const handleOpenHistory = (pot) => {
    setSelectedPotForHistory(pot);
    setHistoryDrawerOpen(true);
  };

  // Delete an individual deposit/withdrawal entry from pot history
  const handleDeleteTx = async (txId) => {
    if (!confirm('Are you sure you want to delete this saving transaction?')) return;
    setDeletingTxId(txId);
    try {
      const res = await fetch(`/api/entries?id=${txId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchSavings();
        if (selectedPotForHistory) {
          setSelectedPotForHistory(prev => ({
            ...prev,
            history: prev.history.filter(h => h.id !== txId)
          }));
        }
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    } finally {
      setDeletingTxId(null);
    }
  };

  // Filtered Pots
  const filteredPots = (data?.pots || []).filter(pot => {
    const matchesSearch = pot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pot.stockInfo?.symbol || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return pot.currentBalance > 0;
    if (statusFilter === 'STOCKS') return Boolean(pot.isStock);
    if (statusFilter === 'SIP') return Boolean(pot.linkedSip);
    if (statusFilter === 'WITHDRAWN') return pot.currentBalance === 0 && pot.totalWithdrawn > 0;

    return true;
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#5E6AD2] rounded-full animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || {
    totalAllTimeSaved: 0,
    totalAllTimeWithdrawn: 0,
    netSavingsBalance: 0,
    activePotsCount: 0,
    activeSipsCount: 0,
    totalPotsCount: 0,
    stockSummary: {
      totalStockCurrentValue: 0,
      totalStockInvested: 0,
      totalStockReturns: 0,
      totalStockReturnsPercentage: 0,
      stocksCount: 0
    }
  };

  const stockSummary = summary.stockSummary || {
    totalStockCurrentValue: 0,
    totalStockInvested: 0,
    totalStockReturns: 0,
    totalStockReturnsPercentage: 0,
    stocksCount: 0
  };

  // Chart Timeframe Filter State
  const [chartTimeframe, setChartTimeframe] = useState('ALL'); // 'ALL' | '1Y' | '6M' | '30D'

  // Format compact currency for chart axis ticks
  const formatCompactCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const symbol = currencyCode === 'INR' ? '₹' : '$';
    const abs = Math.abs(val);
    if (abs >= 10000000) return `${symbol}${(val / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${symbol}${(val / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${symbol}${(val / 1000).toFixed(0)}k`;
    return `${symbol}${val}`;
  };

  // Build Chronological Timeline for Cumulative Savings Growth & Withdrawals
  const getSavingsGrowthTimeline = () => {
    if (!data?.pots || data.pots.length === 0) return [];

    const rawEvents = [];

    data.pots.forEach(pot => {
      // 1. Deposits
      (pot.deposits || []).forEach(d => {
        rawEvents.push({
          date: new Date(d.date),
          rawDate: d.date,
          amount: parseFloat(d.amount) || 0,
          type: 'DEPOSIT',
          title: d.title || pot.title,
          potTitle: pot.title,
          isStock: pot.isStock,
        });
      });

      // 2. Withdrawals
      (pot.withdrawals || []).forEach(w => {
        rawEvents.push({
          date: new Date(w.date),
          rawDate: w.date,
          amount: parseFloat(w.amount) || 0,
          type: 'WITHDRAWAL',
          title: w.title || `Withdrawal from ${pot.title}`,
          potTitle: pot.title,
          isStock: false,
        });
      });

      // 3. Fallback for stock pots without standalone deposit entries
      if (pot.isStock && (!pot.deposits || pot.deposits.length === 0) && pot.stockInfo?.investedValue > 0) {
        rawEvents.push({
          date: new Date(pot.lastActivityDate || Date.now()),
          rawDate: pot.lastActivityDate || new Date().toISOString(),
          amount: parseFloat(pot.stockInfo.investedValue) || 0,
          type: 'DEPOSIT',
          title: `Stock Equity (${pot.stockInfo.symbol})`,
          potTitle: pot.title,
          isStock: true,
        });
      }
    });

    if (rawEvents.length === 0) return [];

    // Sort events chronologically from oldest to newest
    rawEvents.sort((a, b) => a.date - b.date);

    let running = 0;
    const points = [];

    // Add starting baseline point (0) right before the first transaction
    const firstDate = new Date(rawEvents[0].date);
    const dayBefore = new Date(firstDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    points.push({
      date: dayBefore.toISOString().split('T')[0],
      name: dayBefore.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: dayBefore.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      Balance: 0,
      change: 0,
      type: 'BASELINE',
      title: 'Ledger Initial',
      potTitle: 'Baseline',
    });

    rawEvents.forEach(evt => {
      if (evt.type === 'DEPOSIT') {
        running += evt.amount;
      } else if (evt.type === 'WITHDRAWAL') {
        running = Math.max(0, running - evt.amount);
      }

      points.push({
        date: evt.rawDate,
        name: evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        Balance: Math.round(running * 100) / 100,
        change: evt.amount,
        type: evt.type,
        title: evt.title,
        potTitle: evt.potTitle,
        isStock: evt.isStock,
      });
    });

    // Timeframe filters
    if (chartTimeframe === '30D') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const filtered = points.filter(p => new Date(p.date) >= cutoff);
      return filtered.length > 1 ? filtered : points;
    } else if (chartTimeframe === '6M') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      const filtered = points.filter(p => new Date(p.date) >= cutoff);
      return filtered.length > 1 ? filtered : points;
    } else if (chartTimeframe === '1Y') {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      const filtered = points.filter(p => new Date(p.date) >= cutoff);
      return filtered.length > 1 ? filtered : points;
    }

    return points;
  };

  const timelineData = getSavingsGrowthTimeline();
  const allTimePeak = timelineData.length > 0 ? Math.max(...timelineData.map(p => p.Balance), 0) : 0;

  // Custom Interactive Tooltip
  const CustomSavingsTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const isDeposit = point.type === 'DEPOSIT';
      const isWithdrawal = point.type === 'WITHDRAWAL';

      return (
        <div className="bg-[#08080a]/95 border border-white/10 p-3.5 rounded-2xl shadow-[0_16px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-left font-sans space-y-2 min-w-[210px]">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98]">
              {point.fullDate || point.name}
            </span>
            {isDeposit && (
              <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-semibold rounded-md flex items-center gap-1">
                <ArrowDownLeft className="w-2.5 h-2.5" /> DEPOSIT
              </span>
            )}
            {isWithdrawal && (
              <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-mono font-semibold rounded-md flex items-center gap-1">
                <ArrowUpRight className="w-2.5 h-2.5" /> WITHDRAWAL
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-[#8A8F98] block">Cumulative Savings Balance</span>
            <span className="text-base font-bold text-white tracking-tight">
              {formatCurrency(point.Balance)}
            </span>
          </div>

          {(isDeposit || isWithdrawal) && (
            <div className="pt-1.5 border-t border-white/[0.06] text-[11px] flex items-center justify-between text-[#8A8F98]">
              <span className="truncate max-w-[130px] font-medium">{point.title}</span>
              <span className={`font-mono font-bold ${isDeposit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isDeposit ? '+' : '-'}{formatCurrency(point.change)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#050506] text-[#EDEDEF] app-sidebar-offset">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 text-left">
        
        {/* Header Titles & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-semibold text-white tracking-tight flex items-center gap-2">
              <PiggyBank className="w-5 h-5 sm:w-7 sm:h-7 text-[#818cf8]" /> Saving Management
            </h1>
            <p className="text-[#8A8F98] text-[11px] sm:text-xs mt-0.5">
              Track savings pots, equity market valuations & SIP plans.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stockSummary.stocksCount > 0 && (
              <button
                type="button"
                disabled={refreshingPrices}
                onClick={handleRefreshStockPrices}
                className="btn-linear-secondary px-2.5 py-1.5 text-[11px] sm:text-xs text-white border-white/10 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Refresh live stock market prices"
              >
                <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${refreshingPrices ? 'animate-spin text-[#818cf8]' : ''}`} />
                <span>{refreshingPrices ? 'Syncing...' : 'Sync Prices'}</span>
              </button>
            )}

            <button
              onClick={() => router.push('/assistant?prompt=Show+my+savings+and+withdrawal+breakdown')}
              className="btn-linear-secondary px-2.5 py-1.5 text-[11px] sm:text-xs text-[#818cf8] border-[#5E6AD2]/30 hover:bg-[#5E6AD2]/10 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>AI Advisor</span>
            </button>

            <button
              onClick={() => handleOpenDeposit()}
              className="btn-linear-primary px-3 py-1.5 text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#5E6AD2]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Pot</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Cards (2 columns on mobile, 4 columns on lg) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
          
          {/* Card 1: Net Savings Balance */}
          <SpotlightCard className="p-3 sm:p-5" spotlightColor="rgba(94, 106, 210, 0.16)">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" /> Net Balance
                </span>
                <div className="mt-1 sm:mt-2">
                  {loadingData ? (
                    <div className="w-16 sm:w-28 h-5 sm:h-7 bg-white/5 rounded animate-pulse" />
                  ) : (
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight truncate">
                      {formatCurrency(summary.netSavingsBalance)}
                    </h2>
                  )}
                  <span className="text-[9px] sm:text-[10px] text-[#8A8F98] block mt-0.5 truncate">Live pot valuation</span>
                </div>
              </div>
              <span className="p-1.5 sm:p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-[#818cf8] rounded-lg sm:rounded-xl shrink-0 ml-1">
                <PiggyBank className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </span>
            </div>
          </SpotlightCard>

          {/* Card 2: Total Lifetime Deposited */}
          <SpotlightCard className="p-3 sm:p-5" spotlightColor="rgba(16, 185, 129, 0.14)">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /> Lifetime Invested
                </span>
                <div className="mt-1 sm:mt-2">
                  {loadingData ? (
                    <div className="w-16 sm:w-28 h-5 sm:h-7 bg-white/5 rounded animate-pulse" />
                  ) : (
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-emerald-400 tracking-tight truncate">
                      {formatCurrency(summary.totalAllTimeSaved)}
                    </h2>
                  )}
                  <span className="text-[9px] sm:text-[10px] text-[#8A8F98] block mt-0.5 truncate">Cost basis invested</span>
                </div>
              </div>
              <span className="p-1.5 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg sm:rounded-xl shrink-0 ml-1">
                <ArrowDownLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </span>
            </div>
          </SpotlightCard>

          {/* Card 3: Stock Equity P&L Returns */}
          <SpotlightCard className="p-3 sm:p-5" spotlightColor={stockSummary.totalStockReturns >= 0 ? "rgba(16, 185, 129, 0.14)" : "rgba(244, 63, 94, 0.14)"}>
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] flex items-center gap-1 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stockSummary.totalStockReturns >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} /> Stock P&L
                </span>
                <div className="mt-1 sm:mt-2">
                  {loadingData ? (
                    <div className="w-16 sm:w-28 h-5 sm:h-7 bg-white/5 rounded animate-pulse" />
                  ) : (
                    <h2 className={`text-base sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate ${stockSummary.totalStockReturns >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stockSummary.totalStockReturns >= 0 ? '+' : ''}{formatCurrency(stockSummary.totalStockReturns)}
                    </h2>
                  )}
                  <span className="text-[9px] sm:text-[10px] text-[#8A8F98] block mt-0.5 truncate">
                    {stockSummary.stocksCount > 0
                      ? `${stockSummary.totalStockReturnsPercentage >= 0 ? '+' : ''}${stockSummary.totalStockReturnsPercentage.toFixed(1)}% equity gain`
                      : '0 stocks'}
                  </span>
                </div>
              </div>
              <span className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border shrink-0 ml-1 ${stockSummary.totalStockReturns >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {stockSummary.totalStockReturns >= 0 ? <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <TrendingDown className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
              </span>
            </div>
          </SpotlightCard>

          {/* Card 4: Active Pots & SIPs */}
          <SpotlightCard className="p-3 sm:p-5" spotlightColor="rgba(245, 158, 11, 0.14)">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> Active Pots
                </span>
                <div className="mt-1 sm:mt-2">
                  {loadingData ? (
                    <div className="w-16 sm:w-28 h-5 sm:h-7 bg-white/5 rounded animate-pulse" />
                  ) : (
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-amber-400 tracking-tight truncate">
                      {summary.activePotsCount} <span className="text-xs font-normal text-[#8A8F98]">Pots</span>
                    </h2>
                  )}
                  <span className="text-[9px] sm:text-[10px] text-[#8A8F98] block mt-0.5 truncate">
                    Withdrawn: {formatCurrency(summary.totalAllTimeWithdrawn)}
                  </span>
                </div>
              </div>
              <span className="p-1.5 sm:p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg sm:rounded-xl shrink-0 ml-1">
                <Coins className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </span>
            </div>
          </SpotlightCard>
        </div>

        {/* Cumulative Savings Growth Curve Line Chart */}
        <div className="mb-8">
          <SpotlightCard className="p-4 sm:p-6" spotlightColor="rgba(94, 106, 210, 0.18)">
            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[9px] font-mono tracking-widest rounded-md uppercase flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Trajectory
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider">Growth Curve</span>
                </div>
                <h2 className="text-base sm:text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#818cf8]" />
                  <span>Savings Growth Timeline</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-[#8A8F98] mt-0.5">
                  Ascends with deposits & SIPs, dips on withdrawals.
                </p>
              </div>

              {/* Stats & Timeframe Filter Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                {allTimePeak > 0 && (
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs">
                    <span className="text-[#8A8F98] font-mono text-[10px] uppercase">All-Time Peak:</span>
                    <span className="font-semibold text-white font-mono">{formatCurrency(allTimePeak)}</span>
                  </div>
                )}

                {/* Timeframe Chips */}
                <div className="flex items-center bg-[#0a0a0c] border border-white/10 rounded-xl p-0.5">
                  {[
                    { id: '30D', label: '30D' },
                    { id: '6M', label: '6M' },
                    { id: '1Y', label: '1Y' },
                    { id: 'ALL', label: 'All Time' },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setChartTimeframe(tf.id)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-lg font-medium transition-all cursor-pointer ${
                        chartTimeframe === tf.id
                          ? 'bg-[#5E6AD2] text-white shadow-sm font-semibold'
                          : 'text-[#8A8F98] hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Viewport */}
            {timelineData.length > 1 ? (
              <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savingsGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="60%" stopColor="#5E6AD2" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#5E6AD2" stopOpacity={0} />
                      </linearGradient>
                      <filter id="savingsGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#818cf8" floodOpacity="0.45" />
                      </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

                    <XAxis
                      dataKey="name"
                      stroke="#8A8F98"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />

                    <YAxis
                      stroke="#8A8F98"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => formatCompactCurrency(val)}
                      dx={-4}
                    />

                    <RechartsTooltip content={<CustomSavingsTooltip />} />

                    <Area
                      type="monotone"
                      dataKey="Balance"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#savingsGrowthGradient)"
                      filter="url(#savingsGlow)"
                      activeDot={{
                        r: 6,
                        fill: "#818cf8",
                        stroke: "#ffffff",
                        strokeWidth: 2,
                        className: "shadow-lg shadow-indigo-500/50"
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] flex items-center justify-center">
                  <PiggyBank className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">No Savings History Recorded Yet</h3>
                  <p className="text-xs text-[#8A8F98] max-w-sm mt-0.5">
                    Start accumulating your wealth! Make your first deposit or log a SIP contribution to chart your savings growth curve.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDeposit()}
                  className="btn-linear-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log First Deposit</span>
                </button>
              </div>
            )}
          </SpotlightCard>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search savings pot by name or symbol..."
              className="w-full pl-8 pr-3 py-2 bg-[#0a0a0c] border border-white/10 rounded-lg text-xs text-white placeholder-[#8A8F98]/50 focus:outline-none focus:border-[#5E6AD2]"
            />
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#8A8F98]" />
          </div>

          <div className="flex gap-1 overflow-x-auto w-full sm:w-auto select-none py-0.5">
            {[
              { id: 'ALL', label: 'All Pots' },
              { id: 'ACTIVE', label: 'Active (> 0)' },
              { id: 'STOCKS', label: 'Stocks & Equity' },
              { id: 'SIP', label: 'SIP Linked' },
              { id: 'WITHDRAWN', label: 'Fully Redeemed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-[#5E6AD2] text-white shadow-sm'
                    : 'bg-[#0a0a0c] border border-white/10 text-[#8A8F98] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Saving Pots Grid */}
        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(n => (
              <div key={n} className="glass-card p-6 border border-white/[0.06] rounded-2xl space-y-4">
                <div className="h-6 w-36 bg-white/5 rounded animate-pulse" />
                <div className="h-10 w-48 bg-white/5 rounded animate-pulse" />
                <div className="h-8 w-full bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredPots.length === 0 ? (
          <div className="glass-card py-16 text-center border border-white/[0.06] rounded-2xl">
            <PiggyBank className="w-10 h-10 text-[#8A8F98] mx-auto mb-3 opacity-30" />
            <h3 className="text-white text-base font-semibold">No Savings Pots Found</h3>
            <p className="text-[#8A8F98] text-xs mt-1 max-w-sm mx-auto">
              Start by creating a new saving deposit, recurring SIP, stock holding, or adjusting your search filters.
            </p>
            <button
              onClick={() => handleOpenDeposit()}
              className="mt-4 btn-linear-primary px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create First Saving Pot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPots.map((pot, idx) => {
              const isStock = Boolean(pot.isStock);
              const stock = pot.stockInfo;

              const isProfit = isStock && pot.totalReturns >= 0;
              const isWithdrawn = !isStock && pot.currentBalance === 0 && pot.totalWithdrawn > 0;

              const withdrawRatio = pot.totalDeposited > 0
                ? Math.min(100, Math.round((pot.totalWithdrawn / pot.totalDeposited) * 100))
                : 0;

              return (
                <motion.div
                  key={pot.key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className={`glass-card p-5 border rounded-2xl flex flex-col justify-between transition-all group ${
                    isStock
                      ? 'border-cyan-500/20 bg-gradient-to-b from-[#0a0a0c] to-cyan-950/10 hover:border-cyan-500/40'
                      : 'border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div>
                    {/* Pot Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base font-semibold text-white truncate group-hover:text-[#818cf8] transition-colors">
                            {pot.title}
                          </h3>
                        </div>

                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap font-mono text-[9px]">
                          {isStock && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5" /> Stock • {stock?.quantity} Shares
                            </span>
                          )}

                          {pot.linkedSip && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold uppercase">
                              SIP: {pot.linkedSip.frequency}
                            </span>
                          )}

                          <span className="text-[#8A8F98] text-[10px]">
                            {pot.depositsCount} deposits • {pot.withdrawalsCount} withdrawals
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenHistory(pot)}
                        className="p-1.5 text-[#8A8F98] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="View transaction history"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Available Balance / Live Market Value Box */}
                    <div className={`mt-4 p-3.5 rounded-xl border ${
                      isStock
                        ? 'bg-cyan-950/20 border-cyan-500/20'
                        : 'bg-white/[0.02] border border-white/[0.04]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8A8F98] block">
                          {isStock ? 'Live Market Value' : 'Available Balance'}
                        </span>

                        {/* Stock P&L Badge */}
                        {isStock && stock && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                            isProfit
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}>
                            {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isProfit ? '+' : ''}{formatCurrency(stock.totalReturns)} ({isProfit ? '+' : ''}{stock.returnsPercentage.toFixed(2)}%)
                          </span>
                        )}
                      </div>

                      {/* Current Live Value Amount */}
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <h4 className={`text-2xl font-bold font-mono ${
                          isStock
                            ? isProfit ? 'text-emerald-400' : 'text-rose-400'
                            : isWithdrawn ? 'text-[#8A8F98]' : 'text-emerald-400'
                        }`}>
                          {formatCurrency(pot.currentBalance)}
                        </h4>

                        {isWithdrawn && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono">
                            Fully Redeemed
                          </span>
                        )}
                      </div>

                      {/* Details Strip */}
                      {isStock && stock ? (
                        <div className="mt-2.5 pt-2 border-t border-cyan-500/15 grid grid-cols-2 gap-1 text-[9px] font-mono text-[#8A8F98]">
                          <div>
                            <span>Invested: </span>
                            <strong className="text-white">{formatCurrency(stock.investedValue)}</strong>
                          </div>
                          <div className="text-right">
                            <span>Live Price: </span>
                            <strong className="text-cyan-300">{formatCurrency(stock.currentPrice)}/sh</strong>
                          </div>
                        </div>
                      ) : (
                        /* Progress bar of Withdrawn vs Retained */
                        <div className="mt-3">
                          <div className="flex justify-between text-[9px] text-[#8A8F98] font-mono mb-1">
                            <span>Deposited: {formatCurrency(pot.totalDeposited)}</span>
                            <span>Withdrawn: {formatCurrency(pot.totalWithdrawn)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
                              style={{ width: `${Math.max(0, 100 - withdrawRatio)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/[0.04]">
                    {isStock ? (
                      <button
                        onClick={() => router.push('/stocks')}
                        className="flex-1 px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Manage / Trade Share</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </button>
                    ) : (
                      <>
                        <button
                          disabled={pot.currentBalance <= 0}
                          onClick={() => handleOpenWithdraw(pot)}
                          className="flex-1 px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Withdraw</span>
                        </button>

                        <button
                          onClick={() => handleOpenDeposit(pot)}
                          className="flex-1 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Deposit</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* WITHDRAWAL MODAL */}
      <AnimatePresence>
        {withdrawModalOpen && selectedPotForWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !withdrawSubmitting && setWithdrawModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 text-left space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Withdraw from Savings</h3>
                    <p className="text-xs text-[#8A8F98]">{selectedPotForWithdraw.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setWithdrawModalOpen(false)}
                  className="p-1.5 text-[#8A8F98] hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pot Balance Card */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex justify-between items-center">
                <span className="text-xs text-[#8A8F98]">Available Pot Balance:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {formatCurrency(selectedPotForWithdraw.currentBalance)}
                </span>
              </div>

              {withdrawError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmWithdraw} className="space-y-4">
                {/* Percentage Quick-Picks */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1.5">
                    Quick Amount Select
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleSetWithdrawPercentage(pct)}
                        className="py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-lg text-xs font-mono font-medium text-white transition-all cursor-pointer"
                      >
                        {pct === 100 ? '100% (ALL)' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1">
                    Withdrawal Amount ({user?.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    max={selectedPotForWithdraw.currentBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-xl text-sm font-mono text-white placeholder-[#8A8F98]/40 focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                {/* Date Input */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1">
                    Date of Withdrawal
                  </label>
                  <input
                    type="date"
                    required
                    value={withdrawDate}
                    onChange={(e) => setWithdrawDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                {/* Notes Input */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1">
                    Reason / Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    placeholder={`e.g. Redeemed for urgent expense`}
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-xl text-xs text-white placeholder-[#8A8F98]/40 focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawModalOpen(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-[#8A8F98] hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={withdrawSubmitting}
                    className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-lg shadow-rose-950/40"
                  >
                    {withdrawSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Withdrawal</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEPOSIT MODAL */}
      <AnimatePresence>
        {depositModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !depositSubmitting && setDepositModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 text-left space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Deposit to Savings</h3>
                    <p className="text-xs text-[#8A8F98]">Add funds to an existing or new saving pot</p>
                  </div>
                </div>
                <button
                  onClick={() => setDepositModalOpen(false)}
                  className="p-1.5 text-[#8A8F98] hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {depositError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmDeposit} className="space-y-4">
                {/* Pot Name Input */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1">
                    Saving Pot Title
                  </label>
                  <input
                    type="text"
                    required
                    value={depositPotTitle}
                    onChange={(e) => setDepositPotTitle(e.target.value)}
                    placeholder="e.g. Mutual Fund SIP, Emergency Fund, Gold"
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-xl text-xs text-white placeholder-[#8A8F98]/40 focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1">
                    Deposit Amount ({user?.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-xl text-sm font-mono text-white placeholder-[#8A8F98]/40 focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                {/* Date Input */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1">
                    Deposit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                {/* Use Salary Balance Toggle */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={depositUseSalary}
                      onChange={(e) => setDepositUseSalary(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#0a0a0c] text-[#5E6AD2] focus:ring-0 cursor-pointer accent-[#5E6AD2]"
                    />
                    <span className="text-xs font-medium text-white">Deduct from Active Salary Balance</span>
                  </label>

                  {depositUseSalary && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] text-[#8A8F98] block mb-1">Salary Month</label>
                        <select
                          value={depositSalaryMonth}
                          onChange={(e) => setDepositSalaryMonth(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#050506] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                        >
                          {[
                            'January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'
                          ].map((mName, i) => (
                            <option key={i + 1} value={i + 1}>{mName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-[#8A8F98] block mb-1">Salary Year</label>
                        <select
                          value={depositSalaryYear}
                          onChange={(e) => setDepositSalaryYear(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#050506] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                        >
                          {[2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Input */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] block mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    placeholder="e.g. Monthly allocation or bonus transfer"
                    className="w-full px-3.5 py-2.5 bg-[#050506] border border-white/10 rounded-xl text-xs text-white placeholder-[#8A8F98]/40 focus:outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDepositModalOpen(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-[#8A8F98] hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={depositSubmitting}
                    className="flex-1 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-950/40"
                  >
                    {depositSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Deposit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HISTORY DRAWER / MODAL */}
      <AnimatePresence>
        {historyDrawerOpen && selectedPotForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryDrawerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-2xl bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 text-left space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-[#818cf8]" /> {selectedPotForHistory.title} History
                  </h3>
                  <p className="text-xs text-[#8A8F98]">
                    {selectedPotForHistory.isStock ? 'Live Stock Valuation' : 'Available Balance'}: <strong className="text-emerald-400 font-mono">{formatCurrency(selectedPotForHistory.currentBalance)}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setHistoryDrawerOpen(false)}
                  className="p-1.5 text-[#8A8F98] hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Transactions List */}
              <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                {selectedPotForHistory.history.length === 0 ? (
                  <div className="py-12 text-center text-[#8A8F98] text-xs">
                    {selectedPotForHistory.isStock
                      ? `Stock position created with ${selectedPotForHistory.stockInfo?.quantity} shares at ${formatCurrency(selectedPotForHistory.stockInfo?.avgBuyPrice)}/share.`
                      : 'No transactions recorded for this pot yet.'}
                  </div>
                ) : (
                  selectedPotForHistory.history.map((tx) => {
                    const isDeposit = tx.kind === 'DEPOSIT';
                    return (
                      <div
                        key={tx.id}
                        className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`p-2 rounded-lg border shrink-0 ${
                              isDeposit
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}
                          >
                            {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-white truncate">{tx.title}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[8px] font-mono border uppercase ${
                                  isDeposit
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}
                              >
                                {isDeposit ? 'Deposit' : 'Withdrawal'}
                              </span>
                              {tx.isAiGenerated && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[7px] font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">
                                  <Sparkles className="w-2 h-2 text-indigo-400" /> AI
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#8A8F98] block mt-0.5 font-mono">
                              {new Date(tx.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                              {tx.description && ` • ${tx.description}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-sm font-mono font-bold ${
                              isDeposit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>

                          <button
                            disabled={deletingTxId === tx.id}
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-1.5 text-[#8A8F98] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete transaction"
                          >
                            {deletingTxId === tx.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-6 bg-[#020203]">
        <div className="max-w-7xl mx-auto px-6 text-[#8A8F98] text-xs text-center font-mono">
          © {new Date().getFullYear()} MonthlyMoney. Wealth & Saving Management.
        </div>
      </footer>
    </div>
  );
}
