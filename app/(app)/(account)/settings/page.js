'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OneSignal from 'react-onesignal';
import packageInfo from '@/package.json';
import { useAuth } from '@/context/AuthContext';
import LineIcon from '@/components/ui/LineIcon';
import Sheet from '@/components/ui/Sheet';
import Switch from '@/components/ui/Switch';
import ThemeToggle from '@/components/ui/ThemeToggle';

const CURRENCIES = [
  { id: 'INR', label: '₹ INR' },
  { id: 'USD', label: '$ USD' },
];

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

function Group({ title, children }) {
  return (
    <section>
      <h2 className="mm-lbl px-1 pb-2 uppercase tracking-[0.08em]">{title}</h2>
      <div className="mm-card divide-y divide-(--mm-line-2) overflow-hidden">{children}</div>
    </section>
  );
}

/** One settings row: icon, label + hint on the left, a control (or chevron) on the right. */
function Row({ icon, label, hint, children, onClick, href, danger = false }) {
  const body = (
    <>
      {icon && (
        <span className={`mm-in ${danger ? 'bg-(--mm-red-soft) text-(--mm-red-ink)' : 'bg-(--mm-indigo-soft) text-(--mm-brand-ink)'}`}>
          <LineIcon name={icon} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-bold ${danger ? 'text-(--mm-red-ink)' : 'text-(--mm-ink)'}`}>{label}</span>
        {hint && <span className="mm-lbl block font-medium">{hint}</span>}
      </span>
      {children}
      {(onClick || href) && !danger && <LineIcon name="chevron" size={18} className="text-(--mm-ink-3)" />}
    </>
  );
  const cls = 'flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left';
  if (href) return <Link href={href} className={`${cls} mm-focus transition-colors hover:bg-(--mm-soft)`}>{body}</Link>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} mm-focus cursor-pointer transition-colors hover:bg-(--mm-soft)`}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

export default function Settings() {
  const { user, loading, refreshUser, logout } = useAuth();
  const router = useRouter();

  // Optimistic overrides on top of the saved user; cleared once the save lands.
  const [draft, setDraft] = useState({});
  const [status, setStatus] = useState({ kind: 'idle', text: '' }); // idle | saving | saved | error
  const [editing, setEditing] = useState(null); // 'name' | 'cycle' | null
  const [fieldText, setFieldText] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [reminderTime, setReminderTime] = useState(null); // while the time picker is being edited

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushChecked, setPushChecked] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Observe the OneSignal push subscription.
  useEffect(() => {
    const check = () => {
      try {
        setPushEnabled(!!OneSignal.User?.PushSubscription?.optedIn);
        setPushChecked(true);
      } catch (err) {
        console.warn('[Settings] Error checking push status:', err);
      }
    };
    check();
    try {
      OneSignal.User?.PushSubscription?.addEventListener('change', check);
    } catch (err) {
      console.warn('[Settings] Error adding push listener:', err);
    }
    return () => {
      try {
        OneSignal.User?.PushSubscription?.removeEventListener('change', check);
      } catch { /* SDK not ready */ }
    };
  }, []);

  useEffect(() => {
    if (status.kind !== 'saved') return;
    const t = setTimeout(() => setStatus({ kind: 'idle', text: '' }), 1800);
    return () => clearTimeout(t);
  }, [status]);

  // Keep the page on screen while refreshUser() re-fetches after a save.
  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-(--mm-canvas)">
        <span className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-[#4F46E5] text-white">
          <LineIcon name="settings" size={28} />
        </span>
      </div>
    );
  }

  const saved = {
    name: user.displayName || user.name || '',
    salaryCycleDate: user.salaryCycleDate || 1,
    currency: user.currency || 'USD',
    dailyReminderTime: user.dailyReminderTime || '23:00',
    notifSalary: user.notifSalary !== false,
    notifDaily: user.notifDaily !== false,
    notifCycle: user.notifCycle !== false,
    notifDailySpend: user.notifDailySpend !== false,
    dailySpendReminderTime: user.dailySpendReminderTime || '22:00',
  };
  const values = { ...saved, ...draft };

  /** Save one or more settings right away; revert them if the request fails. */
  const save = async (patch) => {
    const keys = Object.keys(patch);
    setDraft(d => ({ ...d, ...patch }));
    setStatus({ kind: 'saving', text: 'Saving…' });
    const revert = () => setDraft(d => Object.fromEntries(Object.entries(d).filter(([k]) => !keys.includes(k))));
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          ...values,
          ...patch,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        revert();
        setStatus({ kind: 'error', text: payload.error || 'Could not save. Please try again.' });
        return false;
      }
      await refreshUser();
      revert(); // the saved user now carries these values
      setStatus({ kind: 'saved', text: 'Saved' });
      return true;
    } catch {
      revert();
      setStatus({ kind: 'error', text: 'Network error. Your change was not saved.' });
      return false;
    }
  };

  const openEditor = (field) => {
    setFieldError('');
    setFieldText(field === 'name' ? values.name : String(values.salaryCycleDate));
    setEditing(field);
  };

  const submitEditor = async (e) => {
    e.preventDefault();
    if (editing === 'name') {
      const name = fieldText.trim();
      if (!name) return setFieldError('Please enter a display name.');
      setEditing(null);
      await save({ name });
    } else {
      const day = parseInt(fieldText, 10);
      if (!Number.isInteger(day) || day < 1 || day > 31) return setFieldError('Enter a day between 1 and 31.');
      setEditing(null);
      await save({ salaryCycleDate: day });
    }
    return undefined;
  };

  const enablePush = async () => {
    setPushBusy(true);
    try {
      await OneSignal.Notifications?.requestPermission();
      await OneSignal.User?.PushSubscription?.optIn();
      if (user?.uid) await OneSignal.login(user.uid);
      setStatus({ kind: 'saved', text: 'Notifications enabled' });
    } catch (err) {
      console.error('Error enabling push:', err);
      setStatus({ kind: 'error', text: "Couldn't enable notifications. Check your browser's notification permission." });
    } finally {
      setPushBusy(false);
    }
  };

  const initial = (values.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div data-ui="v2" className="mm relative flex flex-1 flex-col bg-(--mm-canvas)">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-5 pb-[110px] pt-5 md:px-10 md:pb-12 md:pt-7">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-extrabold leading-tight text-(--mm-ink) md:text-[28px]">Settings</h1>
            <p className="mm-lbl mt-0.5">Changes save automatically.</p>
          </div>
          <div aria-live="polite" className="min-h-6 text-right">
            {status.kind === 'saving' && <span className="mm-tag bg-(--mm-indigo-soft) text-(--mm-brand-ink)">{status.text}</span>}
            {status.kind === 'saved' && <span className="mm-tag bg-(--mm-green-soft) text-(--mm-green-ink)">✓ {status.text}</span>}
          </div>
        </header>

        {status.kind === 'error' && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-(--mm-red-soft) p-3 text-[13px] font-semibold text-(--mm-red-ink)">
            <LineIcon name="alert" size={18} />
            <span className="flex-1">{status.text}</span>
            <button type="button" onClick={() => setStatus({ kind: 'idle', text: '' })} aria-label="Dismiss" className="mm-focus cursor-pointer rounded-md">
              <LineIcon name="close" size={16} />
            </button>
          </div>
        )}

        <Group title="Account">
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-(--mm-brand-soft) text-[18px] font-extrabold text-(--mm-brand-ink)">
              {user.photoURL
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                : initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-extrabold text-(--mm-ink)">{values.name || 'You'}</div>
              <div className="mm-lbl truncate font-medium">{user.email}</div>
            </div>
          </div>
          <Row icon="person" label="Display name" hint={values.name || 'Not set'} onClick={() => openEditor('name')} />
        </Group>

        <Group title="Money">
          <Row
            icon="calendar"
            label="Salary cycle day"
            hint={`Your month starts on the ${ordinal(values.salaryCycleDate)}`}
            onClick={() => openEditor('cycle')}
          />
          <Row icon="cash" label="Currency" hint="Used for every amount">
            <div className="mm-seg" role="group" aria-label="Currency">
              {CURRENCIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={values.currency === c.id}
                  onClick={() => values.currency !== c.id && save({ currency: c.id })}
                  className={values.currency === c.id ? 'is-on' : ''}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Row>
        </Group>

        <Group title="Appearance">
          <div className="px-4 py-3">
            <div className="pb-2 text-[15px] font-bold text-(--mm-ink)">Theme</div>
            <ThemeToggle variant="segmented" />
          </div>
        </Group>

        <Group title="Notifications">
          <Row icon="bell" label="Push notifications" hint={!pushChecked ? 'Checking…' : pushEnabled ? 'Enabled on this device' : 'Off on this device'}>
            {pushChecked && !pushEnabled && (
              <button type="button" onClick={enablePush} disabled={pushBusy} className="mm-btn mm-btn-amber min-h-10 px-3.5 text-[13px]">
                {pushBusy ? 'Enabling…' : 'Enable'}
              </button>
            )}
            {pushEnabled && <span className="mm-tag bg-(--mm-green-soft) text-(--mm-green-ink)">On</span>}
          </Row>
          <Row icon="sparkle" label="Salary celebration" hint="Show a celebration when salary is logged">
            <Switch checked={values.notifSalary} onChange={(v) => save({ notifSalary: v })} label="Salary celebration" />
          </Row>
          <Row icon="repeat" label="Daily spend reminder" hint="A nudge to log the day's spending">
            <Switch checked={values.notifDaily} onChange={(v) => save({ notifDaily: v })} label="Daily spend reminder" />
          </Row>
          {values.notifDaily && (
            <Row label="Reminder time" hint="In your local time">
              <label className="sr-only" htmlFor="reminder-time">Reminder time</label>
              <input
                id="reminder-time"
                type="time"
                value={reminderTime ?? values.dailyReminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                onBlur={() => {
                  const t = reminderTime;
                  setReminderTime(null);
                  if (t && t !== values.dailyReminderTime) save({ dailyReminderTime: t });
                }}
                className="min-h-11 rounded-xl border border-(--mm-line) bg-(--mm-card) px-3 text-[15px] font-bold text-(--mm-ink) outline-none focus:border-(--mm-brand)"
              />
            </Row>
          )}
          <Row icon="grid" label="Campaigns & streaks" hint="Custom alerts and streak reminders" href="/notifications" />
        </Group>

        <Group title="Developer">
          <Row icon="code" label="API keys & MCP" hint="Connect AI tools to your passbook" href="/mcp" />
        </Group>

        <Group title="Session">
          <Row icon="logout" label="Log out" danger onClick={logout} />
        </Group>

        <p className="mm-lbl text-center font-medium">MonthlyMoney v{packageInfo.version}</p>
      </main>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        label={editing === 'name' ? 'Edit display name' : 'Edit salary cycle day'}
        className="mm border border-(--mm-line) bg-(--mm-card) text-(--mm-ink) shadow-pop"
        bodyClassName="px-5 pt-1 md:pt-6"
      >
        <form onSubmit={submitEditor} className="flex flex-col gap-4">
          <div>
            <h2 className="mm-h2">{editing === 'cycle' ? 'Salary cycle day' : 'Display name'}</h2>
            <p className="mm-lbl mt-1 font-medium">
              {editing === 'cycle'
                ? 'The day of the month your salary arrives (1–31). Cycles, charts and "salary left" all start from this day.'
                : 'Shown in the menu and on your account.'}
            </p>
          </div>
          <div>
            <label htmlFor="settings-field" className="sr-only">{editing === 'cycle' ? 'Day of month' : 'Display name'}</label>
            <input
              id="settings-field"
              key={editing}
              autoFocus
              type={editing === 'cycle' ? 'number' : 'text'}
              inputMode={editing === 'cycle' ? 'numeric' : undefined}
              min={editing === 'cycle' ? 1 : undefined}
              max={editing === 'cycle' ? 31 : undefined}
              maxLength={editing === 'cycle' ? undefined : 60}
              value={fieldText}
              onChange={(e) => { setFieldText(e.target.value); setFieldError(''); }}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'settings-field-error' : undefined}
              className="min-h-12 w-full rounded-xl border border-(--mm-line) bg-(--mm-card) px-3.5 text-[16px] font-bold text-(--mm-ink) outline-none focus:border-(--mm-brand)"
            />
            {fieldError && <p id="settings-field-error" role="alert" className="mt-1.5 text-[13px] font-semibold text-(--mm-red-ink)">{fieldError}</p>}
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setEditing(null)} className="mm-btn mm-btn-ghost flex-1">Cancel</button>
            <button type="submit" className="mm-btn flex-1 bg-(--mm-brand) text-(--mm-card)">Save</button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
