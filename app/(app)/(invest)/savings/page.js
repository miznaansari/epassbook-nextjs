'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sheet from '@/components/ui/Sheet';
import LineIcon from '@/components/ui/LineIcon';
import {
  InvestPage,
  PageHead,
  HeroBand,
  StatTile,
  Icon3DTile,
  Card,
  Empty,
  ErrorNote,
  Pill,
  SheetHead,
  Field,
  CardSkeleton,
  SHEET_CLASS,
  SHEET_BODY,
} from '@/components/invest/kit';
import { RankedBars, SegmentedBar, TrendChart, Meter, SERIES } from '@/components/invest/charts';

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

  // Chart Timeframe Filter State — must stay above the early return (rules of hooks)
  const [chartTimeframe, setChartTimeframe] = useState('ALL'); // 'ALL' | '1Y' | '6M' | '30D'


  if (loading || !user) {
    return (
      <div className="mm flex flex-1 items-center justify-center bg-(--mm-canvas)">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--mm-line) border-t-(--mm-brand)" />
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

  // ---- Presentational derivations (read-only) ----
  const pots = data?.pots || [];
  const stockValue = pots.filter(p => p.isStock).reduce((s, p) => s + (p.currentBalance || 0), 0);
  const sipValue = pots.filter(p => !p.isStock && p.linkedSip).reduce((s, p) => s + (p.currentBalance || 0), 0);
  const cashValue = pots.filter(p => !p.isStock && !p.linkedSip).reduce((s, p) => s + (p.currentBalance || 0), 0);
  const splitParts = [
    { key: 'cash', label: 'Cash pots', value: cashValue, color: SERIES[0] },
    { key: 'stocks', label: 'Stocks', value: stockValue, color: SERIES[1] },
    { key: 'sip', label: 'SIP pots', value: sipValue, color: SERIES[2] },
  ];
  const potRows = pots.map(p => ({ key: p.key, label: p.title, sub: p.isStock ? 'Stock' : p.linkedSip ? 'SIP' : undefined, value: p.currentBalance || 0 }));
  const trendPoints = timelineData.map(p => ({ label: p.fullDate || p.name, Balance: p.Balance }));
  const returnsUp = stockSummary.totalStockReturns >= 0;
  const signed = (v) => `${v >= 0 ? '+' : '−'}${formatCurrency(Math.abs(v))}`;
  const pctText = `${stockSummary.totalStockReturnsPercentage >= 0 ? '+' : '−'}${Math.abs(stockSummary.totalStockReturnsPercentage).toFixed(1)}%`;
  const nothingYet = !loadingData && pots.length === 0;

  const FILTERS = [
    { id: 'ALL', label: 'All pots' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'STOCKS', label: 'Stocks' },
    { id: 'SIP', label: 'SIP linked' },
    { id: 'WITHDRAWN', label: 'Redeemed' },
  ];
  const TIMEFRAMES = [
    { id: '30D', label: '30D' },
    { id: '6M', label: '6M' },
    { id: '1Y', label: '1Y' },
    { id: 'ALL', label: 'All' },
  ];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <InvestPage>
      <PageHead
        title="Savings"
        sub="Pots, stocks and SIP plans in one place"
        actions={
          <>
            {stockSummary.stocksCount > 0 && (
              <button
                type="button"
                disabled={refreshingPrices}
                onClick={handleRefreshStockPrices}
                className="mm-btn mm-btn-ghost mm-focus min-h-11 gap-1.5 px-3.5 text-[13px]"
              >
                <LineIcon name={refreshingPrices ? 'spinner' : 'refresh'} size={16} className={refreshingPrices ? 'animate-spin' : ''} />
                <span>{refreshingPrices ? 'Syncing…' : 'Sync prices'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push('/assistant?prompt=Show+my+savings+and+withdrawal+breakdown')}
              className="mm-btn mm-btn-ghost mm-focus min-h-11 gap-1.5 px-3.5 text-[13px]"
            >
              <LineIcon name="sparkle" size={16} />
              <span>Ask AI</span>
            </button>
            <button type="button" onClick={() => handleOpenDeposit()} className="mm-btn mm-btn-amber mm-focus min-h-11 gap-1.5 px-4 text-[13px]">
              <LineIcon name="plus" size={16} />
              <span>New pot</span>
            </button>
          </>
        }
      />

      <HeroBand
        icon="savings"
        label="Net savings balance"
        value={formatCurrency(summary.netSavingsBalance)}
        delta={stockSummary.stocksCount > 0
          ? `Stocks ${signed(stockSummary.totalStockReturns)} (${pctText})`
          : 'Live pot valuation'}
        deltaTone={stockSummary.stocksCount > 0 ? (returnsUp ? 'good' : 'bad') : 'muted'}
        loading={loadingData}
        tiles={[
          { label: 'Deposited', value: formatCurrency(summary.totalAllTimeSaved) },
          { label: 'Withdrawn', value: formatCurrency(summary.totalAllTimeWithdrawn) },
          { label: 'Stocks', value: formatCurrency(stockSummary.totalStockCurrentValue) },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon="savings" tone="indigo" label="Lifetime invested" value={formatCurrency(summary.totalAllTimeSaved)} delta="Cost basis" loading={loadingData} />
        <StatTile
          icon={returnsUp ? 'chart-up' : 'chart-down'}
          tone={returnsUp ? 'green' : 'red'}
          label="Stock P&L"
          value={signed(stockSummary.totalStockReturns)}
          delta={stockSummary.stocksCount > 0 ? `${pctText} equity gain` : 'No stocks yet'}
          good={stockSummary.stocksCount > 0 ? returnsUp : undefined}
          loading={loadingData}
        />
        <StatTile icon="target" tone="gold" label="Active pots" value={String(summary.activePotsCount)} delta={`Withdrawn ${formatCurrency(summary.totalAllTimeWithdrawn)}`} loading={loadingData} />
        <StatTile icon="sips" tone="orange" label="Active SIPs" value={String(summary.activeSipsCount)} delta={`${stockSummary.stocksCount} stock${stockSummary.stocksCount === 1 ? '' : 's'}`} loading={loadingData} />
      </div>

      {/* Savings over time */}
      {loadingData ? (
        <CardSkeleton rows={3} height={300} />
      ) : (
        <Card
          title="Savings over time"
          sub={allTimePeak > 0 ? `Peak ${formatCurrency(allTimePeak)} · rises with deposits, dips on withdrawals` : 'Rises with deposits, dips on withdrawals'}
          action={
            <div className="mm-seg" role="group" aria-label="Chart timeframe">
              {TIMEFRAMES.map(tf => (
                <button key={tf.id} type="button" aria-pressed={chartTimeframe === tf.id} className={chartTimeframe === tf.id ? 'is-on' : ''} onClick={() => setChartTimeframe(tf.id)}>
                  {tf.label}
                </button>
              ))}
            </div>
          }
        >
          {trendPoints.length > 1 ? (
            <TrendChart
              points={trendPoints}
              series={[{ key: 'Balance', label: 'Savings balance' }]}
              format={formatCurrency}
              formatAxis={formatCompactCurrency}
              height={220}
              zeroBased
              label="Savings balance over time"
            />
          ) : (
            <Empty
              icon="savings"
              title="No savings history yet"
              message="Make a first deposit to start your savings curve."
              action={<button type="button" onClick={() => handleOpenDeposit()} className="mm-btn mm-btn-amber mm-focus min-h-11 px-4 text-[13px]">Log first deposit</button>}
            />
          )}
        </Card>
      )}

      {/* Split + biggest pots */}
      {loadingData ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton rows={2} height={200} />
          <CardSkeleton rows={3} height={200} />
        </div>
      ) : !nothingYet && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Where your savings sit" sub="Current value by pot type">
            <SegmentedBar parts={splitParts} format={formatCurrency} label="Savings by pot type" />
          </Card>
          <Card title="Biggest pots" sub="Tap a pot to see its history">
            <RankedBars
              rows={potRows}
              format={formatCurrency}
              limit={5}
              onSelect={(r) => {
                const pot = pots.find(p => p.key === r.key);
                if (pot) handleOpenHistory(pot);
              }}
            />
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="mm-card flex min-h-12 items-center gap-2.5 px-3.5">
          <LineIcon name="search" size={18} className="shrink-0 text-(--mm-ink-3)" />
          <input
            id="pot-search"
            type="text"
            aria-label="Search pots by name or symbol"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pots by name or symbol"
            className="mm-focus min-h-11 w-full min-w-0 bg-transparent text-[14px] font-medium text-(--mm-ink) outline-none placeholder:text-(--mm-ink-3)"
          />
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0" role="group" aria-label="Filter pots">
          {FILTERS.map(tab => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`mm-ft min-h-11 shrink-0 ${statusFilter === tab.id ? 'is-on' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pot list */}
      {loadingData ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
        </div>
      ) : filteredPots.length === 0 ? (
        <div className="mm-card">
          <Empty
            icon="search"
            title="No pots found"
            message="Create a pot, or change your search and filter."
            action={<button type="button" onClick={() => handleOpenDeposit()} className="mm-btn mm-btn-amber mm-focus min-h-11 px-4 text-[13px]">Create first pot</button>}
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredPots.map((pot) => {
            const isStock = Boolean(pot.isStock);
            const stock = pot.stockInfo;
            const isProfit = isStock && pot.totalReturns >= 0;
            const isWithdrawn = !isStock && pot.currentBalance === 0 && pot.totalWithdrawn > 0;
            const withdrawRatio = pot.totalDeposited > 0
              ? Math.min(100, Math.round((pot.totalWithdrawn / pot.totalDeposited) * 100))
              : 0;
            const avatar = isStock ? 'stocks' : pot.linkedSip ? 'sips' : isWithdrawn ? 'check' : 'savings';
            const tone = isStock ? 'indigo' : pot.linkedSip ? 'orange' : isWithdrawn ? 'gold' : 'green';

            return (
              <li key={pot.key} className="mm-card min-w-0 mm-lift flex flex-col gap-3.5 p-4 md:p-[18px]">
                <div className="flex items-start gap-3">
                  <Icon3DTile name={avatar} tone={tone} size={48} />
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 break-words text-[15px] font-extrabold leading-snug text-(--mm-ink)">{pot.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {isStock && <Pill tone="brand">Stock{stock ? ` · ${stock.quantity} sh` : ''}</Pill>}
                      {pot.linkedSip && <Pill tone="warn">SIP · {pot.linkedSip.frequency}</Pill>}
                      {!isStock && !pot.linkedSip && !isWithdrawn && <Pill tone="mute">Cash pot</Pill>}
                      {isWithdrawn && <Pill tone="bad">Fully redeemed</Pill>}
                    </div>
                  </div>
                </div>

                {/* Balance on its own row, so a long name or a large amount never squeezes the other. */}
                <div className="flex items-baseline justify-between gap-3">
                  <span className="mm-lbl">{isStock ? 'Market value' : 'Balance'}</span>
                  <span className="min-w-0 truncate text-[22px] font-extrabold leading-tight tabular-nums text-(--mm-ink)">{formatCurrency(pot.currentBalance)}</span>
                </div>

                {isStock && stock ? (
                  <div className="flex flex-col gap-1 text-[12px] font-semibold text-(--mm-ink-2)">
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                      <span>Invested <b className="tabular-nums text-(--mm-ink)">{formatCurrency(stock.investedValue)}</b></span>
                      <span>Price <b className="tabular-nums text-(--mm-ink)">{formatCurrency(stock.currentPrice)}/sh</b></span>
                    </div>
                    <div className="font-bold tabular-nums" style={{ color: isProfit ? 'var(--mm-good)' : 'var(--mm-bad)' }}>
                      {isProfit ? '+' : '−'}{formatCurrency(Math.abs(stock.totalReturns))} ({isProfit ? '+' : ''}{stock.returnsPercentage.toFixed(2)}%)
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[12px] font-semibold text-(--mm-ink-2)">
                      <span>Deposited <b className="tabular-nums text-(--mm-ink)">{formatCurrency(pot.totalDeposited)}</b></span>
                      <span>Withdrawn <b className="tabular-nums text-(--mm-ink)">{formatCurrency(pot.totalWithdrawn)}</b></span>
                    </div>
                    <Meter value={Math.max(0, 100 - withdrawRatio)} max={100} label={`${pot.title}: share of deposits still saved`} tone="good" />
                  </div>
                )}

                <div className="mm-lbl">{pot.depositsCount} deposits · {pot.withdrawalsCount} withdrawals</div>

                <div className="grid grid-cols-3 gap-2 border-t border-(--mm-line) pt-3">
                  {isStock ? (
                    <button type="button" onClick={() => router.push('/stocks')} className="mm-btn mm-btn-soft mm-focus col-span-2 min-h-11 gap-1.5 text-[13px]">
                      <LineIcon name="stocks" size={16} />
                      <span>Trade on Stocks</span>
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => handleOpenDeposit(pot)} className="mm-btn mm-btn-amber mm-focus min-h-11 gap-1 px-2 text-[13px]">
                        <LineIcon name="plus" size={15} />
                        <span>Deposit</span>
                      </button>
                      <button type="button" disabled={pot.currentBalance <= 0} onClick={() => handleOpenWithdraw(pot)} className="mm-btn mm-btn-soft mm-focus min-h-11 gap-1 px-2 text-[13px]">
                        <LineIcon name="arrow" size={15} />
                        <span>Withdraw</span>
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => handleOpenHistory(pot)} className="mm-btn mm-btn-ghost mm-focus min-h-11 gap-1 px-2 text-[13px]">
                    <LineIcon name="book" size={15} />
                    <span>History</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* WITHDRAWAL MODAL */}
      <Sheet
        open={withdrawModalOpen && !!selectedPotForWithdraw}
        onClose={() => setWithdrawModalOpen(false)}
        label="Withdraw from savings"
        zIndex={115}
        dismissible={!withdrawSubmitting}
        className={SHEET_CLASS}
        bodyClassName={SHEET_BODY}
      >
        {selectedPotForWithdraw && (
          <>
            <SheetHead icon="balance" tone="orange" title="Withdraw from savings" sub={selectedPotForWithdraw.title} onClose={() => setWithdrawModalOpen(false)} />

            <div className="flex items-center justify-between rounded-xl bg-(--mm-soft) p-3.5">
              <span className="text-[13px] font-semibold text-(--mm-ink-2)">Available balance</span>
              <span className="text-[17px] font-extrabold tabular-nums text-(--mm-ink)">{formatCurrency(selectedPotForWithdraw.currentBalance)}</span>
            </div>

            {withdrawError && <ErrorNote message={withdrawError} />}

            <form onSubmit={handleConfirmWithdraw} className="space-y-4">
              <div>
                <span className="mm-field-label">Quick amount</span>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button key={pct} type="button" onClick={() => handleSetWithdrawPercentage(pct)} className="mm-ft min-h-11 justify-center">
                      {pct === 100 ? 'All' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <Field label={`Amount (${user?.currency || 'USD'})`} htmlFor="wd-amount">
                <input
                  id="wd-amount"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  min="0.01"
                  max={selectedPotForWithdraw.currentBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="mm-field tabular-nums"
                />
              </Field>

              <Field label="Date" htmlFor="wd-date">
                <input id="wd-date" type="date" required value={withdrawDate} onChange={(e) => setWithdrawDate(e.target.value)} className="mm-field" />
              </Field>

              <Field label="Reason (optional)" htmlFor="wd-notes">
                <input id="wd-notes" type="text" value={withdrawNotes} onChange={(e) => setWithdrawNotes(e.target.value)} placeholder="e.g. Urgent expense" className="mm-field" />
              </Field>

              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setWithdrawModalOpen(false)} className="mm-btn mm-btn-ghost min-h-11 flex-1 text-[14px]">Cancel</button>
                <button type="submit" disabled={withdrawSubmitting} className="mm-btn mm-btn-amber min-h-11 flex-1 gap-1.5 text-[14px]">
                  {withdrawSubmitting ? (
                    <>
                      <LineIcon name="spinner" size={16} className="animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <LineIcon name="check" size={16} />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </Sheet>

      {/* DEPOSIT MODAL */}
      <Sheet
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        label="Add to savings"
        zIndex={115}
        dismissible={!depositSubmitting}
        className={SHEET_CLASS}
        bodyClassName={SHEET_BODY}
      >
        {depositModalOpen && (
          <>
            <SheetHead icon="savings" tone="green" title="Deposit to savings" sub="Add to an existing or new pot" onClose={() => setDepositModalOpen(false)} />

            {depositError && <ErrorNote message={depositError} />}

            <form onSubmit={handleConfirmDeposit} className="space-y-4">
              <Field label="Pot name" htmlFor="dp-title">
                <input
                  id="dp-title"
                  type="text"
                  required
                  value={depositPotTitle}
                  onChange={(e) => setDepositPotTitle(e.target.value)}
                  placeholder="e.g. Emergency fund, Gold"
                  className="mm-field"
                />
              </Field>

              <Field label={`Amount (${user?.currency || 'USD'})`} htmlFor="dp-amount">
                <input
                  id="dp-amount"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  min="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="mm-field tabular-nums"
                />
              </Field>

              <Field label="Date" htmlFor="dp-date">
                <input id="dp-date" type="date" required value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className="mm-field" />
              </Field>

              <div className="space-y-3 rounded-xl bg-(--mm-soft) p-3.5">
                <label className="flex min-h-11 cursor-pointer select-none items-center gap-3">
                  <input
                    type="checkbox"
                    checked={depositUseSalary}
                    onChange={(e) => setDepositUseSalary(e.target.checked)}
                    className="mm-focus h-5 w-5 cursor-pointer accent-(--mm-brand)"
                  />
                  <span className="text-[14px] font-semibold text-(--mm-ink)">Deduct from active salary balance</span>
                </label>

                {depositUseSalary && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Salary month" htmlFor="dp-month">
                      <select id="dp-month" value={depositSalaryMonth} onChange={(e) => setDepositSalaryMonth(e.target.value)} className="mm-field">
                        {MONTHS.map((mName, i) => (
                          <option key={i + 1} value={i + 1}>{mName}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Salary year" htmlFor="dp-year">
                      <select id="dp-year" value={depositSalaryYear} onChange={(e) => setDepositSalaryYear(e.target.value)} className="mm-field">
                        {[2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
              </div>

              <Field label="Notes (optional)" htmlFor="dp-notes">
                <input id="dp-notes" type="text" value={depositNotes} onChange={(e) => setDepositNotes(e.target.value)} placeholder="e.g. Monthly allocation" className="mm-field" />
              </Field>

              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setDepositModalOpen(false)} className="mm-btn mm-btn-ghost min-h-11 flex-1 text-[14px]">Cancel</button>
                <button type="submit" disabled={depositSubmitting} className="mm-btn mm-btn-amber min-h-11 flex-1 gap-1.5 text-[14px]">
                  {depositSubmitting ? (
                    <>
                      <LineIcon name="spinner" size={16} className="animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <LineIcon name="check" size={16} />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </Sheet>

      {/* HISTORY SHEET */}
      <Sheet
        open={historyDrawerOpen && !!selectedPotForHistory}
        onClose={() => setHistoryDrawerOpen(false)}
        label="Savings history"
        zIndex={115}
        size="wide"
        scroll={false}
        className={SHEET_CLASS}
        bodyClassName={`${SHEET_BODY} pb-6`}
      >
        {selectedPotForHistory && (
          <>
            <div className="shrink-0">
              <SheetHead
                icon="memo"
                tone="indigo"
                title={`${selectedPotForHistory.title} history`}
                sub={`${selectedPotForHistory.isStock ? 'Market value' : 'Balance'} ${formatCurrency(selectedPotForHistory.currentBalance)}`}
                onClose={() => setHistoryDrawerOpen(false)}
              />
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain">
              {selectedPotForHistory.history.length === 0 ? (
                <Empty
                  icon="receipt"
                  title="No transactions yet"
                  message={selectedPotForHistory.isStock
                    ? `Stock position created with ${selectedPotForHistory.stockInfo?.quantity} shares at ${formatCurrency(selectedPotForHistory.stockInfo?.avgBuyPrice)}/share.`
                    : 'Deposits and withdrawals for this pot will show up here.'}
                />
              ) : (
                selectedPotForHistory.history.map((tx) => {
                  const isDeposit = tx.kind === 'DEPOSIT';
                  return (
                    <div key={tx.id} className="mm-card flex items-center gap-3 p-3">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                        style={{ background: isDeposit ? 'var(--mm-green-soft)' : 'var(--mm-red-soft)', color: isDeposit ? 'var(--mm-green-ink)' : 'var(--mm-red-ink)' }}
                      >
                        <LineIcon name={isDeposit ? 'plus' : 'arrow'} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-[14px] font-bold text-(--mm-ink)">{tx.title}</span>
                          <Pill tone={isDeposit ? 'good' : 'bad'}>{isDeposit ? 'Deposit' : 'Withdrawal'}</Pill>
                          {tx.isAiGenerated && <Pill tone="brand">AI</Pill>}
                        </div>
                        <div className="mm-lbl mt-0.5">
                          {new Date(tx.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          {tx.description && ` · ${tx.description}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[14px] font-extrabold tabular-nums text-(--mm-ink)">
                          {isDeposit ? '+' : '−'}{formatCurrency(tx.amount)}
                        </span>
                        <button
                          type="button"
                          disabled={deletingTxId === tx.id}
                          onClick={() => handleDeleteTx(tx.id)}
                          aria-label="Delete transaction"
                          className="mm-btn mm-btn-ghost h-11 w-11 px-0"
                        >
                          <LineIcon name={deletingTxId === tx.id ? 'spinner' : 'trash'} size={16} className={deletingTxId === tx.id ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </Sheet>
    </InvestPage>
  );
}
