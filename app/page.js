'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Icon3D, { IconTile } from '@/components/ui/Icon3D';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { buttonClasses } from '@/components/ui/Button';

const FEATURES = [
  { icon: 'sparkles', title: 'AI groups every rupee', text: 'Quick-commerce, your local kirana, subscriptions, family transfers: sorted by merchant automatically.' },
  { icon: 'receipt', title: 'Snap a receipt', text: 'Send up to 10 bill photos. Every item and price is read and logged after you approve.' },
  { icon: 'calendar', title: 'Salary-cycle tracking', text: 'Your month starts on payday, not the 1st. Spending, balance and salary left follow your cycle.' },
  { icon: 'reports', title: 'Compare cycles', text: 'See this cycle next to any of the last 12, merchant by merchant and item by item.' },
  { icon: 'savings', title: 'Savings & SIPs', text: 'Track savings pots, SIPs and stocks next to your everyday spending.' },
  { icon: 'assistant', title: 'Ask in plain words', text: 'Type or speak in English or Hinglish: “groceries pe kitna gaya?” and get a straight answer.' },
];

const STEPS = [
  { icon: 'mic', title: 'Log it your way', text: 'Type “250 pizza”, speak it, or snap the bill.' },
  { icon: 'sparkles', title: 'AI sorts it', text: 'Merchant, item and category are filled in for you.' },
  { icon: 'chart-up', title: 'See where it went', text: 'Compare cycles and cut what you don’t need.' },
];

// Marketing mock: generic stand-ins, no real brand logos.
const MOCK_ROWS = [
  { icon: 'people', name: 'Family & people', now: 10600, prev: 11200 },
  { icon: 'cart', name: 'Quick-commerce', now: 2846, prev: 7490 },
  { icon: 'store', name: 'Local kirana', now: 1150, prev: 640 },
  { icon: 'tv', name: 'Streaming', now: 199, prev: 199 },
];
const MOCK_MAX = 11200;
const inr = (v) => `₹${v.toLocaleString('en-IN')}`;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-hero shadow-glow-primary">
        <Icon3D name="savings" size={22} />
      </span>
      <span className="font-display text-base font-extrabold tracking-tight text-ink">
        Monthly<span className="text-primary">Money</span>
      </span>
    </span>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* floating 3D stickers */}
      <div className="pointer-events-none absolute -left-10 top-16 hidden sm:block animate-float" aria-hidden="true"><Icon3D name="receipt" size={64} /></div>
      <div className="pointer-events-none absolute -right-8 top-4 animate-float-slow" aria-hidden="true"><Icon3D name="sparkles" size={56} /></div>
      <div className="pointer-events-none absolute -right-10 bottom-24 hidden sm:block animate-float" aria-hidden="true"><Icon3D name="assistant" size={70} /></div>

      <div className="relative rounded-[2.6rem] border border-line bg-card p-3 shadow-pop">
        <div className="mx-auto mb-2 h-1.5 w-20 rounded-full bg-card-3" aria-hidden="true" />
        <div className="overflow-hidden rounded-[2rem] bg-canvas">
          <div className="bg-hero p-4 text-white">
            <p className="text-[11px] text-white/80">Oct cycle · 6 Oct – 5 Nov</p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">₹18,061</p>
            <p className="text-[11px] text-white/80">spent so far · <span className="font-semibold text-emerald-100">10% less than last</span></p>
            <div className="mt-3 h-1.5 rounded-full bg-white/20"><div className="h-full w-[72%] rounded-full bg-secondary" /></div>
          </div>
          <div className="p-3">
            <p className="px-1 text-xs font-bold text-ink">Where your money went</p>
            <ul className="mt-1 divide-y divide-line">
              {MOCK_ROWS.map(r => (
                <li key={r.name} className="flex items-center gap-2.5 px-1 py-2">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card">
                    <Icon3D name={r.icon} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate font-semibold text-ink">{r.name}</span>
                      <span className="font-bold tabular-nums text-ink">{inr(r.now)}</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <div className="h-1.5 rounded-r-full bg-primary" style={{ width: `${(r.now / MOCK_MAX) * 100}%` }} />
                      <div className="h-1.5 rounded-r-full bg-[#eb6834]" style={{ width: `${(r.prev / MOCK_MAX) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const primaryCta = user
    ? { href: '/dashboard', label: 'Open dashboard' }
    : { href: '/signup', label: 'Get started free' };

  return (
    <div data-ui="v2" className="relative flex min-h-[100dvh] flex-col bg-canvas text-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="MonthlyMoney home"><Logo /></Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-2 md:flex" aria-label="Sections">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#assistant" className="hover:text-ink">AI assistant</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loading ? (
              <span className="h-10 w-24 rounded-xl bg-card-3 animate-pulse" />
            ) : user ? (
              <Link href="/dashboard" className={buttonClasses({ variant: 'primary', size: 'md' })}>Open app</Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: 'ghost', size: 'md', className: 'hidden sm:inline-flex' })}>Sign in</Link>
                <Link href="/signup" className={buttonClasses({ variant: 'primary', size: 'md' })}>Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent)]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16 lg:grid-cols-[1.1fr_1fr]">
            <motion.div {...fadeUp} className="text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-soft px-3 py-1 text-xs font-bold text-secondary-ink">
                <Icon3D name="sparkles" size={16} /> AI money assistant, made for India
              </span>
              <h1 className="mt-4 font-display text-[40px] leading-[1.05] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Know exactly where your <span className="text-gradient-brand">salary</span> goes.
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-ink-2 sm:text-lg lg:mx-0">
                MonthlyMoney groups every rupee by merchant, compares your salary cycles and reads your receipts, so you can see what to cut in seconds.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href={primaryCta.href} className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto' })}>
                  {primaryCta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                {!user && (
                  <Link href="/login" className={buttonClasses({ variant: 'outline', size: 'lg', className: 'w-full sm:w-auto' })}>
                    I already have an account
                  </Link>
                )}
              </div>
              <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-ink-2 lg:justify-start">
                {['Free to use', 'Private by default', 'Installs like an app'].map(t => (
                  <li key={t} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />{t}</li>
                ))}
              </ul>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
              <PhoneMock />
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-line bg-canvas-2/60 py-12 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp} className="max-w-2xl">
              <p className="text-sm font-bold text-primary">Everything in one place</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Your money, finally organised</h2>
            </motion.div>
            {/* Mobile: dense list rows. Desktop: cards. */}
            <ul className="mt-6 divide-y divide-line md:mt-10 md:grid md:grid-cols-3 md:gap-4 md:divide-y-0">
              {FEATURES.map((f, i) => (
                <motion.li
                  key={f.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                  className="flex gap-4 py-4 md:flex-col md:rounded-[var(--radius-card)] md:border md:border-line md:bg-card md:p-6 md:shadow-card"
                >
                  <IconTile name={f.icon} size={52} tone={i % 2 ? 'secondary' : 'primary'} />
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">{f.title}</h3>
                    <p className="mt-1 text-sm text-ink-2">{f.text}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-12 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.h2 {...fadeUp} className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl md:text-center">Three steps. No spreadsheets.</motion.h2>
            <ol className="mt-6 grid gap-4 md:mt-10 md:grid-cols-3 md:gap-6">
              {STEPS.map((s, i) => (
                <motion.li key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="flex items-start gap-4 md:flex-col md:items-center md:text-center">
                  <span className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-card shadow-card ring-1 ring-line md:h-24 md:w-24">
                    <Icon3D name={s.icon} size={40} className="md:hidden" />
                    <Icon3D name={s.icon} size={56} className="hidden md:inline-block" />
                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-extrabold text-secondary-fg">{i + 1}</span>
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{s.title}</h3>
                    <p className="mt-0.5 text-sm text-ink-2">{s.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Assistant demo */}
        <section id="assistant" className="border-t border-line bg-canvas-2/60 py-12 md:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <motion.div {...fadeUp}>
              <p className="text-sm font-bold text-primary">AI assistant</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Ask your money anything</h2>
              <p className="mt-3 max-w-lg text-ink-2">Chat or talk in English or Hinglish. It knows your entries, savings and cycles, and it can log new ones for you after you approve them.</p>
            </motion.div>
            <motion.div {...fadeUp} className="space-y-4 rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-pop md:p-6">
              <div className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary-soft px-3.5 py-2.5 text-sm text-ink">Groceries pe is cycle kitna gaya?</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft"><Icon3D name="assistant" size={24} /></span>
                <div className="text-sm text-ink">
                  <p><b>₹2,846</b> so far this cycle, <span className="font-semibold text-success-ink">62% less</span> than September.</p>
                  <ul className="mt-2 space-y-1.5">
                    {[['cart', 'Cat litter', '₹527'], ['basket', 'Cat food', '₹432'], ['gift', 'Ghee', '₹399']].map(([icon, name, amt]) => (
                      <li key={name} className="flex items-center gap-2 rounded-xl bg-card-2 px-2.5 py-1.5">
                        <Icon3D name={icon} size={18} /> <span className="flex-1">{name}</span> <b className="tabular-nums">{amt}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trust */}
        <section className="py-10 md:py-14">
          <ul className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-3 sm:px-6">
            {[
              ['lock', 'Private by default', 'Your entries belong to you. We never sell your data.'],
              ['phone', 'Install like an app', 'Add it to your home screen. It opens instantly.'],
              ['moon', 'Light & dark', 'Easy on the eyes, day or night.'],
            ].map(([icon, title, text]) => (
              <li key={title} className="flex items-center gap-3">
                <Icon3D name={icon} size={40} />
                <div>
                  <p className="text-sm font-bold text-ink">{title}</p>
                  <p className="text-xs text-ink-2">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA band */}
        <section className="px-4 pb-14 sm:px-6 md:pb-20">
          <motion.div {...fadeUp} className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-hero px-6 py-10 text-center text-white shadow-pop md:py-14">
            <div className="pointer-events-none absolute -left-4 -top-6 rotate-[-12deg] opacity-90" aria-hidden="true"><Icon3D name="rocket" size={96} /></div>
            <div className="pointer-events-none absolute -bottom-6 -right-2 rotate-[10deg] opacity-90" aria-hidden="true"><Icon3D name="spent" size={110} /></div>
            <h2 className="relative font-display text-3xl font-extrabold tracking-tight md:text-4xl">Start tracking in 30 seconds</h2>
            <p className="relative mx-auto mt-2 max-w-md text-white/85">Log your first expense in plain words and watch it sort itself.</p>
            <Link href={primaryCta.href} className={buttonClasses({ variant: 'onBrand', size: 'lg', className: 'relative mt-6' })}>
              {primaryCta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-ink-3 sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} MonthlyMoney. Made for salaried India.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/signup" className="hover:text-ink">Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
