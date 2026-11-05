'use client';

/**
 * Indigo cycle summary. Desktop: 3-column band (amount | Balance | Salary left).
 * Mobile: stacked card with the two tiles side by side.
 */

function salaryUsedPct(kpis) {
  const total = Number(kpis?.salaryTotal) || 0;
  if (total <= 0) return null;
  const left = Math.max(0, Number(kpis?.salaryBalance) || 0);
  return Math.min(100, Math.max(0, ((total - left) / total) * 100));
}

function Delta({ pace }) {
  if (!pace || pace.pct === null) return null;
  const n = Math.round(Math.abs(pace.pct));
  if (n === 0) return <div className="text-[12px] font-bold text-(--mm-hero-muted)">Same pace as last cycle</div>;
  const down = pace.pct < 0;
  return (
    <div className={`text-[12px] font-bold ${down ? 'text-(--mm-hero-good)' : 'text-(--mm-hero-bad)'}`}>
      {down ? '↓' : '↑'} {n}% vs last cycle
    </div>
  );
}

function Amount({ value, ready, className, skeleton }) {
  if (!ready) return <span className={`block animate-pulse rounded-xl bg-white/15 ${skeleton}`} aria-hidden="true" />;
  return <div className={`font-extrabold tabular-nums tracking-[-0.02em] ${className}`}>{value}</div>;
}

function UsedBar({ used, thick }) {
  const h = thick ? 'h-2.5' : 'h-2';
  return (
    <div
      className={`${h} rounded-full bg-(--mm-hero-track)`}
      role="progressbar"
      aria-label="Salary used"
      aria-valuenow={Math.round(used)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`${h} rounded-full bg-(--mm-hero-bar) transition-[width] duration-700`} style={{ width: `${used}%` }} />
    </div>
  );
}

export default function Hero({ kpis, spent, pace, cycleLabel, dateRange, money, loading }) {
  const used = salaryUsedPct(kpis);
  const ready = !loading;
  const tiles = [
    { label: 'Balance', short: 'Balance', value: kpis?.currentBalance },
    { label: 'Salary left', short: 'Left', value: kpis?.salaryBalance },
  ];

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <section className="hidden md:grid grid-cols-[1.4fr_1fr_1fr] items-center gap-5 rounded-3xl bg-(--mm-hero) p-7 text-white">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-(--mm-hero-muted)">Spent this cycle · {cycleLabel}</div>
          <Amount value={money(spent)} ready={ready} className="my-1 text-[48px] leading-[1.15]" skeleton="my-2 h-12 w-56" />
          <Delta pace={pace} />
          {used !== null && (
            <>
              <div className="mt-[18px] flex justify-between text-[12px] font-semibold text-(--mm-hero-muted)">
                <span>Salary used</span>
                <span>{Math.round(used)}%</span>
              </div>
              <div className="mt-1.5"><UsedBar used={used} thick /></div>
            </>
          )}
        </div>
        {tiles.map(t => (
          <div key={t.label} className="rounded-2xl bg-(--mm-hero-tile) p-4">
            <div className="text-[12px] font-semibold text-(--mm-hero-muted)">{t.label}</div>
            <Amount value={money(t.value)} ready={ready} className="mt-1 text-[24px] leading-tight" skeleton="mt-2 h-7 w-28" />
          </div>
        ))}
      </section>

      {/* ---------- Mobile ---------- */}
      <section className="md:hidden rounded-3xl bg-(--mm-hero) p-[22px] text-white">
        <div className="text-[12px] font-semibold text-(--mm-hero-muted)">
          {cycleLabel}{dateRange ? ` · ${dateRange}` : ''}
        </div>
        <Amount value={money(spent)} ready={ready} className="my-1 text-[40px] leading-[1.15]" skeleton="my-2 h-10 w-48" />
        <Delta pace={pace} />
        {used !== null && (
          <>
            <div className="mt-3.5 flex justify-between text-[11px] font-semibold text-(--mm-hero-muted)">
              <span>Salary used</span>
              <span>{Math.round(used)}%</span>
            </div>
            <div className="mb-3.5 mt-1.5"><UsedBar used={used} /></div>
          </>
        )}
        <div className={`flex gap-2.5 ${used === null ? 'mt-3.5' : ''}`}>
          {tiles.map(t => (
            <div key={t.label} className="min-w-0 flex-1 rounded-[14px] bg-(--mm-hero-tile) p-3">
              <div className="text-[11px] font-semibold text-(--mm-hero-muted)">{t.short}</div>
              <Amount value={money(t.value)} ready={ready} className="truncate text-[17px]" skeleton="mt-1 h-5 w-20" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
