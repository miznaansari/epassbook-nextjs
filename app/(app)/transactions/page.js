'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import TransactionModal from '@/components/TransactionModal';
import LineIcon from '@/components/ui/LineIcon';
import { Skeleton } from '@/components/ui/States';
import { MONTHS } from '@/components/dashboard/SalaryModal';
import { useCachedFetch, DASH_CACHE_PREFIX } from '@/components/dashboard/useCachedFetch';
import { paceVsLast, VISIBLE_CYCLES } from '@/components/dashboard/overview/model';
import { FILTERS, entryQuery, describeEntry, groupEntries, entriesToCsv, dayKey } from '@/components/passbook/ledger';
import { EntryRow, LedgerSection } from '@/components/passbook/LedgerList';
import MonthWise, { paceNote } from '@/components/passbook/MonthWise';
import SelectionBar from '@/components/passbook/SelectionBar';

const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200; // matches the API cap
const VIEWS = [
  { id: 'day', label: 'Day wise' },
  { id: 'month', label: 'Month wise' },
];

/** Ledger amounts keep paise when there are any (₹350, ₹10.50). */
function makeLedgerMoney(currency) {
  const code = currency || 'INR';
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  const make = (digits) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: digits, maximumFractionDigits: digits });
    } catch {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
  };
  const whole = make(0);
  const exact = make(2);
  return (v) => {
    const n = Math.round((Number(v) || 0) * 100) / 100;
    return (Number.isInteger(n) ? whole : exact).format(n);
  };
}

function useMedia(query) {
  const subscribe = useCallback((onChange) => {
    const m = window.matchMedia(query);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-[22px]" aria-busy="true" aria-label="Loading entries">
      {[4, 2, 3].map((rows, i) => (
        <div key={i}>
          <Skeleton className="mb-3 ml-0.5 h-4 w-48" />
          <div className="mm-card overflow-hidden">
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="mm-tr">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Passbook() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Ledger (cursor-paginated: newest first, PAGE_SIZE per page)
  const [entries, setEntries] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loadedKey, setLoadedKey] = useState(null); // query key of the last finished first-page load
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [view, setView] = useState('day');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const requestIdRef = useRef(0);
  const sentinelRef = useRef(null);

  // Selection (bulk delete)
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [parentLending, setParentLending] = useState(null);

  const isTablet = useMedia('(min-width: 768px)');
  const isDesktop = useMedia('(min-width: 1024px)');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Debounce the search box so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Filter + search identify the list; the skeleton shows until that list's first page arrives.
  const queryKey = `${filter}|${debouncedSearch}`;
  const loadingEntries = loadedKey !== queryKey;

  // A new list drops the selection, so hidden rows can never be bulk-deleted.
  const [selectionKey, setSelectionKey] = useState(queryKey);
  if (selectionKey !== queryKey) {
    setSelectionKey(queryKey);
    setSelectedIds(new Set());
  }

  const uid = user?.id || user?.uid || null;
  const cycleDate = user?.salaryCycleDate || 1;
  const currency = user?.currency || 'INR';
  const money = useMemo(() => makeLedgerMoney(currency), [currency]);
  const formatCurrency = useCallback((val) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val || 0);
  }, [currency]);

  /** Fetch one page for the current filter/search. Returns null on 401 (after logging out). */
  const fetchPage = useCallback(async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    const params = entryQuery(filter, debouncedSearch);
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', String(cursor));

    const res = await fetch(`/api/entries?${params}`);
    if (res.status === 401) {
      logout();
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [filter, debouncedSearch, logout]);

  /**
   * (Re)load the first page. `limit` > PAGE_SIZE is used after edits so the rows
   * already on screen are refreshed in place. Superseded responses are dropped.
   */
  const loadFirstPage = useCallback((limit = PAGE_SIZE) => {
    const requestId = ++requestIdRef.current;
    const key = queryKey;
    const isCurrent = () => requestId === requestIdRef.current;
    return fetchPage({ limit })
      .then((payload) => {
        if (!isCurrent() || !payload) return;
        setEntries(payload.items);
        setNextCursor(payload.nextCursor);
        setTotalCount(payload.total ?? payload.items.length);
        setLoadError('');
      })
      .catch((err) => {
        console.error('Error fetching transactions:', err);
        if (isCurrent()) setLoadError('Could not load your passbook. Please retry.');
      })
      .finally(() => {
        if (isCurrent()) setLoadedKey(key);
      });
  }, [fetchPage, queryKey]);

  /** Append the next page (infinite scroll / Load more). */
  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const payload = await fetchPage({ cursor: nextCursor });
      if (requestId !== requestIdRef.current || !payload) return;
      setEntries(prev => [...prev, ...payload.items]);
      setNextCursor(payload.nextCursor);
      setLoadError('');
    } catch (err) {
      console.error('Error fetching more transactions:', err);
      if (requestId === requestIdRef.current) setLoadError('Could not load more entries. Please retry.');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, nextCursor]);

  useEffect(() => {
    if (user) loadFirstPage();
  }, [user, loadFirstPage]);

  // Spending per cycle (shared cache with the dashboard).
  const overview = useCachedFetch(
    uid ? '/api/dashboard/overview' : null,
    uid ? `${DASH_CACHE_PREFIX}${uid}:overview` : null,
    { onUnauthorized: logout },
  );
  const cycles = overview.data?.cycles || null;
  const current = cycles?.[0] || null;
  const pace = useMemo(() => paceVsLast(current, cycles?.[1]), [current, cycles]);
  const spendDays = useMemo(() => {
    if (!current) return 0;
    let days = 0;
    for (let i = 0; i < current.elapsed; i++) {
      if (current.cumulative[i] > (i ? current.cumulative[i - 1] : 0)) days += 1;
    }
    return days;
  }, [current]);

  // After a create / edit / delete: refresh what's on screen without collapsing the list
  const refreshAll = () => {
    loadFirstPage(Math.min(Math.max(entries.length, PAGE_SIZE), MAX_PAGE_SIZE));
    overview.refresh();
  };

  // Desktop: infinite scroll (Month wise sits beside the list). Smaller screens use
  // the Load more button, so the Month wise card below the list stays reachable.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!isDesktop || !node || !nextCursor || loadingEntries || loadingMore || loadError) return;
    const observer = new IntersectionObserver(
      (items) => { if (items[0]?.isIntersecting) loadMore(); },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isDesktop, nextCursor, loadingEntries, loadingMore, loadError, loadMore]);

  const groups = useMemo(() => groupEntries(entries, view, cycleDate), [entries, view, cycleDate]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-(--mm-canvas)">
        <span className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-[#4F46E5] text-white">
          <LineIcon name="passbook" size={28} />
        </span>
      </div>
    );
  }

  // --- Actions ---------------------------------------------------------------

  const openEdit = (entry) => {
    setParentLending(null);
    setEntryToEdit(entry);
    setEntryModalOpen(true);
  };

  const openRepay = (entry) => {
    setEntryToEdit(null);
    setParentLending(entry);
    setEntryModalOpen(true);
  };

  const toggleCollapse = (key) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const toggleOne = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const toggleGroup = (group) => setSelectedIds(prev => {
    const ids = group.entries.map(e => e.id);
    const next = new Set(prev);
    if (ids.every(id => next.has(id))) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    return next;
  });

  const toggleAllLoaded = () => setSelectedIds(prev => (
    entries.length && entries.every(e => prev.has(e.id)) ? new Set() : new Set(entries.map(e => e.id))
  ));

  const stopSelecting = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length || deleting) return;
    if (!confirm(`Delete ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} permanently?`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        stopSelecting();
        refreshAll();
      } else if (res.status === 401) {
        logout();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Could not delete the selected entries.');
      }
    } catch (err) {
      console.error('Batch delete error:', err);
      alert('Could not delete the selected entries.');
    } finally {
      setDeleting(false);
    }
  };

  /** Every entry matching the current filter + search, as a CSV download. */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const all = [];
      let cursor = null;
      do {
        const page = await fetchPage({ cursor, limit: MAX_PAGE_SIZE });
        if (!page) return;
        all.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      // BOM so Excel reads the file (₹, names) as UTF-8.
      const blob = new Blob([String.fromCharCode(0xfeff), entriesToCsv(all, money)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passbook-${dayKey(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Export error:', err);
      alert('Could not export your passbook. Please retry.');
    } finally {
      setExporting(false);
    }
  };

  // --- Derived ---------------------------------------------------------------

  const total = Math.max(totalCount, entries.length);
  const matching = debouncedSearch ? ` matching “${debouncedSearch}”` : '';
  const selectedTotal = entries.reduce((s, e) => (selectedIds.has(e.id) ? s + Math.abs(parseFloat(e.amount) || 0) : s), 0);
  const hasQuery = filter !== 'ALL' || !!debouncedSearch;
  const showMonthWise = !(overview.error && !overview.data);
  const note = paceNote(pace, money, current?.label);
  const paceDown = pace?.pct !== null && pace?.pct < 0;

  const segment = (className) => (
    <div className={`mm-seg ${className}`} role="group" aria-label="Group entries">
      {VIEWS.map(v => (
        <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)} className={view === v.id ? 'is-on' : ''}>
          {v.label}
        </button>
      ))}
    </div>
  );

  return (
    <div data-ui="v2" className="mm relative flex flex-1 flex-col overflow-x-hidden bg-(--mm-canvas)">
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-3.5 px-5 pb-[110px] pt-[max(1rem,env(safe-area-inset-top))] md:gap-5 md:px-10 md:pb-10 md:pt-7">

        <header className="flex items-center justify-between gap-4 md:items-end">
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold leading-tight text-(--mm-ink) md:text-[28px]">E-Passbook</h1>
            <div className="mm-lbl mt-0.5 truncate" aria-live="polite">
              {loadingEntries
                ? 'Loading your ledger…'
                : <>{isTablet ? 'Showing ' : ''}{entries.length.toLocaleString()} of {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'}{matching}</>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {segment('hidden md:inline-flex')}
            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting || loadingEntries || !entries.length}
              className="mm-btn mm-btn-ghost w-11 px-0 md:w-auto md:px-[18px]"
              aria-label="Export as CSV"
            >
              <LineIcon name={exporting ? 'spinner' : 'download'} className={exporting ? 'animate-spin' : ''} />
              <span className="hidden md:inline">{exporting ? 'Exporting…' : 'Export'}</span>
            </button>
          </div>
        </header>

        {/* Mobile: current cycle at a glance */}
        {showMonthWise && (
          <div className="flex items-center justify-between gap-3 rounded-[20px] bg-(--mm-hero) p-[18px] text-white md:hidden">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-(--mm-hero-muted)">{current ? `${current.label} spending` : 'This cycle'}</div>
              {current ? (
                <div className="text-[30px] font-extrabold leading-tight tabular-nums">{money(current.total)}</div>
              ) : (
                <span className="mt-1 block h-8 w-36 animate-pulse rounded-lg bg-white/15" aria-hidden="true" />
              )}
            </div>
            {current && (
              <div className="shrink-0 text-right text-[12px] font-bold">
                {pace?.pct !== null && (
                  <div className={paceDown ? 'text-(--mm-hero-good)' : 'text-(--mm-hero-bad)'}>
                    {paceDown ? '↓' : '↑'} {Math.round(Math.abs(pace.pct))}% vs {pace.prevMonth}
                  </div>
                )}
                <div className="text-(--mm-hero-muted)">{spendDays} {spendDays === 1 ? 'day' : 'days'} with spending</div>
              </div>
            )}
          </div>
        )}

        {segment('flex md:hidden [&>button]:flex-1')}

        <div className="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-center md:gap-3">
          <label className="mm-card flex items-center gap-2.5 rounded-xl px-3.5 focus-within:border-(--mm-brand-line) md:min-w-[260px] md:flex-1">
            <span className="text-(--mm-ink-3)"><LineIcon name="search" /></span>
            <span className="sr-only">Search ledger</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isTablet ? 'Search title, category or amount' : 'Search ledger'}
              className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-[14px] font-medium text-(--mm-ink) outline-none placeholder:text-(--mm-ink-3) [&::-webkit-search-cancel-button]:hidden"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="mm-focus rounded-md p-1 text-(--mm-ink-3) hover:text-(--mm-ink) cursor-pointer" aria-label="Clear search">
                <LineIcon name="close" size={16} />
              </button>
            )}
          </label>

          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {FILTERS.map(f => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`mm-ft ${filter === f.id ? 'is-on' : ''}`}>
                {f.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={selecting}
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
              className={`mm-ft ${selecting ? 'is-on' : ''}`}
              disabled={loadingEntries || !entries.length}
            >
              <LineIcon name="select" size={16} /> {selecting ? 'Done' : 'Select'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-3.5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-[22px]">
            {loadingEntries ? (
              <ListSkeleton />
            ) : loadError && !entries.length ? (
              <div className="mm-card flex flex-col items-center gap-3 p-8 text-center" role="alert">
                <span className="mm-in bg-(--mm-red-soft) text-(--mm-red-ink)"><LineIcon name="alert" /></span>
                <p className="text-[14px] font-bold text-(--mm-ink)">{loadError}</p>
                <button type="button" onClick={() => loadFirstPage()} className="mm-btn mm-btn-ghost">
                  <LineIcon name="refresh" /> Retry
                </button>
              </div>
            ) : groups.length === 0 ? (
              <div className="mm-card flex flex-col items-center gap-2 p-8 text-center">
                <span className="mm-in bg-(--mm-indigo-soft) text-(--mm-brand-ink)"><LineIcon name="passbook" /></span>
                <p className="mt-1 text-[15px] font-extrabold text-(--mm-ink)">{hasQuery ? 'No entries match' : 'Your passbook is empty'}</p>
                <p className="max-w-xs text-[13px] text-(--mm-ink-2)">
                  {hasQuery ? 'Try another search or filter.' : 'Every spend, saving and loan you log shows up here, day by day.'}
                </p>
                {hasQuery ? (
                  <button type="button" onClick={() => { setFilter('ALL'); setSearchTerm(''); }} className="mm-btn mm-btn-ghost mt-2">Clear filters</button>
                ) : (
                  <button type="button" onClick={() => openEdit(null)} className="mm-btn mm-btn-amber mt-2"><LineIcon name="plus" /> Add entry</button>
                )}
              </div>
            ) : (
              groups.map(group => (
                <LedgerSection
                  key={group.key}
                  group={group}
                  money={money}
                  collapsed={collapsed.has(group.key)}
                  onToggleCollapse={() => toggleCollapse(group.key)}
                  selecting={selecting}
                  selectedIds={selectedIds}
                  onToggleGroup={toggleGroup}
                >
                  {group.entries.map(entry => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      view={describeEntry(entry, money, { withDate: view === 'month' })}
                      money={money}
                      selecting={selecting}
                      selected={selectedIds.has(entry.id)}
                      onToggle={() => toggleOne(entry.id)}
                      onEdit={() => openEdit(entry)}
                      onRepay={() => openRepay(entry)}
                    />
                  ))}
                </LedgerSection>
              ))
            )}

            {/* Pagination: infinite-scroll sentinel (desktop), Load more, errors */}
            {!loadingEntries && entries.length > 0 && (
              <div className="flex flex-col items-center gap-2">
                {loadError ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[13px] font-semibold text-(--mm-red-ink)" role="alert">
                    <LineIcon name="alert" size={16} /> {loadError}
                    <button type="button" onClick={() => (nextCursor ? loadMore() : loadFirstPage())} className="mm-btn mm-btn-ghost min-h-9 px-3 text-[13px]">Retry</button>
                  </div>
                ) : nextCursor ? (
                  <>
                    <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
                    <button type="button" onClick={loadMore} disabled={loadingMore} className="mm-btn mm-btn-ghost">
                      {loadingMore
                        ? <><LineIcon name="spinner" className="animate-spin" /> Loading more…</>
                        : `Load more (${Math.max(totalCount - entries.length, 0).toLocaleString()} left)`}
                    </button>
                  </>
                ) : entries.length > PAGE_SIZE ? (
                  <span className="mm-lbl">You&apos;ve reached the first entry.</span>
                ) : null}
              </div>
            )}
          </div>

          {showMonthWise && (
            <aside className="lg:sticky lg:top-7" aria-label="Spending per cycle">
              <MonthWise cycles={cycles ? cycles.slice(0, VISIBLE_CYCLES) : null} note={note} money={money} />
            </aside>
          )}
        </div>
      </main>

      {selecting && (
        <SelectionBar
          count={selectedIds.size}
          total={selectedTotal}
          loaded={entries.length}
          money={money}
          deleting={deleting}
          onSelectAll={toggleAllLoaded}
          onDelete={deleteSelected}
          onDone={stopSelecting}
        />
      )}

      {/* Legacy component: stays outside data-ui="v2" so the light-mode remap still applies to it. */}
      <TransactionModal
        isOpen={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false);
          setEntryToEdit(null);
          setParentLending(null);
        }}
        entryToEdit={entryToEdit}
        parentLending={parentLending}
        onSuccess={refreshAll}
        user={user}
        monthsList={MONTHS}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
