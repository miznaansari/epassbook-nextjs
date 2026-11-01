'use client';

import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronRight, Table2 } from 'lucide-react';
import { BrandAvatar } from './SpendIcons';
import { pctChange } from './format';
import { SectionHeader } from '@/components/ui/Surface';

const TOP_N = 8;
const LABEL_ROOM = '4.5rem'; // space kept after the longest bar for its value label

function Delta({ current, previous }) {
  const pct = pctChange(current, previous);
  if (pct === null) {
    return current > 0 && previous === 0
      ? <span className="rounded-full bg-secondary-soft px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-secondary-ink">New</span>
      : null;
  }
  if (Math.abs(pct) < 0.5) return <span className="text-[11px] text-ink-3">±0%</span>;
  const up = pct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${up ? 'text-danger-ink' : 'text-success-ink'}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.round(Math.abs(pct))}%
      <span className="sr-only">{up ? 'more' : 'less'} than previous cycle</span>
    </span>
  );
}

/** One horizontal bar: square at the baseline, rounded data-end, value at the tip. */
function Bar({ cycle, value, count, max, money, hovered, onHover }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const width = value > 0 ? `max(3px, calc((100% - ${LABEL_ROOM}) * ${pct / 100}))` : '0px';
  const share = cycle.total > 0 ? Math.round((value / cycle.total) * 100) : 0;

  return (
    <div
      className="grid grid-cols-[2.75rem_1fr] md:grid-cols-[3.25rem_1fr] items-center gap-2 py-[2px] md:py-[3px]"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <span className="truncate text-[10px] md:text-[11px] leading-none tabular-nums text-ink-3">{cycle.label}</span>
      <div className="relative flex h-3 min-w-0 items-center gap-1.5">
        <span
          className="h-2 md:h-2.5 shrink-0"
          style={{ width, background: cycle.color, borderRadius: '0 999px 999px 0', transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <span className="whitespace-nowrap text-[10px] md:text-[11px] font-semibold leading-none tabular-nums text-ink-2">
          {value > 0 ? money(value) : <span className="text-ink-3">—</span>}
        </span>
        {hovered && value > 0 && (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full z-20 mb-1.5 whitespace-nowrap rounded-xl border border-line bg-card px-2.5 py-1.5 text-[11px] shadow-pop"
            style={{ left: `min(calc((100% - ${LABEL_ROOM}) * ${pct / 100}), calc(100% - 9rem))` }}
          >
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: cycle.color }} aria-hidden="true" />
              {cycle.label} · {money(value)}
            </span>
            <span className="mt-0.5 block text-ink-2">
              {count} {count === 1 ? 'purchase' : 'purchases'} · {share}% of cycle
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function TableView({ merchants, cycles, money }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[420px] text-xs">
        <thead>
          <tr className="border-b border-line text-left text-ink-2">
            <th className="px-1 py-2 font-medium">Merchant</th>
            {cycles.map(c => <th key={c.key} className="whitespace-nowrap px-1 py-2 text-right font-medium">{c.label}</th>)}
            {cycles.length > 1 && <th className="px-1 py-2 text-right font-medium">Change</th>}
          </tr>
        </thead>
        <tbody>
          {merchants.map(m => (
            <tr key={m.slug} className="border-b border-line last:border-0">
              <td className="px-1 py-2 font-medium text-ink">{m.name}</td>
              {cycles.map(c => (
                <td key={c.key} className="px-1 py-2 text-right tabular-nums text-ink">
                  {m.totals[c.key] ? money(m.totals[c.key]) : '—'}
                </td>
              ))}
              {cycles.length > 1 && (
                <td className="px-1 py-2 text-right">
                  <Delta current={m.totals[cycles[0].key] || 0} previous={m.totals[cycles[1].key] || 0} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * @param merchants API merchants (sorted by newest selected cycle)
 * @param cycles    selected cycles, newest first, each with { key, label, total, color }
 */
export default function MerchantCompareChart({ merchants, cycles, money, onSelect, dimmed = false }) {
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState('chart');
  const [hovered, setHovered] = useState(null);

  const visible = showAll ? merchants : merchants.slice(0, TOP_N);
  const max = Math.max(0, ...merchants.flatMap(m => cycles.map(c => m.totals[c.key] || 0)));
  const primary = cycles[0];
  const previous = cycles[1];

  return (
    <div className={`transition-opacity duration-300 ${dimmed ? 'opacity-55' : ''}`} aria-busy={dimmed}>
      <SectionHeader
        title="Where your money went"
        subtitle={<span className="hidden md:inline">Grouped by merchant with AI · tap for items</span>}
        action={(
          <div className="inline-flex rounded-xl bg-card-2 p-0.5" role="group" aria-label="View">
            {[['chart', BarChart3, 'Chart'], ['table', Table2, 'Table']].map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  view === id ? 'bg-card text-ink shadow-card' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}
      />

      {/* Legend: cycle identity + totals (text in ink, colour on the swatch) */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {cycles.map(c => (
          <span key={c.key} className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} aria-hidden="true" />
            <span className="text-ink-2">{c.label}</span>
            <span className="font-bold tabular-nums text-ink">{money(c.total)}</span>
          </span>
        ))}
      </div>

      {view === 'table' ? (
        <div className="mt-3"><TableView merchants={merchants} cycles={cycles} money={money} /></div>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {visible.map(m => (
            <li key={m.slug}>
              <button
                type="button"
                onClick={() => onSelect(m)}
                className="group -mx-2 flex w-[calc(100%+1rem)] gap-3 rounded-xl px-2 py-2.5 md:py-3 text-left hover:bg-card-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={`${m.name}: ${cycles.map(c => `${c.label} ${money(m.totals[c.key] || 0)}`).join(', ')}. Show items.`}
              >
                <BrandAvatar merchant={m} size={38} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{m.name}</span>
                    {previous && <Delta current={m.totals[primary.key] || 0} previous={m.totals[previous.key] || 0} />}
                    <span className="ml-auto text-sm font-bold tabular-nums text-ink">
                      {money(m.totals[primary.key] || 0)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 group-hover:text-ink-2" aria-hidden="true" />
                  </div>
                  <div className="mt-1">
                    {cycles.map(c => (
                      <Bar
                        key={c.key}
                        cycle={c}
                        value={m.totals[c.key] || 0}
                        count={m.counts[c.key] || 0}
                        max={max}
                        money={money}
                        hovered={hovered === `${m.slug}|${c.key}`}
                        onHover={(on) => setHovered(on ? `${m.slug}|${c.key}` : null)}
                      />
                    ))}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {view === 'chart' && merchants.length > TOP_N && (
        <button
          type="button"
          onClick={() => setShowAll(s => !s)}
          className="mt-2 w-full rounded-xl border border-dashed border-line-strong py-2 text-xs font-semibold text-ink-2 hover:text-ink cursor-pointer"
        >
          {showAll ? 'Show top 8' : `Show all ${merchants.length} merchants`}
        </button>
      )}
    </div>
  );
}
