'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
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
  const [frequency, setFrequency] = useState('MONTHLY'); // MONTHLY, WEEKLY
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1); // 1 = Mon, ..., 7 = Sun
  const [reminderTime, setReminderTime] = useState('10:00');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedSip, setSelectedSip] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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
        const data = await res.json();
        setSips(data);
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
        alert('Failed to confirm SIP payment');
      }
    } catch (err) {
      console.error('Error logging payment:', err);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Format Currency
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate totals
  const totalMonthlySip = sips
    .filter(s => s.isActive && s.frequency === 'MONTHLY')
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const totalWeeklySip = sips
    .filter(s => s.isActive && s.frequency === 'WEEKLY')
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const totalActiveSips = sips.filter(s => s.isActive).length;

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 text-left">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Coins className="w-8 h-8 text-violet-400" /> SIP Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Manage your Systematic Investment Plans, log transactions, and track savings timelines.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-glow flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all text-sm cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> {showAddForm ? 'Close Form' : 'Add New SIP'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border border-white/5 flex items-center gap-4"
          >
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Plans</div>
              <div className="text-2xl font-black text-white mt-0.5">{totalActiveSips}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-6 border border-white/5 flex items-center gap-4"
          >
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Monthly SIP Target</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">{formatCurrency(totalMonthlySip)}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 border border-white/5 flex items-center gap-4"
          >
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Weekly SIP Target</div>
              <div className="text-2xl font-black text-blue-400 mt-0.5">{formatCurrency(totalWeeklySip)}</div>
            </div>
          </motion.div>
        </div>

        {/* Creator Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <form onSubmit={handleCreateSip} className="glass-card p-6 border border-white/10 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  Create New Savings SIP Flow
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      SIP Title / Transaction Title Match
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Navi Mutual Fund"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 font-semibold"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Monthly/Weekly Amount
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 font-semibold"
                    />
                  </div>

                  {/* Frequency */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 font-semibold text-sm"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>

                  {/* Day Picker */}
                  {frequency === 'MONTHLY' ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Day of Month (1 - 31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 font-semibold text-sm"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Day of Week
                      </label>
                      <select
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 font-semibold text-sm"
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

                  {/* Notification Timing */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Notification Time (Local Time)
                    </label>
                    <input
                      type="time"
                      required
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 font-semibold text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-5 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl font-bold transition-all text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Create SIP'}
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
              <div key={n} className="h-44 bg-white/5 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : sips.length === 0 ? (
          <div className="glass-card py-20 text-center border border-white/5">
            <Coins className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-30 animate-pulse" />
            <h3 className="text-white text-lg font-bold">No SIP Flows Configured</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Configure a monthly or weekly savings plan to track matching ledger transactions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sips.map((sip) => (
              <motion.div
                key={sip.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border border-white/5 relative overflow-hidden"
              >
                {/* Card Top Details */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                      {sip.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                      <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full uppercase">
                        {sip.frequency}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {sip.frequency === 'MONTHLY' ? `Day ${sip.dayOfMonth} of month` : `Weekly on ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(sip.dayOfWeek || 1) - 1]}`}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Reminder at {sip.reminderTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-emerald-400 tracking-tight">
                      {formatCurrency(sip.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteSip(sip.id)}
                      className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
                      title="Delete SIP Flow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Scrollable Timeline Tracker */}
                <div className="border-t border-white/5 pt-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Click any unpaid cycle to log transaction matching the target date
                  </div>

                  <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-thin">
                    {sip.periods.map((period, idx) => {
                      // Status color configs
                      const iconConfigs = {
                        PAID: {
                          bg: 'bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/50',
                          textColor: 'text-emerald-400',
                          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
                          statusText: 'Paid'
                        },
                        MISSED: {
                          bg: 'bg-rose-500/25 border-rose-500/40 hover:border-rose-500/60 animate-pulse',
                          textColor: 'text-rose-400 font-extrabold',
                          icon: <XCircle className="w-5 h-5 text-rose-400" />,
                          statusText: 'Missed'
                        },
                        PENDING: {
                          bg: 'bg-slate-500/10 border-slate-500/20 hover:border-slate-500/40',
                          textColor: 'text-slate-400',
                          icon: <AlertCircle className="w-5 h-5 text-slate-400" />,
                          statusText: 'Pending'
                        }
                      };

                      const config = iconConfigs[period.status];

                      return (
                        <div
                          key={idx}
                          onClick={() => triggerConfirmModal(sip, period)}
                          className={`flex flex-col items-center min-w-[72px] p-2.5 rounded-xl border transition-all select-none ${period.status !== 'PAID' ? 'cursor-pointer active:scale-95' : 'cursor-default'} ${config.bg}`}
                        >
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                            {period.label}
                          </span>
                          <div className="mb-1">{config.icon}</div>
                          <span className={`text-[10px] ${config.textColor} font-semibold uppercase tracking-wider mt-1`}>
                            {config.statusText}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 border border-white/10 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Confirm SIP Transaction</h3>
                  <p className="text-slate-400 text-sm mt-1.5 leading-relaxed font-medium">
                    This will create a new savings transaction in your passbook, logging the SIP payment.
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">SIP Title:</span>
                  <span className="text-white font-bold">{selectedSip.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Category:</span>
                  <span className="text-amber-400 font-bold uppercase text-xs border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    SAVINGS
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Cycle Target Date:</span>
                  <span className="text-white font-bold">
                    {new Date(selectedPeriod.targetDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-white/5">
                  <span className="text-slate-400 font-bold">Amount:</span>
                  <span className="text-emerald-400 font-black text-base">
                    {formatCurrency(selectedSip.amount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={confirmLoading}
                  onClick={() => {
                    setConfirmModalOpen(false);
                    setSelectedSip(null);
                    setSelectedPeriod(null);
                  }}
                  className="px-5 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl font-bold transition-all text-sm cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmLoading}
                  onClick={handleConfirmPayment}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {confirmLoading ? 'Confirming...' : 'Confirm & Log'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-xs text-center font-medium">
          © {new Date().getFullYear()} Manage Monthly Money. Systematic Investment Plan Ledger.
        </div>
      </footer>
    </div>
  );
}
