'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiggyBank, X } from 'lucide-react';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((name, i) => ({ value: i + 1, name }));

/** Log a salary or bonus for a month; shows a celebration after a salary. */
export default function SalaryModal({ open, onClose, user, onSaved }) {
  const now = new Date();
  const [salaryType, setSalaryType] = useState('SALARY');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const label = salaryType === 'SALARY' ? 'salary' : 'bonus';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError(`Please enter a valid ${label} amount.`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(salaryType === 'SALARY' ? '/api/salary' : '/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), month: parseInt(month), year: parseInt(year) }),
      });
      if (res.ok) {
        setAmount('');
        onClose();
        if (salaryType === 'SALARY' && user?.notifSalary !== false) setCelebrate(true);
        onSaved?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to add ${label}.`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabClass = (active) =>
    `py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      active ? 'bg-indigo-600 text-white shadow-sm' : 'text-ink-2 hover:text-ink'
    }`;
  const fieldClass = 'w-full px-3 py-2 bg-card-2 border border-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Log salary or bonus"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full md:max-w-md bg-card border border-line rounded-t-3xl md:rounded-2xl p-6 shadow-2xl"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-emerald-500" /> Add income
                </h3>
                <button onClick={onClose} aria-label="Close" className="p-1 text-ink-2 hover:text-ink cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 bg-card-2 border border-line rounded-xl mb-4">
                <button type="button" onClick={() => setSalaryType('SALARY')} className={tabClass(salaryType === 'SALARY')}>Salary</button>
                <button type="button" onClick={() => setSalaryType('BONUS')} className={tabClass(salaryType === 'BONUS')}>Bonus / Extra</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-ink-2 text-xs font-medium mb-1.5">
                    {salaryType === 'SALARY' ? 'Salary amount' : 'Bonus amount'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className={fieldClass}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink-2 text-xs font-medium mb-1.5">Month</label>
                    <select value={month} onChange={(e) => setMonth(e.target.value)} className={`${fieldClass} cursor-pointer`}>
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-ink-2 text-xs font-medium mb-1.5">Year</label>
                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={fieldClass} />
                  </div>
                </div>

                {error && <p className="text-xs text-rose-500">{error}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-md disabled:opacity-70"
                >
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : `Save ${label}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCelebrate(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm bg-card border border-emerald-500/30 rounded-2xl p-6 text-center shadow-2xl"
            >
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Salary logged!</h2>
              <p className="text-emerald-500 text-xs mt-1">It&apos;s been added to this cycle&apos;s balance.</p>
              <button
                type="button"
                onClick={() => setCelebrate(false)}
                className="w-full py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white mt-5 cursor-pointer shadow-md"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
