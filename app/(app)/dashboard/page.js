'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import TransactionModal from '@/components/TransactionModal';
import AiQuickAddInput from '@/components/AiQuickAddInput';
import ScanReceiptButton from '@/components/ScanReceiptButton';
import LineIcon from '@/components/ui/LineIcon';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { getRecentCycles } from '@/lib/spendAnalytics';
import { useCachedFetch, DASH_CACHE_PREFIX } from '@/components/dashboard/useCachedFetch';
import SalaryModal, { MONTHS } from '@/components/dashboard/SalaryModal';
import { makeMoney, shortDate, cycleKeyOf } from '@/components/dashboard/format';
import Hero from '@/components/dashboard/overview/Hero';
import CycleChips from '@/components/dashboard/overview/CycleChips';
import InsightCards from '@/components/dashboard/overview/InsightCards';
import { WhereItWent, CycleBars, SpendingPace } from '@/components/dashboard/overview/Charts';
import { TopItems, CategoryBreakdown } from '@/components/dashboard/overview/Lists';
import {
  VISIBLE_CYCLES,
  categorySlices,
  paceVsLast,
  paceInsight,
  safeSpendInsight,
  moverInsight,
} from '@/components/dashboard/overview/model';

function SyncPill({ refreshing, error, onRetry }) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold';
  if (error) {
    return (
      <button type="button" onClick={onRetry} className={`${base} mm-focus cursor-pointer bg-(--mm-gold-soft) text-(--mm-gold-ink) hover:brightness-95`}>
        <LineIcon name="alert" size={12} /> Couldn&apos;t refresh · Retry
      </button>
    );
  }
  if (refreshing) {
    return (
      <span className={`${base} bg-(--mm-card) text-(--mm-ink-3) ring-1 ring-(--mm-line)`} role="status">
        <LineIcon name="refresh" size={12} className="animate-spin" /> Updating…
      </span>
    );
  }
  return null;
}

function CardSkeleton({ rows = 3, tall = false }) {
  return (
    <div className="mm-card p-[22px]" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-44" />
      {tall ? (
        <Skeleton className="mt-5 h-[150px] w-full rounded-2xl" />
      ) : (
        <div className="mt-5 space-y-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-2.5 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [focusState, setFocusState] = useState(null);

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

  // Chip labels are known up front, so the picker renders before data arrives.
  const chipCycles = useMemo(() => getRecentCycles(VISIBLE_CYCLES, cycleDate).reverse().map((c, i) => ({
    key: cycleKeyOf(c),
    label: c.label,
    startDate: c.startDate,
    endDate: c.endDate,
    isCurrent: i === 0,
  })), [cycleDate]);
  const currentChip = chipCycles[0];
  const focusKey = chipCycles.some(c => c.key === focusState) ? focusState : currentChip.key;

  // --- Data (stale-while-revalidate) --------------------------------------
  const overview = useCachedFetch(
    uid ? '/api/dashboard/overview' : null,
    uid ? `${DASH_CACHE_PREFIX}${uid}:overview` : null,
    { onUnauthorized: logout },
  );

  const kpi = useCachedFetch(
    uid ? '/api/dashboard?filter=current' : null,
    uid ? `${DASH_CACHE_PREFIX}${uid}:kpis` : null,
    {
      onUnauthorized: logout,
      select: (p) => ({ startDate: p.startDate, endDate: p.endDate, kpis: p.kpis, trends: p.trends }),
    },
  );

  const cycles = useMemo(() => overview.data?.cycles || [], [overview.data]);
  const current = cycles[0] || null;
  const focusIdx = Math.max(0, cycles.findIndex(c => c.key === focusKey));
  const focus = cycles[focusIdx] || null;
  const previous = cycles[focusIdx + 1] || null;
  const barCycles = useMemo(() => cycles.slice(0, VISIBLE_CYCLES).reverse(), [cycles]);
  const slices = useMemo(() => categorySlices(focus, previous), [focus, previous]);

  const kpis = kpi.data?.kpis || null;
  const spent = kpis?.spending ?? current?.total ?? 0;
  const pace = useMemo(() => paceVsLast(current, cycles[1], spent), [current, cycles, spent]);
  const insights = [
    paceInsight(pace, money),
    safeSpendInsight(kpis, current, currentChip.endDate, money),
    moverInsight(focus, previous, money),
  ];

  const refreshAll = () => {
    overview.refresh();
    kpi.refresh();
  };

  const openNewEntry = () => {
    setEntryToEdit(null);
    setEntryModalOpen(true);
  };

  const openPrefilled = (parsedTx) => {
    setEntryToEdit(parsedTx);
    setEntryModalOpen(true);
  };

  if (loading && !user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-(--mm-canvas)">
        <span className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-[#4F46E5] text-white">
          <LineIcon name="wallet" size={28} />
        </span>
      </div>
    );
  }

  const dateRange = `${shortDate(currentChip.startDate)} – ${shortDate(currentChip.endDate)}`;
  const hasData = !!(overview.data || kpi.data);
  const syncError = hasData ? (overview.error || kpi.error) : null;
  const refreshing = hasData && (overview.isRefreshing || kpi.isRefreshing);
  const sync = (syncError || refreshing) ? <SyncPill refreshing={refreshing} error={syncError} onRetry={refreshAll} /> : null;

  return (
    <div data-ui="v2" className="mm relative flex flex-1 flex-col overflow-x-hidden bg-(--mm-canvas)">
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-3.5 px-5 pb-[110px] pt-4 md:gap-5 md:px-10 md:pb-10 md:pt-7">

        {/* Desktop header (mobile shows logo + scan in the app bar) */}
        <header className="order-first hidden items-center justify-between gap-4 md:flex">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mm-lbl">{dateRange}</span>
              {sync}
            </div>
            <h1 className="mt-0.5 text-[28px] font-extrabold leading-tight text-(--mm-ink)">Dashboard</h1>
          </div>
          <ScanReceiptButton className="mm-btn mm-btn-ghost">
            <LineIcon name="camera" /> Scan receipt
          </ScanReceiptButton>
        </header>
        {sync && <div className="order-first md:hidden">{sync}</div>}

        <div className="order-1">
          <Hero
            kpis={kpis}
            spent={spent}
            pace={pace}
            cycleLabel={currentChip.label}
            dateRange={dateRange}
            money={money}
            loading={!kpi.data}
          />
        </div>

        {/* Quick entry. Desktop: [input][New entry][Income]. Mobile: buttons, then input. */}
        <div className="order-2 grid grid-cols-2 gap-x-2.5 gap-y-3.5 md:order-3 md:flex md:gap-3">
          <div className="order-last col-span-2 min-w-0 md:order-none md:flex-1">
            <AiQuickAddInput onPrefill={openPrefilled} />
          </div>
          <button type="button" onClick={openNewEntry} className="mm-btn mm-btn-amber">
            <LineIcon name="plus" /> New entry
          </button>
          <button type="button" onClick={() => setSalaryModalOpen(true)} className="mm-btn mm-btn-ghost">
            Income
          </button>
        </div>

        <div className="order-3 md:order-2">
          <CycleChips cycles={chipCycles} focusKey={focusKey} onSelect={setFocusState} />
        </div>

        <div className="order-4">
          <InsightCards
            insights={insights}
            onAction={(action) => { if (action === 'income') setSalaryModalOpen(true); }}
          />
        </div>

        <div className="order-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-5 [&>*>*]:h-full">
          {!focus ? (
            overview.error && !overview.isRefreshing ? (
              <div className="mm-card p-[22px] md:col-span-2">
                <ErrorState title="Couldn't load your spending" message={overview.error} onRetry={overview.refresh} />
              </div>
            ) : (
              <>
                <div><CardSkeleton tall /></div>
                <div><CardSkeleton tall /></div>
                <div><CardSkeleton tall /></div>
                <div><CardSkeleton /></div>
                <div className="md:col-span-2"><CardSkeleton rows={4} /></div>
              </>
            )
          ) : (
            <>
              <div className="order-1">
                <WhereItWent cycle={focus} slices={slices} money={money} />
              </div>
              <div className="order-2">
                <CycleBars cycles={barCycles} focusKey={focus.key} onSelect={setFocusState} money={money} />
              </div>
              <div className="order-3">
                <SpendingPace focus={focus} previous={previous} money={money} />
              </div>
              <div className="order-5 md:order-4">
                <TopItems cycle={focus} slices={slices} money={money} />
              </div>
              <div className="order-4 md:order-5 md:col-span-2">
                <CategoryBreakdown cycle={focus} previous={previous} slices={slices} money={money} />
              </div>
            </>
          )}
        </div>
      </main>

      <div data-ui="v2">
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
