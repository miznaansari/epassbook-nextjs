'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sheet from '@/components/ui/Sheet';
import LineIcon from '@/components/ui/LineIcon';
import {
  InvestPage,
  PageHead,
  HeroBand,
  StatTile,
  Icon3DTile,
  Card,
  Empty,
  Pill,
  SheetHead,
  Field,
  CardSkeleton,
  SHEET_CLASS,
  SHEET_BODY,
} from '@/components/invest/kit';
import { StatusTimeline, Meter, RankedBars } from '@/components/invest/charts';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function SipTracker() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // State
  const [sips, setSips] = useState([]);
  const [loadingSips, setLoadingSips] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [reminderTime, setReminderTime] = useState('10:00');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedSip, setSelectedSip] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Paid Transaction Modal State
  const [paidTxModalOpen, setPaidTxModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch SIPs
  const fetchSips = async () => {
    if (!user) return;
    setLoadingSips(true);
    try {
      const res = await fetch('/api/sips');
      if (res.ok) {
        const payload = await res.json();
        setSips(payload);
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Error fetching SIPs:', err);
    } finally {
      setLoadingSips(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSips();
    }
  }, [user]);

  // Handle Create SIP
  const handleCreateSip = async (e) => {
    e.preventDefault();
    if (!title || !amount || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        title,
        amount: parseFloat(amount),
        frequency,
        reminderTime,
        dayOfMonth: frequency === 'MONTHLY' ? parseInt(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'WEEKLY' ? parseInt(dayOfWeek) : undefined,
      };

      const res = await fetch('/api/sips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setTitle('');
        setAmount('');
        setFrequency('MONTHLY');
        setDayOfMonth(1);
        setDayOfWeek(1);
        setReminderTime('10:00');
        setShowAddForm(false);
        await fetchSips();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to create SIP');
      }
    } catch (err) {
      console.error('Error creating SIP:', err);
      alert('Error creating SIP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete SIP
  const handleDeleteSip = async (id) => {
    if (!confirm('Are you sure you want to delete this SIP tracker? This will not delete previously logged savings transactions.')) return;

    try {
      const res = await fetch(`/api/sips?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchSips();
      } else {
        alert('Failed to delete SIP');
      }
    } catch (err) {
      console.error('Error deleting SIP:', err);
    }
  };

  // Open Confirm Payment Modal
  const triggerConfirmModal = (sip, period) => {
    if (period.status === 'PAID') return;
    setSelectedSip(sip);
    setSelectedPeriod(period);
    setConfirmModalOpen(true);
  };

  // Open Paid Transaction Detail Modal
  const triggerPaidTxModal = (period) => {
    if (period.transaction) {
      setSelectedTx(period.transaction);
      setPaidTxModalOpen(true);
    }
  };

  // Submit confirmed payment
  const handleConfirmPayment = async () => {
    if (!selectedSip || !selectedPeriod || confirmLoading) return;

    setConfirmLoading(true);
    try {
      const res = await fetch('/api/sips/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sipId: selectedSip.id,
          date: selectedPeriod.targetDate
        })
      });

      if (res.ok) {
        setConfirmModalOpen(false);
        setSelectedSip(null);
        setSelectedPeriod(null);
        await fetchSips();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to confirm SIP payment');
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
    } finally {
      setConfirmLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(val || 0);
  };

  const pageLoading = loading || !user || loadingSips;

  const totalMonthlySip = sips
    .filter(s => s.isActive && s.frequency === 'MONTHLY')
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const totalWeeklySip = sips
    .filter(s => s.isActive && s.frequency === 'WEEKLY')
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const totalActiveSips = sips.filter(s => s.isActive).length;

  // Derived for display only
  const monthlyEquivalent = (s) => parseFloat(s.amount) * (s.frequency === 'WEEKLY' ? 52 / 12 : 1);
  const monthlyCommitment = totalMonthlySip + totalWeeklySip * (52 / 12);
  const allPeriods = sips.flatMap(s => s.periods || []);
  const paidCount = allPeriods.filter(p => p.status === 'PAID').length;
  const missedCount = allPeriods.filter(p => p.status === 'MISSED').length;
  const dueCount = allPeriods.filter(p => p.status === 'PENDING').length;
  const commitmentRows = sips
    .filter(s => s.isActive)
    .map(s => ({
      key: s.id,
      label: s.title,
      sub: s.frequency === 'WEEKLY' ? 'weekly' : 'monthly',
      value: monthlyEquivalent(s),
    }));

  const newPlanButton = (
    <button type="button" onClick={() => setShowAddForm(true)} className="mm-btn mm-btn-amber mm-focus min-h-11 gap-1.5 px-4">
      <LineIcon name="plus" size={18} strokeWidth={2.4} /> New plan
    </button>
  );

  return (
    <InvestPage>
      <PageHead title="SIP plans" sub="Recurring investments and their payment history" actions={newPlanButton} />

      <HeroBand
        icon="sips"
        label="Monthly commitment"
        value={formatCurrency(monthlyCommitment)}
        delta={totalWeeklySip > 0 ? 'Weekly plans counted at 52 weeks / 12' : 'Across your active plans'}
        loading={pageLoading}
        tiles={[
          { label: 'Active plans', value: totalActiveSips },
          { label: 'Monthly', value: formatCurrency(totalMonthlySip) },
          { label: 'Weekly', value: formatCurrency(totalWeeklySip) },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon="check" tone="green" label="Paid" value={paidCount} delta="recent periods" loading={pageLoading} />
        <StatTile icon="warning" tone="red" label="Missed" value={missedCount} delta="recent periods" good={missedCount === 0} loading={pageLoading} />
        <div className="col-span-2 sm:col-span-1">
          <StatTile icon="calendar" tone="gold" label="Due now" value={dueCount} delta="to confirm" loading={pageLoading} />
        </div>
      </div>

      {pageLoading ? (
        <>
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
        </>
      ) : sips.length === 0 ? (
        <Card>
          <Empty
            icon="sips"
            title="No SIP plans yet"
            message="Add a monthly or weekly plan to track each payment."
            action={newPlanButton}
          />
        </Card>
      ) : (
        <>
          {commitmentRows.length > 1 && (
            <Card title="Commitment by plan" sub="Per month, active plans">
              <RankedBars rows={commitmentRows} format={formatCurrency} />
            </Card>
          )}

          <ul className="flex flex-col gap-4">
            {sips.map((sip) => {
              const periods = sip.periods || [];
              const paid = periods.filter(p => p.status === 'PAID').length;
              const missed = periods.filter(p => p.status === 'MISSED').length;
              const elapsed = paid + missed;
              const duePeriod = periods.find(p => p.status === 'PENDING');
              const items = periods.map((p, idx) => ({
                key: `${sip.id}-${idx}`,
                label: p.label,
                status: p.status === 'PAID' ? 'paid' : p.status === 'MISSED' ? 'missed' : 'due',
                title: p.status === 'PAID' && p.transaction ? formatCurrency(p.transaction.amount) : formatCurrency(sip.amount),
                period: p,
              }));
              const when = sip.frequency === 'MONTHLY'
                ? `Day ${sip.dayOfMonth}`
                : WEEKDAYS[(sip.dayOfWeek || 1) - 1];

              return (
                <li key={sip.id}>
                  <Card>
                    <div className="flex items-start gap-3">
                      <Icon3DTile name="sips" tone={sip.isActive ? 'indigo' : 'gold'} size={48} />
                      <div className="min-w-0 flex-1">
                        <h2 className="mm-h2 truncate">{sip.title}</h2>
                        <p className="mm-lbl mt-0.5">
                          {sip.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} · {when} · {sip.reminderTime}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[17px] font-extrabold tabular-nums text-(--mm-ink)">
                        {formatCurrency(sip.amount)}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Pill tone={sip.isActive ? 'good' : 'mute'}>{sip.isActive ? 'Active' : 'Paused'}</Pill>
                      {missed > 0 && <Pill tone="bad">{missed} missed</Pill>}
                      {duePeriod && <Pill tone="warn">Due now</Pill>}
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="font-bold text-(--mm-ink)">Paid on time</span>
                        <span className="font-bold tabular-nums text-(--mm-ink)">
                          {paid} <span className="mm-lbl font-medium">of {elapsed} periods</span>
                        </span>
                      </div>
                      <Meter value={paid} max={elapsed} label={`${sip.title}: ${paid} of ${elapsed} periods paid`} tone={missed > 0 ? 'warn' : 'good'} />
                    </div>

                    <div className="mt-4">
                      <StatusTimeline
                        items={items}
                        label={`${sip.title} payment history`}
                        onSelect={(item) => (item.status === 'paid' ? triggerPaidTxModal(item.period) : triggerConfirmModal(sip, item.period))}
                      />
                      <p className="mm-lbl mt-1.5">Tap a period to confirm it or see its transaction.</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-(--mm-line) pt-3.5">
                      {duePeriod ? (
                        <button type="button" onClick={() => triggerConfirmModal(sip, duePeriod)} className="mm-btn mm-btn-amber mm-focus min-h-11 gap-1.5 px-4">
                          <LineIcon name="check" size={18} strokeWidth={2.4} /> Confirm payment
                        </button>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => handleDeleteSip(sip.id)}
                        className="mm-btn mm-btn-ghost mm-focus min-h-11 gap-1.5 px-3 text-(--mm-red-ink)"
                      >
                        <LineIcon name="trash" size={16} /> Delete plan
                      </button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* New plan */}
      <Sheet
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        label="New SIP plan"
        zIndex={115}
        dismissible={!submitting}
        className={SHEET_CLASS}
        bodyClassName={SHEET_BODY}
      >
        <SheetHead icon="sips" tone="indigo" title="New SIP plan" sub="A recurring investment to track" onClose={() => setShowAddForm(false)} />
        <form onSubmit={handleCreateSip} className="space-y-4">
          <Field label="Plan name" htmlFor="sip-title">
            <input
              id="sip-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Navi Mutual Fund"
              className="mm-field"
            />
          </Field>
          <Field label="Amount per period" htmlFor="sip-amount">
            <input
              id="sip-amount"
              type="number"
              inputMode="decimal"
              required
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="mm-field"
            />
          </Field>
          <Field label="Frequency" htmlFor="sip-frequency">
            <select id="sip-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mm-field">
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </Field>
          {frequency === 'MONTHLY' ? (
            <Field label="Day of month (1 - 31)" htmlFor="sip-dom">
              <input
                id="sip-dom"
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                required
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="mm-field"
              />
            </Field>
          ) : (
            <Field label="Day of week" htmlFor="sip-dow">
              <select id="sip-dow" value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value))} className="mm-field">
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="7">Sunday</option>
              </select>
            </Field>
          )}
          <Field label="Reminder time" htmlFor="sip-time">
            <input id="sip-time" type="time" required value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="mm-field" />
          </Field>
          <div className="flex gap-2.5 pb-1 pt-1">
            <button type="button" onClick={() => setShowAddForm(false)} disabled={submitting} className="mm-btn mm-btn-ghost mm-focus min-h-11 flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="mm-btn mm-btn-amber mm-focus min-h-11 flex-1 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create plan'}
            </button>
          </div>
        </form>
      </Sheet>

      {/* Confirm payment */}
      <Sheet
        open={confirmModalOpen && !!selectedSip && !!selectedPeriod}
        onClose={() => setConfirmModalOpen(false)}
        label="Confirm SIP payment"
        zIndex={115}
        dismissible={!submitting}
        className={SHEET_CLASS}
        bodyClassName={SHEET_BODY}
      >
        {selectedSip && selectedPeriod && (
          <>
            <SheetHead icon="sips" tone="indigo" title="Confirm payment" sub="Adds a matching savings entry" onClose={() => setConfirmModalOpen(false)} />
            <dl className="space-y-2 rounded-xl bg-(--mm-soft) p-3.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-(--mm-ink-2)">Plan</dt>
                <dd className="font-bold text-(--mm-ink)">{selectedSip.title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-(--mm-ink-2)">Target date</dt>
                <dd className="font-bold tabular-nums text-(--mm-ink)">{fmtDate(selectedPeriod.targetDate)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-(--mm-line) pt-2">
                <dt className="text-(--mm-ink-2)">Amount</dt>
                <dd className="text-[15px] font-extrabold tabular-nums text-(--mm-ink)">{formatCurrency(selectedSip.amount)}</dd>
              </div>
            </dl>
            <div className="flex gap-2.5 pb-1">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => {
                  setConfirmModalOpen(false);
                  setSelectedSip(null);
                  setSelectedPeriod(null);
                }}
                className="mm-btn mm-btn-ghost mm-focus min-h-11 flex-1"
              >
                Cancel
              </button>
              <button type="button" disabled={confirmLoading} onClick={handleConfirmPayment} className="mm-btn mm-btn-amber mm-focus min-h-11 flex-1 disabled:opacity-50">
                {confirmLoading ? 'Confirming...' : 'Confirm & log'}
              </button>
            </div>
          </>
        )}
      </Sheet>

      {/* Payment details */}
      <Sheet
        open={paidTxModalOpen && !!selectedTx}
        onClose={() => setPaidTxModalOpen(false)}
        label="SIP payment details"
        zIndex={115}
        className={SHEET_CLASS}
        bodyClassName={SHEET_BODY}
      >
        {selectedTx && (
          <>
            <SheetHead icon="check" tone="green" title="Payment logged" sub="Saved in your passbook" onClose={() => setPaidTxModalOpen(false)} />
            <dl className="space-y-2 rounded-xl bg-(--mm-soft) p-3.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-(--mm-ink-2)">Title</dt>
                <dd className="font-bold text-(--mm-ink)">{selectedTx.title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-(--mm-ink-2)">Date</dt>
                <dd className="font-bold tabular-nums text-(--mm-ink)">{fmtDate(selectedTx.date)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-(--mm-line) pt-2">
                <dt className="text-(--mm-ink-2)">Amount</dt>
                <dd className="text-[15px] font-extrabold tabular-nums text-(--mm-ink)">{formatCurrency(selectedTx.amount)}</dd>
              </div>
            </dl>
            <div className="pb-1">
              <button
                type="button"
                onClick={() => {
                  setPaidTxModalOpen(false);
                  setSelectedTx(null);
                }}
                className="mm-btn mm-btn-amber mm-focus min-h-11 w-full"
              >
                Done
              </button>
            </div>
          </>
        )}
      </Sheet>
    </InvestPage>
  );
}
