'use client';

import Icon3D from '@/components/ui/Icon3D';

export const THINKING_PHRASES = [
  'Looking through your ledger…',
  'Checking entries and savings pots…',
  'Reading your receipt…',
  'Writing a reply…',
];

/** Assistant "thinking" row shown until the first token arrives. */
export default function ThinkingIndicator({ step = 0 }) {
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
        <Icon3D name="assistant" size={24} className="animate-pulse" />
      </span>
      <div className="pt-1.5">
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <p className="mt-1.5 text-sm font-medium text-shimmer">{THINKING_PHRASES[step % THINKING_PHRASES.length]}</p>
      </div>
    </div>
  );
}
