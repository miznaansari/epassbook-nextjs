'use client';

import { cycleColor } from './model';

/**
 * "Compare cycles" chips, newest first. The highlighted chip is the cycle the
 * charts focus on; each dot matches that cycle's bar in "Cycle by cycle".
 */
export default function CycleChips({ cycles, focusKey, onSelect }) {
  return (
    <div className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="mm-lbl mr-1.5 hidden md:inline">Compare cycles</span>
      {cycles.map((c, i) => {
        const on = c.key === focusKey;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c.key)}
            aria-pressed={on}
            title={c.isCurrent ? `${c.label} (current cycle)` : c.label}
            className={`mm-chip ${on ? 'is-on' : ''}`}
          >
            <i style={{ background: cycleColor(i) }} aria-hidden="true" />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
