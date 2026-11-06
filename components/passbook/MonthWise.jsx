'use client';

import { cycleColor, monthOf } from '@/components/dashboard/overview/model';
import { Skeleton } from '@/components/ui/States';

/** "Nov is ₹4,401 lower than Oct so far." */
export function paceNote(pace, money, currentLabel) {
  if (!pace || pace.pct === null) return null;
  const month = monthOf(currentLabel);
  if (Math.round(Math.abs(pace.pct)) === 0) return `${month} is on par with ${pace.prevMonth} so far.`;
  return `${month} is ${money(Math.abs(pace.diff))} ${pace.diff < 0 ? 'lower' : 'higher'} than ${pace.prevMonth} so far.`;
}

function CycleRow({ cycle, index, max, money, first }) {
  const width = max > 0 ? Math.max(cycle.total > 0 ? 2 : 0, (cycle.total / max) * 100) : 0;
  return (
    <div className={`py-3 ${first ? '' : 'mm-divide'}`}>
      <div className="flex justify-between gap-3 text-[14px] font-bold text-(--mm-ink)">
        <span className="flex items-center gap-2">
          <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: cycleColor(index) }} aria-hidden="true" />
          {cycle.label}
          {cycle.isCurrent && <span className="mm-tag bg-(--mm-indigo-soft) text-(--mm-brand-ink)">Current</span>}
        </span>
        <span className="tabular-nums">{money(cycle.total)}</span>
      </div>
      <div
        className="mt-2 h-2 rounded-full bg-(--mm-line-2)"
        role="progressbar"
        aria-label={`${cycle.label} spending`}
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${width}%`, background: cycleColor(index) }} />
      </div>
    </div>
  );
}

function Rows({ cycles, money, firstDivider }) {
  if (!cycles) {
    return (
      <div className="space-y-4 py-3" aria-busy="true">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }
  const max = Math.max(0, ...cycles.map(c => c.total));
  return cycles.map((c, i) => (
    <CycleRow key={c.key} cycle={c} index={i} max={max} money={money} first={i === 0 && !firstDivider} />
  ));
}

/** Spending per salary cycle (newest first). `cycles` is null while loading. */
export default function MonthWise({ cycles, note, money }) {
  return (
    <>
      {/* Desktop / tablet card */}
      <div className="mm-card hidden p-[22px] md:block">
        <h2 className="mm-h2">Month wise</h2>
        <div className="mm-lbl mb-2 mt-0.5">Total spending per cycle</div>
        <Rows cycles={cycles} money={money} firstDivider />
        {note && (
          <div className="mt-3 rounded-xl bg-(--mm-indigo-soft) p-3 text-[13px] font-bold text-(--mm-brand-ink)">{note}</div>
        )}
      </div>

      {/* Mobile section */}
      <section className="md:hidden">
        <div className="mx-0.5 mb-2.5 mt-1.5 flex items-baseline justify-between">
          <b className="text-[15px] text-(--mm-ink)">Month wise</b>
          <span className="mm-lbl">Spending</span>
        </div>
        <div className="mm-card px-4 pb-2 pt-1">
          <Rows cycles={cycles} money={money} />
        </div>
      </section>
    </>
  );
}
