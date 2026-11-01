'use client';

import Icon3D from '@/components/ui/Icon3D';

export const SUGGESTIONS = [
  { text: 'Scan a receipt and log the items', icon: 'receipt', isImagePrompt: true },
  { text: 'Where did I spend the most this cycle?', icon: 'chart-up' },
  { text: 'Compare this month with last month', icon: 'reports' },
  { text: 'Show my savings pots and balances', icon: 'savings' },
  { text: 'Give me my loan and lending summary', icon: 'handshake' },
  { text: 'How can I save more next month?', icon: 'bulb' },
];

/** Empty-chat hero with suggestion tiles. */
export default function WelcomeScreen({ name, onPick }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-1 py-6 md:py-12 text-center">
      <div className="relative">
        <span className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl" aria-hidden="true" />
        <Icon3D name="assistant" size={84} className="animate-float" />
      </div>
      <h1 className="mt-4 font-display text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
        {name ? `Hi ${name}, ` : ''}what can I help with?
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-2">
        Ask about your spending, savings and loans, or send a receipt photo and I&apos;ll log every item for you.
      </p>

      <ul className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map(s => (
          <li key={s.text}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-3 py-2.5 text-left shadow-card hover:border-primary/40 hover:bg-card-2 transition cursor-pointer"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card-2 group-hover:bg-card">
                <Icon3D name={s.icon} size={26} />
              </span>
              <span className="text-[13px] font-medium text-ink">{s.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
