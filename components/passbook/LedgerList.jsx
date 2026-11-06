'use client';

import LineIcon from '@/components/ui/LineIcon';

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
      onChange={onChange}
      aria-label={label}
      className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#4F46E5]"
    />
  );
}

function Tag({ view }) {
  return <span className="mm-tag" style={{ background: view.tagTone.soft, color: view.tagTone.ink }}>{view.tag}</span>;
}

/**
 * Row layout from the mockup. `title` is the title node: a stretched edit button in
 * normal mode (the whole row is clickable), plain text while selecting.
 * `action` (repayment) sits beside the tag so the amount column stays aligned.
 */
function RowBody({ title, view, money, editable, action }) {
  const amount = `${view.sign}${money(view.amount)}`;
  return (
    <>
      <span className="mm-in" style={{ background: view.tint.soft, color: view.tint.ink }}>
        <LineIcon name={view.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          {title}
          {view.isAi && (
            <span className="shrink-0 text-(--mm-sparkle)" title="Added by AI">
              <LineIcon name="sparkle" size={14} />
              <span className="sr-only">Added by AI</span>
            </span>
          )}
        </span>
        <span className="mm-lbl block truncate font-medium">{view.subtitle}</span>
      </span>

      {/* Desktop: tag column, amount, edit affordance */}
      <span className="hidden w-[110px] shrink-0 items-center gap-1 md:flex"><Tag view={view} />{action?.('desktop')}</span>
      <b className="hidden min-w-[90px] shrink-0 text-right text-[15px] tabular-nums md:block" style={{ color: view.ink }}>{amount}</b>
      {editable && (
        <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl text-(--mm-ink-3) transition-colors group-hover:bg-(--mm-card) group-hover:text-(--mm-ink) md:grid" aria-hidden="true">
          <LineIcon name="pencil" />
        </span>
      )}

      {/* Mobile: amount over tag */}
      <span className="shrink-0 text-right md:hidden">
        <b className="block text-[15px] tabular-nums" style={{ color: view.ink }}>{amount}</b>
        <span className="mt-1 flex items-center justify-end gap-1">{action?.('mobile')}<Tag view={view} /></span>
      </span>
    </>
  );
}

const titleText = 'min-w-0 truncate text-left text-[14px] font-bold text-(--mm-ink)';

export function EntryRow({ entry, view, money, selecting, selected, onToggle, onEdit, onRepay }) {
  if (selecting) {
    return (
      <li className={`mm-tr cursor-pointer transition-colors ${selected ? 'bg-(--mm-brand-soft)' : ''}`}>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <Checkbox checked={selected} onChange={onToggle} label={`Select ${entry.title}`} />
          <RowBody title={<span className={titleText}>{entry.title}</span>} view={view} money={money} editable={false} />
        </label>
      </li>
    );
  }

  const repay = view.canRepay
    ? (where) => (
      <button
        key={where}
        type="button"
        onClick={onRepay}
        title="Receive repayment"
        aria-label={`Receive repayment for ${entry.title}`}
        className="mm-focus relative z-10 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-(--mm-green-ink) hover:bg-(--mm-green-soft)"
      >
        <LineIcon name="plus" size={18} />
      </button>
    )
    : null;

  return (
    <li className="mm-tr group relative transition-colors hover:bg-(--mm-soft) has-[.mm-row-edit:focus-visible]:outline-2 has-[.mm-row-edit:focus-visible]:-outline-offset-2 has-[.mm-row-edit:focus-visible]:outline-(--mm-brand)">
      <RowBody
        title={(
          // Stretched over the whole row via ::after, so tapping anywhere edits.
          <button type="button" onClick={onEdit} className={`mm-row-edit cursor-pointer outline-none after:absolute after:inset-0 after:content-[''] ${titleText}`}>
            {entry.title}<span className="sr-only">, edit</span>
          </button>
        )}
        view={view}
        money={money}
        editable
        action={repay}
      />
    </li>
  );
}

/** One day (or cycle) of the ledger: header with totals + rows, collapsible. */
export function LedgerSection({ group, money, collapsed, onToggleCollapse, selecting, selectedIds, onToggleGroup, children }) {
  const count = group.entries.length;
  const picked = selecting ? group.entries.filter(e => selectedIds.has(e.id)).length : 0;
  const word = count === 1 ? 'entry' : 'entries';

  return (
    <section>
      <div className="mx-0.5 mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {selecting && (
            <Checkbox
              checked={picked === count}
              indeterminate={picked > 0 && picked < count}
              onChange={() => onToggleGroup(group)}
              label={`Select all in ${group.title}`}
            />
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            className="mm-focus flex min-w-0 cursor-pointer items-center gap-2 rounded-lg text-left"
          >
            <span className="text-(--mm-indigo)"><LineIcon name="calendar" /></span>
            <b className="shrink-0 text-[15px] text-(--mm-ink)">{group.title}</b>
            <span className="mm-lbl truncate">
              <span className="md:hidden">{group.short} · {count}</span>
              <span className="hidden md:inline">{group.long} · {count} {word}</span>
            </span>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[13px] font-bold tabular-nums">
          {group.inflow > 0 && <b className="text-(--mm-green-ink)">+{money(group.inflow)}</b>}
          {group.out > 0 && <b className="text-(--mm-red-ink)">−{money(group.out)}</b>}
        </div>
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mm-card mm-focus w-full cursor-pointer px-4 py-3.5 text-left text-[13px] font-semibold text-(--mm-ink-3) hover:border-(--mm-brand-line)"
        >
          {count} {word} · tap to expand
        </button>
      ) : (
        <ul className="mm-card overflow-hidden">{children}</ul>
      )}
    </section>
  );
}
