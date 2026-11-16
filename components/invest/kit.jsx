'use client';

import Icon3D from '@/components/ui/Icon3D';
import LineIcon from '@/components/ui/LineIcon';
import { Skeleton } from '@/components/ui/States';

/**
 * Building blocks shared by the Investments pages (Savings, Stocks, SIP plans).
 * Everything uses the --mm-* tokens and the .mm-* classes from globals.css.
 */

/** "₹1,200.00" -> "₹1,200" for headline figures (whole amounts read cleaner; paise stay when non-zero). */
const tidy = (v) => (typeof v === 'string' ? v.replace(/\.00(?=\D|$)/g, '') : v);

/** Page wrapper: canvas background, centered column, room for the mobile dock. */
export function InvestPage({ children }) {
  return (
    <div data-ui="v2" className="mm relative flex flex-1 flex-col overflow-x-hidden bg-(--mm-canvas)">
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-5 pb-[110px] pt-4 md:gap-5 md:px-10 md:pb-12 md:pt-6">
        {children}
      </main>
    </div>
  );
}

/** Title row. `actions` render on the right (wrap below on phones). */
export function PageHead({ title, sub, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold leading-tight text-(--mm-ink) md:text-[28px]">{title}</h1>
        {sub && <p className="mm-lbl mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}

/** 3D icon on a soft raised tile. tone: indigo | orange | green | gold | red */
const TILE_TONE = {
  indigo: 'var(--mm-indigo-soft)',
  orange: 'var(--mm-orange-soft)',
  green: 'var(--mm-green-soft)',
  gold: 'var(--mm-gold-soft)',
  red: 'var(--mm-red-soft)',
};
export function Icon3DTile({ name, size = 48, tone = 'indigo', className = '' }) {
  return (
    <span
      className={`mm-lift inline-grid shrink-0 place-items-center rounded-2xl ${className}`}
      style={{ width: size, height: size, background: TILE_TONE[tone] || TILE_TONE.indigo }}
    >
      <Icon3D name={name} size={Math.round(size * 0.66)} />
    </span>
  );
}

/**
 * Indigo hero band: label, one big figure, optional delta line, a large 3D icon as
 * art, and up to three small tiles ({ label, value }). `loading` shows skeletons of
 * the same size so nothing moves when numbers arrive.
 */
export function HeroBand({ icon, label, value, delta, deltaTone = 'muted', tiles = [], loading = false, children }) {
  const deltaColor = deltaTone === 'good' ? 'text-(--mm-hero-good)' : deltaTone === 'bad' ? 'text-(--mm-hero-bad)' : 'text-(--mm-hero-muted)';
  return (
    <section className="relative overflow-hidden rounded-3xl bg-(--mm-hero) p-[22px] text-white md:p-7">
      {icon && (
        <div className="pointer-events-none absolute -right-4 -top-5 rotate-[-8deg] scale-[0.8] opacity-95 drop-shadow-[0_18px_28px_rgba(0,0,0,0.35)] md:right-6 md:top-3 md:scale-100" aria-hidden="true">
          <Icon3D name={icon} size={112} />
        </div>
      )}
      <div className="relative">
        <div className="text-[12px] font-semibold text-(--mm-hero-muted) md:text-[13px]">{label}</div>
        {loading ? (
          <span className="my-[7px] block h-[42px] w-48 animate-pulse rounded-xl bg-white/15" aria-hidden="true" />
        ) : (
          <div className="my-1 pr-20 text-[36px] font-extrabold leading-[1.15] tracking-[-0.02em] md:pr-28 md:text-[44px]">{tidy(value)}</div>
        )}
        <div className={`h-[18px] text-[12px] font-bold leading-[18px] ${deltaColor}`}>
          {loading ? <span className="mt-[3px] block h-3 w-32 animate-pulse rounded bg-white/15" aria-hidden="true" /> : delta}
        </div>
        {tiles.length > 0 && (
          <div className={`mt-4 grid grid-cols-2 gap-2.5 ${tiles.length === 3 ? 'md:grid-cols-3' : tiles.length >= 4 ? 'md:grid-cols-4' : ''}`}>
            {tiles.map((t, i) => (
              // Two per row on phones so full amounts fit; an odd last tile spans the row.
              <div key={t.label} className={`min-w-0 rounded-[14px] bg-(--mm-hero-tile) p-3 ${tiles.length % 2 === 1 && i === tiles.length - 1 ? 'col-span-2 md:col-span-1' : ''}`}>
                <div className="truncate text-[11px] font-semibold text-(--mm-hero-muted)">{t.label}</div>
                {loading
                  ? <span className="mt-1 block h-5 w-16 animate-pulse rounded bg-white/15" aria-hidden="true" />
                  : <div className="truncate text-[16px] font-extrabold md:text-[18px]">{tidy(t.value)}</div>}
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** KPI tile: 3D icon, label, value, optional signed delta. `good` colours the delta. */
export function StatTile({ icon, tone = 'indigo', label, value, delta, good, loading = false }) {
  return (
    <div className="mm-card mm-lift flex min-h-[132px] flex-col gap-2.5 p-3.5 md:min-h-[84px] md:flex-row md:items-center md:gap-3 md:p-4">
      <Icon3DTile name={icon} tone={tone} size={42} />
      <div className="min-w-0 flex-1">
        <div className="mm-lbl truncate">{label}</div>
        {loading
          ? <Skeleton className="mt-1.5 h-5 w-24" />
          : <div className="truncate text-[18px] font-extrabold leading-tight text-(--mm-ink) md:text-[19px]">{tidy(value)}</div>}
        {!loading && delta && (
          <div className="line-clamp-2 text-[12px] font-bold leading-snug" style={{ color: good === undefined ? 'var(--mm-ink-3)' : good ? 'var(--mm-good)' : 'var(--mm-bad)' }}>
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}

/** Titled card. `action` sits top-right. */
export function Card({ title, sub, action, className = '', children }) {
  return (
    <section className={`mm-card p-[18px] md:p-[22px] ${className}`}>
      {(title || action) && (
        <div className="mb-3.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-2.5">
          <div className="min-w-[60%] flex-1">
            {title && <h2 className="mm-h2">{title}</h2>}
            {sub && <div className="mm-lbl mt-0.5">{sub}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Empty state with a 3D icon. */
export function Empty({ icon = 'search', title, message, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <Icon3D name={icon} size={72} />
      <p className="mt-3 text-[15px] font-extrabold text-(--mm-ink)">{title}</p>
      {message && <p className="mt-1 max-w-xs text-[13px] text-(--mm-ink-2)">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Inline error with retry. */
export function ErrorNote({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-center gap-2.5 rounded-xl bg-(--mm-red-soft) p-3 text-[13px] font-semibold text-(--mm-red-ink)">
      <LineIcon name="alert" size={18} />
      <span className="flex-1">{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="mm-btn mm-btn-ghost min-h-9 px-3 text-[13px]">Retry</button>}
    </div>
  );
}

/** Small coloured pill. tone: good | bad | warn | brand | mute */
const PILL = {
  good: ['var(--mm-green-soft)', 'var(--mm-green-ink)'],
  bad: ['var(--mm-red-soft)', 'var(--mm-red-ink)'],
  warn: ['var(--mm-gold-soft)', 'var(--mm-gold-ink)'],
  brand: ['var(--mm-indigo-soft)', 'var(--mm-brand-ink)'],
  mute: ['var(--mm-line-2)', 'var(--mm-ink-2)'],
};
export function Pill({ tone = 'mute', children }) {
  const [bg, fg] = PILL[tone] || PILL.mute;
  return <span className="mm-tag inline-flex items-center gap-1" style={{ background: bg, color: fg }}>{children}</span>;
}

/** Sheet title row with a close button (use inside components/ui/Sheet). */
export function SheetHead({ icon, tone, title, sub, onClose }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      {icon && <Icon3DTile name={icon} tone={tone} size={44} />}
      <div className="min-w-0 flex-1">
        <h2 className="mm-h2 truncate">{title}</h2>
        {sub && <div className="mm-lbl truncate">{sub}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="mm-btn mm-btn-ghost w-11 px-0">
          <LineIcon name="close" size={18} />
        </button>
      )}
    </div>
  );
}

/** Labelled form field wrapper: <Field label="Amount" htmlFor="x" error="…"><input className="mm-field" …/></Field> */
export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mm-field-label">{label}</label>
      {children}
      {error
        ? <p role="alert" className="mt-1.5 text-[12px] font-semibold text-(--mm-red-ink)">{error}</p>
        : hint && <p className="mm-lbl mt-1.5 font-medium">{hint}</p>}
    </div>
  );
}

/** Card-shaped loading placeholder. */
export function CardSkeleton({ rows = 3, height }) {
  return (
    <div className="mm-card p-[22px]" style={height ? { minHeight: height } : undefined} aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-44" />
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
    </div>
  );
}

/** Classes for the sheet surface, so every Investments sheet looks the same. */
export const SHEET_CLASS = 'mm border border-(--mm-line) bg-(--mm-card) text-(--mm-ink) shadow-pop';
export const SHEET_BODY = 'px-5 pt-1 md:pt-6 space-y-4';
