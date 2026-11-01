'use client';

import { Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Icon3D from './Icon3D';

/**
 * Compact theme switch. `variant="cycle"` is a single button that cycles
 * light → dark → system; `variant="segmented"` shows all three.
 */
export default function ThemeToggle({ variant = 'cycle', className = '' }) {
  const { theme, resolvedTheme, setTheme, mounted } = useTheme();
  const current = mounted ? theme : 'dark';

  if (variant === 'segmented') {
    const opts = [
      { id: 'light', label: 'Light', icon: <Icon3D name="sun" size={18} /> },
      { id: 'dark', label: 'Dark', icon: <Icon3D name="moon" size={18} /> },
      { id: 'system', label: 'Auto', icon: <Monitor className="h-4 w-4" aria-hidden="true" /> },
    ];
    return (
      <div className={`grid grid-cols-3 gap-1 rounded-xl bg-card-2 p-1 ${className}`} role="radiogroup" aria-label="Theme">
        {opts.map(o => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={current === o.id}
            onClick={() => setTheme(o.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              current === o.id ? 'bg-card text-ink shadow-card' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
  const isDark = (mounted ? resolvedTheme : 'dark') === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${current}. Switch to ${next}`}
      title={`Theme: ${current}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card hover:bg-card-2 transition-colors cursor-pointer ${className}`}
    >
      <Icon3D name={isDark ? 'moon' : 'sun'} size={22} />
      {current === 'system' && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card-3 px-1 text-[8px] font-bold text-ink-2 ring-2 ring-card">A</span>
      )}
    </button>
  );
}
