'use client';

import { useMemo, useState } from 'react';
import Sheet, { SheetDragArea } from '@/components/ui/Sheet';
import LineIcon from '@/components/ui/LineIcon';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { shortDate } from '@/components/dashboard/format';
import { describeEntry } from '@/components/passbook/ledger';
import { changeTag, groupByPlace } from './model';

function EntryButton({ entry, money, onEdit }) {
  const view = describeEntry({ ...entry, spendGroup: entry.group }, money);
  const title = (entry.title || '').trim();
  const showTitle = title && title.toLowerCase() !== (entry.item || '').toLowerCase();
  return (
    <li className="mm-divide first:border-t-0">
      <button
        type="button"
        onClick={() => onEdit(entry)}
        title="Edit this transaction"
        className="mm-focus group -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-(--mm-soft)"
      >
        <span className="mm-in" style={{ background: view.tint.soft, color: view.tint.ink }}>
          <LineIcon name={view.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-(--mm-ink)">{entry.item || title}</span>
          <span className="mm-lbl block truncate font-medium">
            {shortDate(entry.date)}{showTitle ? ` · ${title}` : ''}
          </span>
        </span>
        <b className="shrink-0 text-[14px] tabular-nums text-(--mm-red-ink)">−{money(entry.amount)}</b>
        <LineIcon name="pencil" size={16} className="text-(--mm-ink-3) group-hover:text-(--mm-ink)" />
      </button>
    </li>
  );
}

/**
 * Transactions of one "Category breakdown" row, grouped by where the money went.
 * `slice` null = closed. `data` is the /api/dashboard/category payload (null while loading).
 */
export default function CategorySheet({ slice: openSlice, cycle, data, loading, error, onRetry, money, onClose, onEdit }) {
  // Keep the last category on screen while the sheet animates out.
  const [slice, setSlice] = useState(openSlice);
  if (openSlice && openSlice !== slice) setSlice(openSlice);
  const sliceKey = slice ? `${cycle?.key}:${slice.id}` : null;
  // Search text belongs to the category it was typed for.
  const [search, setSearch] = useState({ key: null, q: '' });
  const query = search.key === sliceKey ? search.q : '';

  const entries = data?.entries;
  const places = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? (entries || []).filter(e => `${e.title} ${e.item} ${e.merchant}`.toLowerCase().includes(q))
      : entries;
    return groupByPlace(list);
  }, [entries, query]);

  const tag = slice ? changeTag(slice) : null;
  const count = data?.count ?? 0;

  return (
    <Sheet
      open={!!openSlice}
      onClose={onClose}
      label={slice ? `${slice.name} transactions in ${cycle.label}` : undefined}
      variant="drawer"
      scroll={false}
      className="mm border-t border-(--mm-line) bg-(--mm-card) text-(--mm-ink) shadow-pop md:border-l md:border-t-0"
    >
      {slice && (
        <>
            <SheetDragArea as="header" className="border-b border-(--mm-line-2) px-5 pb-4 pt-1 md:pt-5">
              <div className="flex items-center gap-3">
                <span className="mm-in" style={{ background: slice.color.soft, color: slice.color.mark }}>
                  <LineIcon name={slice.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="mm-h2 truncate">{slice.name}</h2>
                  <div className="mm-lbl truncate">
                    {cycle.label}{data ? ` · ${count} ${count === 1 ? 'transaction' : 'transactions'}` : ''}
                  </div>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="mm-btn mm-btn-ghost w-11 px-0">
                  <LineIcon name="close" size={18} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[26px] font-extrabold leading-none tabular-nums text-(--mm-ink)">{money(data?.total ?? slice.total)}</span>
                  {tag && <span className="mm-tag" style={{ background: tag.tone.soft, color: tag.tone.ink }}>{tag.text}</span>}
                </div>
                <span className="mm-lbl">{Math.round(slice.share)}% of spend</span>
              </div>

              {count > 10 && (
                <label className="mt-3 flex items-center gap-2.5 rounded-xl border border-(--mm-line) px-3.5 focus-within:border-(--mm-brand-line)">
                  <span className="text-(--mm-ink-3)"><LineIcon name="search" size={18} /></span>
                  <span className="sr-only">Search these transactions</span>
                  <input
                    value={query}
                    onChange={(e) => setSearch({ key: sliceKey, q: e.target.value })}
                    placeholder={`Search ${count} transactions`}
                    className="min-h-10 min-w-0 flex-1 border-0 bg-transparent text-[14px] font-medium text-(--mm-ink) outline-none placeholder:text-(--mm-ink-3)"
                  />
                </label>
              )}
            </SheetDragArea>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              {!data ? (
                error && !loading ? (
                  <ErrorState title="Couldn't load these transactions" message={error} onRetry={onRetry} />
                ) : (
                  <div className="space-y-4" aria-busy="true" aria-label="Loading transactions">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-2/5" />
                          <Skeleton className="h-3 w-3/5" />
                        </div>
                        <Skeleton className="h-4 w-14" />
                      </div>
                    ))}
                  </div>
                )
              ) : places.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-(--mm-ink-2)">
                  {query ? `Nothing matches “${query}”.` : `No ${slice.name} spending in ${cycle.label}.`}
                </p>
              ) : (
                <div className="flex flex-col gap-5">
                  {places.map(place => (
                    <section key={place.slug}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <b className="truncate text-[15px] text-(--mm-ink)">{place.name}</b>
                          <span className="mm-lbl shrink-0">{place.count} {place.count === 1 ? 'time' : 'times'}</span>
                        </div>
                        <b className="shrink-0 text-[13px] tabular-nums text-(--mm-ink)">{money(place.total)}</b>
                      </div>
                      <ul>
                        {place.entries.map(e => <EntryButton key={e.id} entry={e} money={money} onEdit={onEdit} />)}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
        </>
      )}
    </Sheet>
  );
}
