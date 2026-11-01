'use client';

import { BrandAvatar, ItemIcon } from './SpendIcons';
import { shortDate } from './format';
import { SectionHeader } from '@/components/ui/Surface';

function avatarOf(r) {
  return { name: r.merchant, logoUrl: r.logoUrl, emoji: r.merchantEmoji, color: r.color, kind: r.merchantEmoji ? 'group' : 'brand' };
}

/**
 * Latest spends of the primary cycle. Mobile: a swipeable strip of compact
 * chips (saves vertical space). Desktop: a list.
 */
export default function RecentList({ recent, cycleLabel, money, onEdit }) {
  if (!recent.length) {
    return (
      <div>
        <SectionHeader title="Latest spends" />
        <p className="py-6 text-center text-sm text-ink-2">Nothing spent in this cycle yet.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Latest spends" subtitle={cycleLabel ? `${cycleLabel} cycle · tap to edit` : undefined} />

      {/* Mobile strip */}
      <ul className="md:hidden mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        {recent.map(r => (
          <li key={r.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onEdit(r)}
              className="flex w-[150px] items-center gap-2 rounded-2xl bg-card-2 p-2 text-left active:scale-[0.98] transition cursor-pointer"
            >
              <ItemIcon imageUrl={r.imageUrl} emoji={r.emoji} size={36} className="bg-card" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-ink">{r.item}</span>
                <span className="block text-xs font-bold tabular-nums text-ink">{money(r.amount)}</span>
                <span className="block truncate text-[10px] text-ink-3">{shortDate(r.date)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop list */}
      <ul className="hidden md:block mt-2 -mx-2">
        {recent.map(r => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onEdit(r)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-card-2 transition-colors cursor-pointer"
              title="Edit this transaction"
            >
              <span className="relative shrink-0">
                <ItemIcon imageUrl={r.imageUrl} emoji={r.emoji} size={40} />
                <BrandAvatar merchant={avatarOf(r)} size={18} className="absolute -bottom-1 -right-1 ring-2 ring-card" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{r.item}</span>
                <span className="block truncate text-[11px] text-ink-3">{r.merchant} · {shortDate(r.date)}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">{money(r.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
