'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import TransactionModal from '@/components/TransactionModal';
import AiQuickAddInput from '@/components/AiQuickAddInput';
import { getRecentCycles } from '@/lib/spendAnalytics';
import { useChartTheme } from '@/components/reports/chartTheme';
import { useCachedFetch, readPref, writePref, DASH_CACHE_PREFIX } from '@/components/dashboard/useCachedFetch';
import CyclePicker, { MAX_COMPARE } from '@/components/dashboard/CyclePicker';
import MerchantCompareChart from '@/components/dashboard/MerchantCompareChart';
import MerchantDetail from '@/components/dashboard/MerchantDetail';
import DashboardHero from '@/components/dashboard/DashboardHero';
import TopItems from '@/components/dashboard/TopItems';
import RecentList from '@/components/dashboard/RecentList';
import SalaryModal, { MONTHS } from '@/components/dashboard/SalaryModal';
import { makeMoney, relativeTime, shortDate, cycleKeyOf } from '@/components/dashboard/format';
import Surface from '@/components/ui/Surface';
import Icon3D from '@/components/ui/Icon3D';
import Button from '@/components/ui/Button';
import { ErrorState, EmptyState, Skeleton } from '@/components/ui/States';

const DEFAULT_PRESETS = [
  { label: 'Dinner', icon: '🍔', title: 'Dinner', amount: 250, type: 'SPENDING', desc: 'Dining / Food' },
  { label: 'Coffee', icon: '☕', title: 'Coffee', amount: 50, type: 'SPENDING', desc: 'Daily caffeine run' },
  { label: 'Cab/Fuel', icon: '🚗', title: 'Cab / Fuel', amount: 150, type: 'SPENDING', desc: 'Transport ride' },
  { label: 'Groceries', icon: '🛒', title: 'Groceries', amount: 500, type: 'SPENDING', desc: 'Daily essentials' },
];

/** One-tap presets built from the user's latest distinct transactions. */
function buildPresets(recent) {
  if (!recent?.length) return DEFAULT_PRESETS;
  const seen = new Set();
  const presets = [];
  for (const t of recent) {
    const title = (t.title || 'Untitled').trim();
    const type = t.type || 'SPENDING';
    const key = `${title.toLowerCase()}_${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    presets.push({
      label: title.length > 14 ? `${title.substring(0, 12)}..` : title,
      icon: '💸',
      title,
      amount: parseFloat(t.amount || 0),
      type,
      desc: t.description || `Recent ${type.toLowerCase()} entry`,
    });
    if (presets.length >= 7) break;
  }
  return presets.length ? presets : DEFAULT_PRESETS;
}

/** Saved cycle selection → [{ key, slot }], falling back to current + previous. */
function loadSelection(uid, options) {
  const valid = new Set(options.map(o => o.key));
  const saved = readPref(`${DASH_CACHE_PREFIX}${uid}:cycles`, null);
  if (Array.isArray(saved)) {
    const clean = saved.filter(s => valid.has(s?.key) && Number.isInteger(s?.slot) && s.slot >= 0 && s.slot < MAX_COMPARE);
    if (clean.length) return clean.slice(0, MAX_COMPARE);
  }
  return options.slice(0, 2).map((o, i) => ({ key: o.key, slot: i }));
}

function ChartSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex items-center gap-2">
        <Icon3D name="sparkles" size={24} className="animate-pulse" />
        <p className="text-sm font-semibold text-shimmer">Grouping your spends with AI…</p>
      </div>
      <p className="mt-1 text-xs text-ink-2">First time only. Next time this opens instantly.</p>
      <ul className="mt-4 space-y-4">
        {[0.92, 0.7, 0.52, 0.38, 0.24].map((w, i) => (
          <li key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5" style={{ width: `${w * 100}%` }} />
              <Skeleton className="h-2.5" style={{ width: `${w * 80}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SyncStatus({ refreshing, error, savedAt, hasData, onRetry, onBrand }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (!hasData) return null;
  const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold';
  const neutral = onBrand ? 'bg-white/15 text-white' : 'bg-card-3 text-ink-2';
  if (refreshing) {
    return (
      <span className={`${base} ${neutral}`} role="status">
        <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" /> Updating…
      </span>
    );
  }
  if (error) {
    return (
      <button type="button" onClick={onRetry} className={`${base} cursor-pointer ${onBrand ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-warning-soft text-secondary-ink hover:brightness-95'}`}>
        <AlertCircle className="h-3 w-3" aria-hidden="true" /> Saved data · Retry
      </button>
    );
  }
  return <span className={`${base} ${neutral}`}>Updated {relativeTime(savedAt)}</span>;
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const theme = useChartTheme();

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [detailSlug, setDetailSlug] = useState(null);
  const [selectedState, setSelectedState] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const uid = user?.id || user?.uid || null;
  const cycleDate = user?.salaryCycleDate || 1;
  const currency = user?.currency || 'INR';
  const money = useMemo(() => makeMoney(currency), [currency]);
  const formatCurrency = useCallback((val) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val || 0);
  }, [currency]);

  // Last 12 cycles, newest first.
  const options = useMemo(() => getRecentCycles(12, cycleDate).reverse().map((c, i) => ({
    key: cycleKeyOf(c),
    label: c.label,
    startDate: c.startDate,
    endDate: c.endDate,
    isCurrent: i === 0,
  })), [cycleDate]);

  const selected = useMemo(
    () => selectedState ?? (uid ? loadSelection(uid, options) : []),
    [selectedState, uid, options],
  );
  const sortedKeys = useMemo(() => selected.map(s => s.key).sort().reverse(), [selected]);
  const slotOf = useMemo(() => new Map(selected.map(s => [s.key, s.slot])), [selected]);

  const toggleCycle = (key) => {
    let next;
    if (slotOf.has(key)) {
      if (selected.length === 1) return;
      next = selected.filter(s => s.key !== key);
    } else {
      if (selected.length >= MAX_COMPARE) return;
      const used = new Set(selected.map(s => s.slot));
      const slot = [0, 1, 2, 3].find(n => !used.has(n));
      next = [...selected, { key, slot }];
    }
    setSelectedState(next);
    if (uid) writePref(`${DASH_CACHE_PREFIX}${uid}:cycles`, next);
  };

  // --- Data (stale-while-revalidate) --------------------------------------
  const spend = useCachedFetch(
    uid && sortedKeys.length ? `/api/dashboard/spend-groups?cycles=${sortedKeys.join(',')}` : null,
    uid && sortedKeys.length ? `${DASH_CACHE_PREFIX}${uid}:spend:${sortedKeys.join(',')}` : null,
    { group: `${DASH_CACHE_PREFIX}${uid}:spend:`, keep: 8, onUnauthorized: logout },
  );

  const kpi = useCachedFetch(
    uid ? '/api/dashboard?filter=current' : null,
    uid ? `${DASH_CACHE_PREFIX}${uid}:kpis` : null,
    {
      onUnauthorized: logout,
      select: (p) => ({
        startDate: p.startDate,
        endDate: p.endDate,
        kpis: p.kpis,
        trends: p.trends,
        recentTransactions: (p.recentTransactions || []).slice(0, 15).map(t => ({
          title: t.title, amount: t.amount, type: t.type, description: t.description,
        })),
      }),
    },
  );

  const shown = spend.data || spend.placeholderData;
  const isPlaceholder = !spend.data && !!spend.placeholderData;

  const chartCycles = useMemo(() => (shown?.cycles || []).map((c, i) => ({
    ...c,
    color: theme.cycles[slotOf.get(c.key) ?? i] || theme.cycles[0],
  })), [shown, slotOf, theme.cycles]);

  const detail = detailSlug ? shown?.merchants?.find(m => m.slug === detailSlug) || null : null;
  const primaryOption = options.find(o => o.key === sortedKeys[0]);
  const currentOption = options[0];

  const refreshAll = () => {
    spend.refresh();
    kpi.refresh();
  };

  const openNewEntry = () => {
    setEntryToEdit(null);
    setEntryModalOpen(true);
  };

  const openEdit = useCallback((entry) => {
    setEntryToEdit({
      id: entry.id,
      amount: entry.amount,
      title: entry.title,
      description: entry.description,
      type: entry.type || 'SPENDING',
      date: entry.date,
      useSalaryBalance: entry.useSalaryBalance,
      salaryMonth: entry.salaryMonth,
      salaryYear: entry.salaryYear,
    });
    setEntryModalOpen(true);
  }, []);

  const closeDetail = useCallback(() => setDetailSlug(null), []);

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Icon3D name="savings" size={56} className="animate-pulse" />
      </div>
    );
  }

  const renderSync = (onBrand) => (
    <SyncStatus
      onBrand={onBrand}
      refreshing={spend.isRefreshing || kpi.isRefreshing}
      error={spend.error}
      savedAt={spend.savedAt}
      hasData={!!shown}
      onRetry={refreshAll}
    />
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-canvas text-ink app-sidebar-offset overflow-x-hidden">
      <Navbar />

      <main data-ui="v2" className="w-full max-w-6xl flex-grow mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-28 md:pb-10 space-y-4 md:space-y-5">
        <DashboardHero
          kpis={kpi.data?.kpis}
          trends={kpi.data?.trends}
          cycleLabel={currentOption?.label}
          dateRange={currentOption ? `${shortDate(currentOption.startDate)} – ${shortDate(currentOption.endDate)}` : ''}
          sync={renderSync}
          money={money}
          loading={kpi.isFirstLoad}
          onIncome={() => setSalaryModalOpen(true)}
          onNewEntry={openNewEntry}
        />

        <AiQuickAddInput
          onPrefill={(parsedTx) => { setEntryToEdit(parsedTx); setEntryModalOpen(true); }}
          dynamicPresets={buildPresets(kpi.data?.recentTransactions)}
          formatCurrency={formatCurrency}
          onOpenCustomModal={openNewEntry}
        />

        <div className="space-y-2">
          <div className="hidden md:flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[15px] font-bold text-ink">Compare cycles</h2>
            <span className="text-[11px] text-ink-3">
              {primaryOption ? `${shortDate(primaryOption.startDate)} – ${shortDate(primaryOption.endDate)} · ` : ''}up to {MAX_COMPARE}
            </span>
          </div>
          <CyclePicker options={options} selected={selected} colors={theme.cycles} onToggle={toggleCycle} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start md:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Surface>
            {!shown ? (
              spend.error && !spend.isRefreshing ? (
                <ErrorState
                  title="Couldn't load your spending"
                  message={spend.error}
                  onRetry={spend.refresh}
                />
              ) : (
                <ChartSkeleton />
              )
            ) : shown.merchants.length === 0 ? (
              <EmptyState
                icon="receipt"
                title="No spending in these cycles yet"
                message="Log a purchase and AI will group it by merchant here."
                action={<Button variant="secondary" onClick={openNewEntry}>Add an entry</Button>}
                className={isPlaceholder ? 'opacity-55' : ''}
              />
            ) : (
              <MerchantCompareChart
                merchants={shown.merchants}
                cycles={chartCycles}
                money={money}
                dimmed={isPlaceholder}
                onSelect={(m) => setDetailSlug(m.slug)}
              />
            )}
          </Surface>

          <div className="md:space-y-5">
            {shown?.merchants?.length > 0 && (
              <Surface>
                <TopItems merchants={shown.merchants} cycleKey={chartCycles[0]?.key} cycleLabel={chartCycles[0]?.label} money={money} />
              </Surface>
            )}
            <Surface>
              <RecentList recent={shown?.recent || []} cycleLabel={chartCycles[0]?.label} money={money} onEdit={openEdit} />
            </Surface>
          </div>
        </div>
      </main>

      <div data-ui="v2">
        <MerchantDetail
          merchant={detail}
          cycles={chartCycles}
          money={money}
          onClose={closeDetail}
          onEditEntry={openEdit}
        />
        <SalaryModal
          open={salaryModalOpen}
          onClose={() => setSalaryModalOpen(false)}
          user={user}
          onSaved={kpi.refresh}
        />
      </div>

      {/* Legacy component: stays outside data-ui="v2" so the light-mode remap still applies to it. */}
      <TransactionModal
        isOpen={entryModalOpen}
        onClose={() => { setEntryModalOpen(false); setEntryToEdit(null); }}
        entryToEdit={entryToEdit}
        parentLending={null}
        onSuccess={refreshAll}
        user={user}
        monthsList={MONTHS}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
