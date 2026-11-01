'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import Icon3D from '@/components/ui/Icon3D';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Button from '@/components/ui/Button';

function Brand({ onDark = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${onDark ? 'bg-white/15' : 'bg-hero shadow-glow-primary'}`}>
        <Icon3D name="savings" size={24} />
      </span>
      <span className={`font-display text-lg font-extrabold tracking-tight ${onDark ? 'text-white' : 'text-ink'}`}>
        Monthly<span className={onDark ? 'text-amber-200' : 'text-primary'}>Money</span>
      </span>
    </span>
  );
}

/** Split auth layout: brand panel (lg+) and the form column. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div data-ui="v2" className="grid min-h-[100dvh] bg-canvas text-ink lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-hero p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" aria-label="MonthlyMoney home"><Brand onDark /></Link>

        <div className="relative">
          <div className="relative mx-auto h-64 w-full max-w-md" aria-hidden="true">
            <div className="absolute left-6 top-6 animate-float"><Icon3D name="savings" size={120} /></div>
            <div className="absolute right-10 top-0 animate-float-slow"><Icon3D name="receipt" size={84} /></div>
            <div className="absolute bottom-0 left-1/3 animate-float-slow"><Icon3D name="chart-up" size={96} /></div>
            <div className="absolute bottom-6 right-4 animate-float"><Icon3D name="assistant" size={100} /></div>
          </div>
          <h2 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight">Know exactly where your salary goes.</h2>
          <ul className="mt-5 space-y-2 text-sm text-white/85">
            {['AI groups spending by merchant', 'Compare any two salary cycles', 'Snap receipts, log items in one tap'].map(t => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-200" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/60">© {new Date().getFullYear()} MonthlyMoney</p>
      </aside>

      <main className="flex flex-col px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-ink-2 hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Home
          </Link>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8"
        >
          <div className="mb-6 lg:hidden"><Brand /></div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-2">{footer}</div>}
        </motion.div>
      </main>
    </div>
  );
}

export function AuthField({ id, label, icon: Icon, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink-2">{label}</label>
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />}
        <input id={id} className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none" {...inputProps} />
      </div>
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function GoogleButton({ onClick, disabled, children = 'Continue with Google' }) {
  return (
    <Button variant="outline" size="lg" onClick={onClick} disabled={disabled} className="w-full">
      <GoogleMark /> {children}
    </Button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Shown while auth resolves; offers a reload / cache reset if it hangs. */
export function AuthLoading({ showRetry }) {
  return (
    <div data-ui="v2" className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <Icon3D name="savings" size={56} className="animate-pulse" />
      {showRetry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-line bg-card p-5 text-center shadow-card"
        >
          <p className="text-sm font-semibold text-ink">Taking longer than usual…</p>
          <p className="text-xs text-ink-2">Reload, or clear the app cache if it keeps spinning.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Reload</Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger-ink"
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
                }
                window.location.reload();
              }}
            >
              Clear cache
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
