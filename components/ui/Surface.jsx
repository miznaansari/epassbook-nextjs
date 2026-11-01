/**
 * Responsive container: a real card from `md` up, a flat full-bleed section
 * with a hairline divider on mobile (no boxed cards on small screens).
 *
 * `flat` = never a card. `card` = always a card (dialogs, floating panels).
 */
export default function Surface({ as: Tag = 'section', mode = 'responsive', padded = true, className = '', children, ...rest }) {
  const card = 'bg-card border border-line rounded-[var(--radius-card)] shadow-card';
  const modes = {
    responsive: `border-b border-line last:border-b-0 py-4 md:py-0 md:border-b md:last:border-b ${padded ? 'md:p-5' : ''} md:bg-card md:border md:rounded-[var(--radius-card)] md:shadow-card`,
    card: `${card} ${padded ? 'p-4 md:p-5' : ''}`,
    flat: `border-b border-line py-4`,
  };
  return (
    <Tag className={`${modes[mode] || modes.responsive} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="font-display text-[15px] md:text-base font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
