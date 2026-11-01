'use client';

import { Check } from 'lucide-react';
import { shortDate } from './format';

export const MAX_COMPARE = 4;

/**
 * Multi-select of salary cycles to compare. `options` newest first:
 * [{ key, label, startDate, endDate, isCurrent }]. `selected`: [{ key, slot }]
 * where `slot` indexes `colors` — a cycle keeps its colour while selected.
 */
export default function CyclePicker({ options, selected, colors, onToggle }) {
  const slotOf = new Map(selected.map(s => [s.key, s.slot]));
  const full = selected.length >= MAX_COMPARE;

  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0" role="group" aria-label="Cycles to compare">
      {options.map(opt => {
        const slot = slotOf.get(opt.key);
        const isOn = slot !== undefined;
        const isLast = isOn && selected.length === 1;
        const disabled = (!isOn && full) || isLast;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={isOn}
            disabled={disabled}
            onClick={() => onToggle(opt.key)}
            title={`${shortDate(opt.startDate)} – ${shortDate(opt.endDate)}${!isOn && full ? ` · up to ${MAX_COMPARE} cycles` : ''}`}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
              isOn
                ? 'border-transparent bg-card text-ink shadow-card ring-1 ring-line-strong'
                : 'border-line bg-transparent text-ink-2 hover:border-line-strong hover:text-ink disabled:opacity-40 disabled:hover:text-ink-2'
            }`}
          >
            {isOn ? (
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colors[slot] }} aria-hidden="true" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-[3px] border border-line-strong" aria-hidden="true" />
            )}
            <span>{opt.label}</span>
            {opt.isCurrent && (
              <span className="rounded-full bg-secondary-soft px-1.5 text-[9px] font-bold uppercase tracking-wide text-secondary-ink">Now</span>
            )}
            {isOn && <Check className="h-3 w-3 text-ink-3" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
