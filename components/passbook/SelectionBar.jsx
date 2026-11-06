'use client';

import LineIcon from '@/components/ui/LineIcon';

/** Floating bar while selecting entries: count, total, select-all, delete, done. */
export default function SelectionBar({ count, total, loaded, money, deleting, onSelectAll, onDelete, onDone }) {
  const allPicked = loaded > 0 && count === loaded;
  return (
    <div
      className="mm fixed inset-x-3 z-50 mx-auto max-w-xl md:bottom-6 md:left-[calc(var(--sidebar-width,248px)+24px)] md:right-6"
      style={{ bottom: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 90px))' }}
      role="region"
      aria-label="Selected entries"
    >
      <div className="mm-card flex items-center gap-2.5 p-2.5 shadow-pop md:gap-3 md:p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-(--mm-brand-soft) text-[14px] font-extrabold text-(--mm-brand-ink) tabular-nums">
          {count}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <div className="truncate text-[14px] font-bold text-(--mm-ink)">
            {count ? `${count} selected` : 'Tap entries to select'}
          </div>
          <div className="mm-lbl truncate">{count ? `Total ${money(total)}` : `${loaded} loaded`}</div>
        </div>
        <button type="button" onClick={onSelectAll} className="mm-btn mm-btn-ghost px-3 text-[13px]" disabled={!loaded}>
          {allPicked ? 'None' : 'All'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!count || deleting}
          className="mm-btn bg-(--mm-red-soft) px-3 text-[13px] text-(--mm-red-ink) md:px-4"
        >
          <LineIcon name={deleting ? 'spinner' : 'trash'} size={18} className={deleting ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{deleting ? 'Deleting…' : 'Delete'}</span>
        </button>
        <button type="button" onClick={onDone} className="mm-btn mm-btn-ghost w-11 px-0" aria-label="Done selecting">
          <LineIcon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}
