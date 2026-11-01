'use client';

import { ArrowDownRight, ArrowUpRight, Plus, PlusCircle } from 'lucide-react';
import Icon3D from '@/components/ui/Icon3D';
import { Skeleton } from '@/components/ui/States';

function DeltaChip({ pct, onBrand = false }) {
  if (typeof pct !== 'number' || !Number.isFinite(pct) || Math.abs(pct) < 0.5) return null;
  const up = pct > 0; // more spending = worse
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const tone = onBrand
    ? up ? 'bg-white/15 text-rose-100' : 'bg-white/15 text-emerald-100'
    : up ? 'bg-danger-soft text-danger-ink' : 'bg-success-soft text-success-ink';
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.round(Math.abs(pct))}% vs last
    </span>
  );
}

function salaryUsage(kpis) {
  const total = Number(kpis?.salaryTotal) || 0;
  if (total <= 0) return null;
  const left = Math.max(0, Number(kpis?.salaryBalance) || 0);
  return Math.min(100, Math.max(0, ((total - left) / total) * 100));
}

/**
 * Cycle summary. Desktop: gradient hero card. Mobile: flat 2-line summary
 * (no card) so the merchant list starts within the first screen.
 * `sync` is a render function: sync(onBrand:boolean) -> status pill.
 */
export default function DashboardHero({ kpis, trends, cycleLabel, dateRange, sync, money, loading, onIncome, onNewEntry }) {
  const spent = kpis?.spending;
  const usage = salaryUsage(kpis);
  const ready = !loading || kpis;

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <section className="hidden md:block relative overflow-hidden rounded-[28px] bg-hero p-6 lg:p-7 text-white shadow-pop">
        {/* Decorative 3D art: top-right on md, between the amount and the tiles on lg */}
        <div className="pointer-events-none absolute right-6 top-5 lg:right-[23rem] lg:top-8 rotate-[-10deg] drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)]" aria-hidden="true">
          <Icon3D name="spent" size={132} />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
              <span className="font-semibold text-white">{cycleLabel} cycle</span>
              {dateRange && <span>· {dateRange}</span>}
              {sync?.(true)}
            </div>

            <p className="mt-4 text-sm text-white/80">Spent so far</p>
            {ready ? (
              <p className="font-display text-5xl font-extrabold tracking-tight leading-none mt-1 tabular-nums">{money(spent)}</p>
            ) : (
              <span className="mt-2 block h-12 w-56 rounded-xl bg-white/15 animate-pulse" />
            )}
            <div className="mt-3"><DeltaChip pct={trends?.spendingDeltaPct} onBrand /></div>

            {usage !== null && (
              <div className="mt-5 max-w-md">
                <div className="flex justify-between text-[11px] text-white/80">
                  <span>Salary used</span>
                  <span className="font-semibold text-white">{Math.round(usage)}%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/15 overflow-hidden" role="progressbar" aria-valuenow={Math.round(usage)} aria-valuemin={0} aria-valuemax={100} aria-label="Salary used">
                  <div className="h-full rounded-full bg-secondary transition-[width] duration-700" style={{ width: `${usage}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end gap-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: 'balance', label: 'Balance', value: kpis?.currentBalance },
                { icon: 'salary-left', label: 'Salary left', value: kpis?.salaryBalance },
              ].map(t => (
                <div key={t.label} className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <Icon3D name={t.icon} size={30} />
                  <p className="mt-2 text-[11px] text-white/75">{t.label}</p>
                  {ready ? (
                    <p className="font-display text-lg font-bold tabular-nums">{money(t.value)}</p>
                  ) : (
                    <span className="mt-1 block h-5 w-20 rounded bg-white/15 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onIncome}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 text-sm font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Income
              </button>
              <button
                type="button"
                onClick={onNewEntry}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-semibold text-secondary-fg shadow-glow-secondary hover:bg-secondary-hover transition cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" /> New entry
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Mobile (flat, no card) ---------- */}
      <section className="md:hidden">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-2">
          <span className="truncate"><span className="font-semibold text-ink">{cycleLabel}</span>{dateRange ? ` · ${dateRange}` : ''}</span>
          {sync?.(false)}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {ready ? (
              <p className="font-display text-[34px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{money(spent)}</p>
            ) : (
              <Skeleton className="h-9 w-44" />
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
              spent this cycle <DeltaChip pct={trends?.spendingDeltaPct} />
            </div>
          </div>
          <Icon3D name="spent" size={56} className="drop-shadow-[0_10px_16px_rgba(79,70,229,0.25)]" />
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <Icon3D name="balance" size={18} /> Balance <b className="font-semibold text-ink tabular-nums">{ready ? money(kpis?.currentBalance) : '—'}</b>
          </span>
          <span className="h-3 w-px bg-line" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <Icon3D name="salary-left" size={18} /> Left <b className="font-semibold text-ink tabular-nums">{ready ? money(kpis?.salaryBalance) : '—'}</b>
          </span>
        </div>
        {usage !== null && (
          <div className="mt-2 h-1.5 rounded-full bg-card-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(usage)} aria-valuemin={0} aria-valuemax={100} aria-label="Salary used">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${usage}%` }} />
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onNewEntry}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-semibold text-secondary-fg shadow-glow-secondary active:scale-[0.98] transition cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" /> New entry
          </button>
          <button
            type="button"
            onClick={onIncome}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-4 text-sm font-semibold text-ink active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Income
          </button>
        </div>
      </section>
    </>
  );
}
