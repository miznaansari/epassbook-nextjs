'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Pencil, Search, X } from 'lucide-react';
import { BrandAvatar, ItemIcon } from './SpendIcons';
import { shortDate } from './format';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

const KIND_LABEL = { brand: 'Online brand', local: 'Local shop', group: 'Group' };

function MiniBar({ cycle, value, max, money }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="grid grid-cols-[3rem_1fr] items-center gap-2" title={`${cycle.label}: ${money(value)}`}>
      <span className="text-[10px] leading-none text-ink-3 tabular-nums truncate">{cycle.label}</span>
      <div className="flex items-center gap-1.5 min-w-0 h-2.5">
        <span
          className="h-1.5 shrink-0"
          style={{
            width: value > 0 ? `max(2px, calc((100% - 4rem) * ${pct / 100}))` : '0px',
            background: cycle.color,
            borderRadius: '0 3px 3px 0',
            transition: 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <span className="text-[10px] leading-none tabular-nums text-ink-2 whitespace-nowrap">
          {value > 0 ? money(value) : '—'}
        </span>
      </div>
    </div>
  );
}

function ItemRow({ item, cycles, max, money, onEditEntry }) {
  const [open, setOpen] = useState(false);
  const primary = cycles[0];
  const totalCount = Object.values(item.counts).reduce((s, n) => s + n, 0);
  const lastDate = item.entries.reduce((d, e) => (new Date(e.date) > d ? new Date(e.date) : d), new Date(0));
  const colorOf = Object.fromEntries(cycles.map(c => [c.key, c.color]));

  return (
    <li className="border-b border-line last:border-b-0 md:rounded-2xl md:border md:border-line md:last:border-b md:bg-card-2/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full text-left flex gap-3 py-2.5 md:p-3 cursor-pointer md:rounded-2xl hover:bg-card-2 transition-colors"
      >
        <ItemIcon imageUrl={item.imageUrl} emoji={item.emoji} size={42} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{item.name}</p>
              <p className="text-[11px] text-ink-2">
                ×{totalCount} · last {shortDate(lastDate)}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-ink">{money(item.totals[primary.key] || 0)}</span>
            <ChevronDown className={`w-4 h-4 mt-0.5 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </div>
          {cycles.length > 1 && (
            <div className="mt-2 space-y-1">
              {cycles.map(c => <MiniBar key={c.key} cycle={c} value={item.totals[c.key] || 0} max={max} money={money} />)}
            </div>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-3"
          >
            {[...item.entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
              <li key={e.id} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  onClick={() => onEditEntry(e)}
                  className="group w-full flex items-center gap-2 py-2 text-left cursor-pointer"
                  title="Edit this transaction"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colorOf[e.cycleKey] }} aria-hidden="true" />
                  <span className="text-[11px] text-ink-2 w-12 shrink-0 tabular-nums">{shortDate(e.date)}</span>
                  <span className="flex-1 min-w-0 truncate text-xs text-ink">{e.title}</span>
                  <span className="text-xs font-medium tabular-nums text-ink">{money(e.amount)}</span>
                  <Pencil className="w-3 h-3 text-ink-3 group-hover:text-ink" aria-hidden="true" />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Items bought from one merchant, compared across the selected cycles. */
export default function MerchantDetail({ merchant, cycles, money, onClose, onEditEntry }) {
  const isDesktop = useIsDesktop();
  // Search text belongs to the merchant it was typed for, so it resets per merchant.
  const [search, setSearch] = useState({ slug: null, q: '' });
  const query = search.slug === merchant?.slug ? search.q : '';
  const setQuery = (q) => setSearch({ slug: merchant?.slug ?? null, q });

  useEffect(() => {
    if (!merchant) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [merchant, onClose]);

  const items = useMemo(() => {
    if (!merchant) return [];
    const q = query.trim().toLowerCase();
    return q ? merchant.items.filter(i => i.name.toLowerCase().includes(q)) : merchant.items;
  }, [merchant, query]);

  const max = merchant ? Math.max(0, ...merchant.items.flatMap(i => cycles.map(c => i.totals[c.key] || 0))) : 0;

  return (
    <AnimatePresence>
      {merchant && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-pointer"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${merchant.name} items`}
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col w-full md:w-[460px] max-h-[88vh] md:max-h-none md:h-full bg-card border-t md:border-t-0 md:border-l border-line rounded-t-3xl md:rounded-none shadow-2xl"
          >
            <div className="md:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />

            <header className="p-4 sm:p-5 border-b border-line">
              <div className="flex items-center gap-3">
                <BrandAvatar merchant={merchant} size={48} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-ink truncate">{merchant.name}</h2>
                  <p className="text-xs text-ink-2">
                    {KIND_LABEL[merchant.kind] || 'Merchant'} · {merchant.items.length} {merchant.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-lg text-ink-2 hover:text-ink hover:bg-card-2 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cycles.length, 4)}, minmax(0, 1fr))` }}>
                {cycles.map(c => (
                  <div key={c.key} className="rounded-xl border border-line px-2.5 py-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-ink-2">
                      <span className="w-2 h-2 rounded-[2px]" style={{ background: c.color }} aria-hidden="true" />
                      {c.label}
                    </span>
                    <span className="block mt-0.5 text-sm font-semibold tabular-nums text-ink">{money(merchant.totals[c.key] || 0)}</span>
                    <span className="block text-[10px] text-ink-3">{merchant.counts[c.key] || 0} purchases</span>
                  </div>
                ))}
              </div>

              {merchant.items.length > 10 && (
                <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-card-2 px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${merchant.items.length} items`}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
                  />
                </label>
              )}
            </header>

            <ul
              className="flex-1 overflow-y-auto px-4 py-1 md:p-5 md:space-y-2"
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            >
              {items.map(item => (
                <ItemRow key={item.id} item={item} cycles={cycles} max={max} money={money} onEditEntry={onEditEntry} />
              ))}
              {items.length === 0 && (
                <li className="py-10 text-center text-sm text-ink-2">No items match “{query}”.</li>
              )}
            </ul>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
