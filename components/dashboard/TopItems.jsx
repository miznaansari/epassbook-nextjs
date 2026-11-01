'use client';

import { useMemo } from 'react';
import { ItemIcon } from './SpendIcons';
import { SectionHeader } from '@/components/ui/Surface';

/** Top items of the primary cycle across all merchants (client-side, no API). */
export function topItemsOf(merchants, cycleKey, limit = 6) {
  if (!merchants?.length || !cycleKey) return [];
  return merchants
    .filter(m => m.slug !== 'family') // money given to people isn't a purchase
    .flatMap(m => m.items.map(i => ({ ...i, merchant: m.name, value: i.totals[cycleKey] || 0, count: i.counts[cycleKey] || 0 })))
    .filter(i => i.value > 0 && i.itemKey !== 'fee')
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export default function TopItems({ merchants, cycleKey, cycleLabel, money }) {
  const items = useMemo(() => topItemsOf(merchants, cycleKey), [merchants, cycleKey]);
  if (!items.length) return null;

  return (
    <div>
      <SectionHeader title="Top items" subtitle={cycleLabel ? `What you bought most in ${cycleLabel}` : undefined} />
      {/* Mobile: one swipeable row. Desktop: 3-column grid. */}
      <ul className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map(i => (
          <li key={`${i.merchant}-${i.id}`} className="w-[118px] shrink-0 md:w-auto">
            <div className="flex h-full flex-col items-center rounded-2xl bg-card-2 p-3 text-center">
              <ItemIcon imageUrl={i.imageUrl} emoji={i.emoji} size={46} className="bg-card shadow-card" />
              <p className="mt-2 w-full truncate text-xs font-semibold text-ink" title={i.name}>{i.name}</p>
              <p className="text-sm font-bold tabular-nums text-ink">{money(i.value)}</p>
              <p className="w-full truncate text-[10px] text-ink-3">{i.merchant}{i.count > 1 ? ` · ×${i.count}` : ''}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
