'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Info,
  DollarSign,
  Briefcase
} from 'lucide-react';

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

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#5E6AD2] rounded-full animate-spin" />
      </div>
    );
  }

  const totalMonthlySip = sips
    .filter(s => s.isActive && s.frequency === 'MONTHLY')
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const totalWeeklySip = sips
    .filter(s => s.isActive && s.frequency === 'WEEKLY')
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const totalActiveSips = sips.filter(s => s.isActive).length;

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#050506] text-[#EDEDEF]">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 text-left">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight flex items-center gap-2.5">
              <Coins className="w-7 h-7 text-[#818cf8]" /> SIP Tracker
            </h1>
            <p className="text-[#8A8F98] text-xs mt-1">
              Manage Systematic Investment Plans, track recurring payments, and verify savings allocations.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-linear-primary flex items-center justify-center gap-2 px-4 py-2 text-xs self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {showAddForm ? 'Close Form' : 'Add New SIP'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SpotlightCard className="p-5 flex items-center gap-3.5">
            <div className="p-2.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 text-[#818cf8] rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider">Active SIP Plans</div>
              <div className="text-2xl font-semibold text-white mt-0.5">{totalActiveSips}</div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5 flex items-center gap-3.5" spotlightColor="rgba(16, 185, 129, 0.15)">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider">Monthly SIP Target</div>
              <div className="text-2xl font-semibold text-emerald-400 mt-0.5">{formatCurrency(totalMonthlySip)}</div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5 flex items-center gap-3.5" spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#8A8F98] font-mono uppercase tracking-wider">Weekly SIP Target</div>
              <div className="text-2xl font-semibold text-blue-400 mt-0.5">{formatCurrency(totalWeeklySip)}</div>
            </div>
          </SpotlightCard>
        </div>

        {/* Creator Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden mb-8"
            >
              <form onSubmit={handleCreateSip} className="bg-[#0a0a0c] p-6 border border-white/10 rounded-2xl shadow-xl space-y-5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  Create New Systematic Investment Plan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#8A8F98] mb-1.5">
                      SIP Name / Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Navi Mutual Fund"
                      className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white placeholder-[#8A8F98]/50 text-xs focus:outline-none focus:border-[#5E6AD2]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#8A8F98] mb-1.5">
                      Periodic Amount
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white placeholder-[#8A8F98]/50 text-xs focus:outline-none focus:border-[#5E6AD2]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#8A8F98] mb-1.5">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2] cursor-pointer"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>

                  {frequency === 'MONTHLY' ? (
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#8A8F98] mb-1.5">
                        Day of Month (1 - 31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                        className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#8A8F98] mb-1.5">
                        Day of Week
                      </label>
                      <select
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                        className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2] cursor-pointer"
                      >
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                        <option value="7">Sunday</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#8A8F98] mb-1.5">
                      Notification Time
                    </label>
                    <input
                      type="time"
                      required
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="btn-linear-secondary px-4 py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-linear-primary px-4 py-2 text-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SIP List */}
        {loadingSips ? (
          <div className="space-y-4">
            {[1, 2].map(n => (
              <div key={n} className="h-36 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : sips.length === 0 ? (
          <div className="glass-card py-16 text-center border border-white/[0.06] rounded-2xl">
            <Coins className="w-8 h-8 text-[#8A8F98] mx-auto mb-3 opacity-30" />
            <h3 className="text-white text-sm font-semibold">No SIP Plans Configured</h3>
            <p className="text-[#8A8F98] text-xs mt-1 max-w-sm mx-auto">
              Configure a monthly or weekly savings plan to track matching ledger allocations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sips.map((sip) => (
              <motion.div
                key={sip.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a0a0c] p-5 border border-white/[0.06] rounded-2xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                      {sip.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[#8A8F98]">
                      <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.06] text-[#818cf8]">
                        {sip.frequency}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-[#818cf8]" />
                        {sip.frequency === 'MONTHLY' ? `Day ${sip.dayOfMonth}` : `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(sip.dayOfWeek || 1) - 1]}`}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-[#818cf8]" />
                        {sip.reminderTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-emerald-400 font-mono">
                      {formatCurrency(sip.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteSip(sip.id)}
                      className="p-1.5 text-[#8A8F98] hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete SIP Flow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Scrollable Timeline Tracker */}
                <div className="border-t border-white/[0.04] pt-3">
                  <div className="text-[9px] font-mono text-[#8A8F98] uppercase tracking-wider mb-2.5 flex items-center gap-1">
                    <Info className="w-3 h-3 text-[#818cf8]" /> Tap unpaid cycle to log transaction
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {sip.periods.map((period, idx) => {
                      const isPaid = period.status === 'PAID';
                      const isMissed = period.status === 'MISSED';

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (period.status === 'PAID') {
                              triggerPaidTxModal(period);
                            } else {
                              triggerConfirmModal(sip, period);
                            }
                          }}
                          className={`flex flex-col items-center min-w-[64px] p-2 rounded-xl border transition-all select-none cursor-pointer ${
                            isPaid
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                              : isMissed
                              ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                              : 'bg-white/[0.02] border-white/[0.06] text-[#8A8F98] hover:border-white/15'
                          }`}
                        >
                          <span className="text-[9px] font-mono uppercase mb-1">
                            {period.label}
                          </span>
                          <div className="mb-0.5">
                            {isPaid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : isMissed ? (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-[#8A8F98]" />
                            )}
                          </div>
                          <span className="text-[8px] font-mono uppercase tracking-wider mt-0.5">
                            {period.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModalOpen && selectedSip && selectedPeriod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[#0a0a0c] p-6 border border-white/10 rounded-2xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Confirm SIP Transaction</h3>
                  <p className="text-[#8A8F98] text-xs mt-0.5 leading-relaxed">
                    This creates a matching savings entry in your e-passbook.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-[#050506] border border-white/[0.06] rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">SIP Plan:</span>
                  <span className="text-white font-medium">{selectedSip.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Target Date:</span>
                  <span className="text-white font-mono">
                    {new Date(selectedPeriod.targetDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-[#8A8F98]">Amount:</span>
                  <span className="text-emerald-400 font-mono font-semibold text-sm">
                    {formatCurrency(selectedSip.amount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  disabled={confirmLoading}
                  onClick={() => {
                    setConfirmModalOpen(false);
                    setSelectedSip(null);
                    setSelectedPeriod(null);
                  }}
                  className="btn-linear-secondary px-4 py-2 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmLoading}
                  onClick={handleConfirmPayment}
                  className="btn-linear-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {confirmLoading ? 'Confirming...' : 'Confirm & Log'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {paidTxModalOpen && selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[#0a0a0c] p-6 border border-white/10 rounded-2xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">SIP Transaction Detail</h3>
                  <p className="text-[#8A8F98] text-xs mt-0.5">
                    This cycle has been logged and synchronized in your passbook.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-[#050506] border border-white/[0.06] rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Title:</span>
                  <span className="text-white font-medium">{selectedTx.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Date:</span>
                  <span className="text-white font-mono">
                    {new Date(selectedTx.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-[#8A8F98]">Amount:</span>
                  <span className="text-emerald-400 font-mono font-semibold text-sm">
                    {formatCurrency(selectedTx.amount)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaidTxModalOpen(false);
                    setSelectedTx(null);
                  }}
                  className="btn-linear-primary px-4 py-2 text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="border-t border-white/[0.06] py-6 bg-[#020203]">
        <div className="max-w-7xl mx-auto px-6 text-[#8A8F98] text-xs text-center font-mono">
          © {new Date().getFullYear()} MonthlyMoney • SIP & Wealth Management
        </div>
      </footer>
    </div>
  );
}
