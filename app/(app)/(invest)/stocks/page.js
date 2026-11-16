'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { useAuth } from '@/context/AuthContext';
import Sheet from '@/components/ui/Sheet';
import LineIcon from '@/components/ui/LineIcon';
import {
  InvestPage,
  PageHead,
  HeroBand,
  StatTile,
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
import { RankedBars, DivergingBars } from '@/components/invest/charts';
import { isMarketHours } from '@/lib/market';
import PortfolioChart, { usePortfolioHistory } from '@/components/stocks/PortfolioChart';

/** Signed amount: always carries + or − so direction never depends on colour. */
const signed = (val, fmt) => `${val >= 0 ? '+' : '−'}${fmt(Math.abs(val))}`;
const signedPct = (val) => `${val >= 0 ? '+' : '−'}${Math.abs(val).toFixed(2)}%`;
const tone = (val) => (val >= 0 ? 'text-(--mm-good)' : 'text-(--mm-bad)');
const shortSymbol = (symbol) => symbol.split('.')[0];
const initials = (symbol) => shortSymbol(symbol).slice(0, 2).toUpperCase();

function Avatar({ symbol }) {
  return (
    <span
      className="mm-in text-[13px] font-extrabold tracking-wide text-(--mm-indigo-ink)"
      style={{ background: 'var(--mm-indigo-soft)' }}
      aria-hidden="true"
    >
      {initials(symbol)}
    </span>
  );
}

function PnlPill({ value, pct }) {
  const up = value >= 0;
  return (
    <Pill tone={up ? 'good' : 'bad'}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      <span className="tabular-nums">{signedPct(pct)}</span>
    </Pill>
  );
}

/** Purchase lots of one holding, each with a delete action. */
function Lots({ holding: h, formatCurrency, onDelete }) {
  return (
    <ul className="overflow-hidden rounded-2xl border border-(--mm-line) bg-(--mm-card)">
      {h.purchases.map((p) => {
        const invested = p.quantity * p.buyPrice;
        const returns = p.quantity * h.currentPrice - invested;
        const pct = p.buyPrice > 0 ? ((h.currentPrice - p.buyPrice) / p.buyPrice) * 100 : 0;
        return (
          <li key={p.id} className="mm-tr">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-(--mm-ink)">
                {new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
              <div className="mm-lbl tabular-nums">
                {p.quantity} × {formatCurrency(p.buyPrice)} · Cost {formatCurrency(invested)}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[13px] font-bold tabular-nums ${tone(returns)}`}>{signed(returns, formatCurrency)}</div>
              <div className={`text-[12px] font-semibold tabular-nums ${tone(returns)}`}>{signedPct(pct)}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(p.id, `${h.name} (Bought for ${formatCurrency(p.buyPrice)})`);
              }}
              className="mm-btn mm-btn-ghost w-11 shrink-0 px-0"
              aria-label={`Delete purchase of ${p.quantity} ${h.name} on ${new Date(p.createdAt).toLocaleDateString()}`}
              title="Delete this purchase record"
            >
              <LineIcon name="trash" size={17} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
  const [liveTicks, setLiveTicks] = useState([]); // intraday points captured from 5s market-hours polls

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
        if (isMarketHours() && data.holdings?.length) {
          const prices = Object.fromEntries(data.holdings.map(h => [h.symbol, h.currentPrice]));
          setLiveTicks(prev => [...prev, { t: Date.now(), v: data.summary.totalCurrentValue, p: prices }].slice(-720));
        }
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

  // Portfolio growth chart history (refetches when lots are added or removed)
  const [chartRange, setChartRange] = useState('1D');
  const holdingsKey = holdings.map(h => `${h.symbol}:${h.quantity}`).join('|');
  const { data: chartHistory, dayData, isStale: chartStale, error: chartError } = usePortfolioHistory(
    chartRange,
    holdingsKey,
    inMarketHours,
    () => fetchHoldings(true)
  );

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

  // Chart rows
  const pnlRows = holdings.map(h => ({
    key: h.symbol,
    label: shortSymbol(h.symbol),
    sub: signedPct(h.returnsPercentage),
    value: h.totalReturns,
  }));

  const allocationRows = holdings.map(h => ({
    key: h.symbol,
    label: shortSymbol(h.symbol),
    value: h.currentValue,
  }));

  // Tapping a chart row opens that holding below and scrolls to it
  const openHolding = (row) => {
    setExpandedSymbol(row.key);
    setTimeout(() => {
      const els = document.querySelectorAll(`[data-holding="${CSS.escape(row.key)}"]`);
      const visible = [...els].find(el => el.offsetParent !== null);
      visible?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  if (authLoading || loading) {
    return (
      <InvestPage>
        <PageHead title="Stocks" sub="Syncing market quotes" />
        <HeroBand
          icon="stocks"
          label="Portfolio value"
          loading
          tiles={[{ label: 'Invested' }, { label: 'Returns' }, { label: 'Today' }]}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {['Net returns', 'Return', 'Today', 'Positions'].map(l => (
            <StatTile key={l} icon="chart-up" label={l} loading />
          ))}
        </div>
        <CardSkeleton rows={4} height={380} />
        <CardSkeleton rows={3} />
      </InvestPage>
    );
  }

  const isProfit = summary.totalReturns >= 0;

  // Compact axis labels (₹1.2L, $12k)
  const formatCompact = (val) => {
    const symbol = (user?.currency || 'USD') === 'INR' ? '₹' : '$';
    const abs = Math.abs(val);
    if (abs >= 10000000) return `${symbol}${(val / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${symbol}${(val / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${symbol}${(val / 1000).toFixed(1)}k`;
    return `${symbol}${Math.round(val)}`;
  };

  // Today's move per holding, measured against the previous session close
  const movers = holdings
    .map(h => {
      const quote = dayData?.symbols?.[h.symbol];
      if (!quote?.previousClose) return null;
      const price = inMarketHours ? h.currentPrice : (quote.lastPrice ?? h.currentPrice);
      return {
        symbol: h.symbol,
        name: h.name,
        price,
        dayChange: (price - quote.previousClose) * h.quantity,
        dayChangePct: ((price - quote.previousClose) / quote.previousClose) * 100,
        prevValue: quote.previousClose * h.quantity,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.dayChangePct - a.dayChangePct);
  const dayPnl = movers.reduce((sum, m) => sum + m.dayChange, 0);
  const dayPrevValue = movers.reduce((sum, m) => sum + m.prevValue, 0);
  const dayPnlPct = dayPrevValue > 0 ? (dayPnl / dayPrevValue) * 100 : 0;
  const isDayUp = dayPnl >= 0;
  const dayLabel = inMarketHours ? "Today's P&L" : 'Last session P&L';
  const hasDay = movers.length > 0;

  const moverRows = movers.map(m => ({
    key: m.symbol,
    label: shortSymbol(m.symbol),
    sub: signedPct(m.dayChangePct),
    value: m.dayChange,
  }));

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const logButton = (
    <button type="button" onClick={openModal} className="mm-btn mm-btn-amber">
      <LineIcon name="plus" size={17} strokeWidth={2.4} />
      Log purchase
    </button>
  );

  return (
    <InvestPage>
      <PageHead
        title="Stocks"
        sub={inMarketHours ? 'Live prices, updated every 5 seconds' : 'Prices from the last session'}
        actions={
          <>
            {inMarketHours ? (
              <Pill tone="good">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" /> Market open
              </Pill>
            ) : (
              <>
                <Pill tone="mute">Market closed</Pill>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing || apiLimitRemaining <= 0}
                  className="mm-btn mm-btn-ghost"
                  title={`Daily refresh limit: 10. Remaining today: ${apiLimitRemaining}`}
                >
                  <LineIcon name="refresh" size={17} className={refreshing ? 'animate-spin' : ''} />
                  Refresh <span className="tabular-nums text-(--mm-ink-3)">{apiLimitRemaining}/10</span>
                </button>
              </>
            )}
            {logButton}
          </>
        }
      />

      {error && <ErrorNote message={error} onRetry={() => { setError(''); fetchHoldings(); }} />}

      <HeroBand
        icon="stocks"
        label="Portfolio value"
        value={formatCurrency(summary.totalCurrentValue)}
        delta={`${isProfit ? '▲' : '▼'} ${signed(summary.totalReturns, formatCurrency)} (${signedPct(summary.totalReturnsPercentage)}) all time`}
        deltaTone={isProfit ? 'good' : 'bad'}
        tiles={[
          { label: 'Invested', value: formatCompact(summary.totalInvested) },
          { label: 'Returns', value: `${summary.totalReturns >= 0 ? '+' : '−'}${formatCompact(Math.abs(summary.totalReturns))}` },
          { label: inMarketHours ? 'Today' : 'Last session', value: hasDay ? `${dayPnl >= 0 ? '+' : '−'}${formatCompact(Math.abs(dayPnl))}` : '—' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon={isProfit ? 'chart-up' : 'chart-down'}
          tone={isProfit ? 'green' : 'red'}
          label="Net returns"
          value={signed(summary.totalReturns, formatCurrency)}
          delta={`on ${formatCurrency(summary.totalInvested)} invested`}
          good={isProfit}
        />
        <StatTile
          icon="balance"
          tone="indigo"
          label="Total return"
          value={signedPct(summary.totalReturnsPercentage)}
          delta={isProfit ? 'Gain' : 'Loss'}
          good={isProfit}
        />
        <StatTile
          icon={hasDay && !isDayUp ? 'chart-down' : 'chart-up'}
          tone={hasDay ? (isDayUp ? 'green' : 'red') : 'gold'}
          label={dayLabel}
          value={hasDay ? signed(dayPnl, formatCurrency) : '—'}
          delta={hasDay ? signedPct(dayPnlPct) : undefined}
          good={hasDay ? isDayUp : undefined}
        />
        <StatTile
          icon="gem"
          tone="gold"
          label="Positions"
          value={String(holdings.length)}
          delta={holdings.length === 1 ? 'stock held' : 'stocks held'}
        />
      </div>

      {holdings.length === 0 ? (
        <Card>
          <Empty
            icon="stocks"
            title="No stocks yet"
            message="Log a share purchase to track its value and returns."
            action={logButton}
          />
        </Card>
      ) : (
        <>
          {/* Value over time */}
          <section className="mm-card p-[18px] md:p-[22px]" aria-labelledby="stocks-value-h">
            <h2 id="stocks-value-h" className="sr-only">Portfolio value over time</h2>
            <PortfolioChart
              data={chartHistory}
              isStale={chartStale}
              error={chartError}
              range={chartRange}
              onRangeChange={setChartRange}
              holdings={holdings}
              summary={summary}
              liveTicks={liveTicks}
              inMarketHours={inMarketHours}
              formatCurrency={formatCurrency}
              formatCompact={formatCompact}
            />
          </section>

          {/* Profit & loss and allocation */}
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <Card title="Profit & loss by stock" sub="Tap a stock to see its purchases">
              <DivergingBars rows={pnlRows} format={formatCurrency} onSelect={openHolding} />
            </Card>
            <Card title="Where your money is" sub="Share of current value">
              <RankedBars rows={allocationRows} format={formatCurrency} onSelect={openHolding} />
            </Card>
          </div>

          {hasDay && (
            <Card title={inMarketHours ? "Today's movers" : 'Last session movers'} sub="Change vs previous close">
              <DivergingBars rows={moverRows} format={formatCurrency} onSelect={openHolding} />
            </Card>
          )}

          {/* Holdings */}
          <section aria-labelledby="stocks-holdings-h" className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <h2 id="stocks-holdings-h" className="mm-h2">Your holdings</h2>
              <span className="mm-lbl tabular-nums">{holdings.length} {holdings.length === 1 ? 'position' : 'positions'}</span>
            </div>

            {/* Desktop table */}
            <div className="mm-card hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="mm-lbl">
                    <th scope="col" className="px-4 py-3 font-bold">Company</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Qty</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Avg buy</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Price</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Invested</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Value</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">P&amp;L</th>
                    <th scope="col" className="px-4 py-3 text-right font-bold"><span className="sr-only">Purchases</span></th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {holdings.map((h) => {
                    const isExpanded = expandedSymbol === h.symbol;
                    return (
                      <Fragment key={h.symbol}>
                        <tr
                          data-holding={h.symbol}
                          onClick={() => setExpandedSymbol(isExpanded ? null : h.symbol)}
                          className="cursor-pointer border-t border-(--mm-line-2) transition-colors hover:bg-(--mm-soft)"
                        >
                          <th scope="row" className="px-4 py-3 text-left font-normal">
                            <div className="flex items-center gap-3">
                              <Avatar symbol={h.symbol} />
                              <div className="min-w-0">
                                <div className="truncate font-bold text-(--mm-ink)">{h.name}</div>
                                <div className="mm-lbl">{h.symbol}</div>
                              </div>
                            </div>
                          </th>
                          <td className="px-3 py-3 text-right font-semibold text-(--mm-ink)">{h.quantity}</td>
                          <td className="px-3 py-3 text-right text-(--mm-ink-2)">{formatCurrency(h.buyPrice)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-(--mm-ink)">{formatCurrency(h.currentPrice)}</td>
                          <td className="px-3 py-3 text-right text-(--mm-ink-2)">{formatCurrency(h.investedValue)}</td>
                          <td className="px-3 py-3 text-right font-extrabold text-(--mm-ink)">{formatCurrency(h.currentValue)}</td>
                          <td className="px-3 py-3 text-right">
                            <div className={`font-bold ${tone(h.totalReturns)}`}>{signed(h.totalReturns, formatCurrency)}</div>
                            <div className="mt-0.5 flex justify-end"><PnlPill value={h.totalReturns} pct={h.returnsPercentage} /></div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSymbol(isExpanded ? null : h.symbol);
                              }}
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? 'Hide' : 'Show'} purchases for ${h.name}`}
                              className="mm-btn mm-btn-soft w-11 px-0"
                            >
                              <LineIcon name="chevronDown" size={17} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-(--mm-soft)">
                            <td colSpan={8} className="px-4 pb-4 pt-3">
                              <div className="mm-lbl mb-2">Purchases of {h.name}</div>
                              <div className="max-w-2xl">
                                <Lots holding={h} formatCurrency={formatCurrency} onDelete={handleDeleteHolding} />
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

            {/* Phone cards */}
            <ul className="flex flex-col gap-3 md:hidden">
              {holdings.map((h) => {
                const isExpanded = expandedSymbol === h.symbol;
                return (
                  <li key={h.symbol} data-holding={h.symbol} className="mm-card p-4">
                    <div className="flex items-center gap-3">
                      <Avatar symbol={h.symbol} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-extrabold text-(--mm-ink)">{h.name}</h3>
                        <div className="mm-lbl tabular-nums">{h.symbol} · {h.quantity} × {formatCurrency(h.buyPrice)}</div>
                      </div>
                      <PnlPill value={h.totalReturns} pct={h.returnsPercentage} />
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mm-lbl">Current value</div>
                        <div className="truncate text-[22px] font-extrabold leading-tight tabular-nums text-(--mm-ink)">{formatCurrency(h.currentValue)}</div>
                      </div>
                      <div className="text-right">
                        <div className="mm-lbl">P&amp;L</div>
                        <div className={`text-[15px] font-extrabold tabular-nums ${tone(h.totalReturns)}`}>{signed(h.totalReturns, formatCurrency)}</div>
                      </div>
                    </div>

                    <dl className="mm-divide mt-3 grid grid-cols-2 gap-3 pt-3">
                      <div>
                        <dt className="mm-lbl">Invested</dt>
                        <dd className="text-[14px] font-bold tabular-nums text-(--mm-ink)">{formatCurrency(h.investedValue)}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="mm-lbl">Price now</dt>
                        <dd className="text-[14px] font-bold tabular-nums text-(--mm-ink)">{formatCurrency(h.currentPrice)}</dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      onClick={() => setExpandedSymbol(isExpanded ? null : h.symbol)}
                      aria-expanded={isExpanded}
                      className="mm-btn mm-btn-soft mt-3 w-full"
                    >
                      {isExpanded ? 'Hide purchases' : `Purchases (${h.purchases.length})`}
                      <LineIcon name="chevronDown" size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="mt-3">
                        <Lots holding={h} formatCurrency={formatCurrency} onDelete={handleDeleteHolding} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {/* Log purchase sheet */}
      <Sheet
        open={isModalOpen}
        onClose={closeModal}
        label="Log share purchase"
        zIndex={115}
        className={SHEET_CLASS}
        bodyClassName={SHEET_BODY}
      >
        {isModalOpen && (
          <>
            <SheetHead icon="stocks" tone="indigo" title="Log share purchase" sub="Add a stock or another lot" onClose={closeModal} />

            {formError && <ErrorNote message={formError} />}

            <form onSubmit={handleAddStock} className="space-y-4">
              {/* Autocomplete search */}
              <div ref={searchContainerRef}>
                <Field label="Search ticker or company" htmlFor="stock-search">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-(--mm-ink-3)">
                      <LineIcon name={searching ? 'spinner' : 'search'} size={17} className={searching ? 'animate-spin' : ''} />
                    </span>
                    <input
                      id="stock-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedStock) setSelectedStock(null);
                      }}
                      placeholder="e.g. AAPL, RELIANCE, TSLA"
                      className="mm-field"
                      style={{ paddingLeft: 40 }}
                      autoComplete="off"
                    />
                  </div>
                </Field>

                {showDropdown && searchResults.length > 0 && (
                  <ul className="mt-2 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-(--mm-line) bg-(--mm-card)" role="listbox" aria-label="Matching stocks">
                    {searchResults.map((item, idx) => (
                      <li key={idx} role="option" aria-selected={selectedStock?.symbol === item.symbol} className="border-t border-(--mm-line-2) first:border-t-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStock(item);
                            setSearchQuery(`${item.name} (${item.symbol})`);
                            setShowDropdown(false);
                          }}
                          className="mm-focus flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-(--mm-soft)"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-bold text-(--mm-ink)">{item.name}</span>
                            <span className="mm-lbl block">{item.type}</span>
                          </span>
                          <Pill tone="brand">{item.symbol}</Pill>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedStock && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-(--mm-green-soft) p-2.5 text-[13px] font-semibold text-(--mm-green-ink)">
                    <LineIcon name="check" size={16} strokeWidth={2.6} />
                    <span className="min-w-0 flex-1 truncate">Selected: {selectedStock.name} ({selectedStock.symbol})</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity" htmlFor="stock-qty">
                  <input
                    id="stock-qty"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    className="mm-field tabular-nums"
                    required
                  />
                </Field>
                <Field label="Buy price" htmlFor="stock-price">
                  <input
                    id="stock-price"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="any"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="e.g. 150.00"
                    className="mm-field tabular-nums"
                    required
                  />
                </Field>
              </div>

              {/* Ledger options */}
              <div className="space-y-3 rounded-2xl bg-(--mm-soft) p-3.5">
                <label htmlFor="recordTransactionCheckbox" className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] font-bold text-(--mm-ink)">
                  <input
                    type="checkbox"
                    id="recordTransactionCheckbox"
                    checked={recordTransaction}
                    onChange={(e) => setRecordTransaction(e.target.checked)}
                    className="h-5 w-5 shrink-0 cursor-pointer accent-(--mm-brand)"
                  />
                  Record in passbook
                </label>

                {recordTransaction && (
                  <div className="mm-divide space-y-3 pt-3">
                    <div>
                      <span className="mm-field-label" id="ledger-cat-label">Ledger category</span>
                      <div className="mm-seg w-full" role="group" aria-labelledby="ledger-cat-label">
                        <button
                          type="button"
                          aria-pressed={transactionType === 'SAVINGS'}
                          onClick={() => setTransactionType('SAVINGS')}
                          className={`mm-focus min-h-11 flex-1 ${transactionType === 'SAVINGS' ? 'is-on' : ''}`}
                        >
                          Savings
                        </button>
                        <button
                          type="button"
                          aria-pressed={transactionType === 'SPENDING'}
                          onClick={() => setTransactionType('SPENDING')}
                          className={`mm-focus min-h-11 flex-1 ${transactionType === 'SPENDING' ? 'is-on' : ''}`}
                        >
                          Spending
                        </button>
                      </div>
                    </div>

                    <label htmlFor="useSalaryBalanceCheckbox" className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] font-semibold text-(--mm-ink-2)">
                      <input
                        type="checkbox"
                        id="useSalaryBalanceCheckbox"
                        checked={useSalaryBalance}
                        onChange={(e) => setUseSalaryBalance(e.target.checked)}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-(--mm-brand)"
                      />
                      Deduct from monthly salary balance
                    </label>

                    {useSalaryBalance && (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Salary month" htmlFor="salary-month">
                          <select
                            id="salary-month"
                            value={salaryMonth}
                            onChange={(e) => setSalaryMonth(e.target.value)}
                            className="mm-field"
                          >
                            {monthsList.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Salary year" htmlFor="salary-year">
                          <input
                            id="salary-year"
                            type="number"
                            inputMode="numeric"
                            value={salaryYear}
                            onChange={(e) => setSalaryYear(e.target.value)}
                            className="mm-field tabular-nums"
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="mm-btn mm-btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={adding || !selectedStock} className="mm-btn mm-btn-amber flex-1">
                  {adding && <LineIcon name="spinner" size={16} className="animate-spin" />}
                  Save holding
                </button>
              </div>
            </form>
          </>
        )}
      </Sheet>
    </InvestPage>
  );
}
