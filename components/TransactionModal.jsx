'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Coins, Calendar, Info, Sparkles, Check } from 'lucide-react';

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TransactionModal({
  isOpen,
  onClose,
  entryToEdit = null,
  parentLending = null,
  onSuccess,
  user,
  monthsList = [],
  formatCurrency
}) {
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('SPENDING');
  const [useSalaryBalance, setUseSalaryBalance] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState('');
  const [salaryYear, setSalaryYear] = useState('');
  const [date, setDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Autocomplete Suggestions
  const [pastEntries, setPastEntries] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  // Split Deduction popup/view state
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [insufficientInfo, setInsufficientInfo] = useState(null);
  const [checkedMonths, setCheckedMonths] = useState([]); // Array of keys "year-month"

  // Fetch historical entries for autofill suggestions
  useEffect(() => {
    if (isOpen) {
      const fetchPastEntries = async () => {
        try {
          const res = await fetch('/api/entries');
          if (res.ok) {
            const list = await res.json();
            setPastEntries(list);
          }
        } catch (err) {
          console.error('Error fetching past entries for autocomplete:', err);
        }
      };
      fetchPastEntries();
    }
  }, [isOpen]);

  // Reset/Initialize fields when modal opens/changes
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSplitViewOpen(false);
      setInsufficientInfo(null);
      setCheckedMonths([]);

      if (parentLending) {
        setAmount('');
        setTitle(`Repayment: ${parentLending.title}`);
        setDescription(`Repayment of lending transaction`);
        setType('ADVANCE');
        setUseSalaryBalance(!!parentLending.useSalaryBalance);
        setSalaryMonth(parentLending.salaryMonth ? parentLending.salaryMonth.toString() : (new Date().getMonth() + 1).toString());
        setSalaryYear(parentLending.salaryYear ? parentLending.salaryYear.toString() : new Date().getFullYear().toString());
        setDate(new Date().toISOString().split('T')[0]);
      } else if (entryToEdit) {
        setAmount(entryToEdit.amount ? entryToEdit.amount.toString() : '');
        setTitle(entryToEdit.title || '');
        setDescription(entryToEdit.description || '');
        setType(entryToEdit.type || 'SPENDING');
        setUseSalaryBalance(!!entryToEdit.useSalaryBalance);
        setSalaryMonth(entryToEdit.salaryMonth ? entryToEdit.salaryMonth.toString() : (new Date().getMonth() + 1).toString());
        setSalaryYear(entryToEdit.salaryYear ? entryToEdit.salaryYear.toString() : new Date().getFullYear().toString());
        
        const entryDate = entryToEdit.date ? new Date(entryToEdit.date) : new Date();
        const dateStr = entryDate.toISOString().split('T')[0];
        setDate(dateStr);
      } else {
        setAmount('');
        setTitle('');
        setDescription('');
        setType('SPENDING');
        setUseSalaryBalance(false);
        setSalaryMonth((new Date().getMonth() + 1).toString());
        setSalaryYear(new Date().getFullYear().toString());
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, entryToEdit, parentLending]);

  // Autocomplete Filter
  useEffect(() => {
    if (!title.trim() || pastEntries.length === 0) {
      setFilteredSuggestions([]);
      return;
    }

    const query = title.trim().toLowerCase();
    const suggestionsMap = {};

    for (const entry of pastEntries) {
      const etitle = entry.title.trim();
      const key = etitle.toLowerCase();
      if (key.includes(query) && etitle !== title) {
        if (!suggestionsMap[key] || new Date(entry.date) > new Date(suggestionsMap[key].date)) {
          suggestionsMap[key] = entry;
        }
      }
    }

    const list = Object.values(suggestionsMap)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    setFilteredSuggestions(list);
  }, [title, pastEntries]);

  const handleSelectSuggestion = (suggestion) => {
    setTitle(suggestion.title);
    setAmount(parseFloat(suggestion.amount).toString());
    setType(suggestion.type);
    setUseSalaryBalance(!!suggestion.useSalaryBalance);
    if (suggestion.salaryMonth) setSalaryMonth(suggestion.salaryMonth.toString());
    if (suggestion.salaryYear) setSalaryYear(suggestion.salaryYear.toString());
    setShowSuggestions(false);
  };

  // Split deduction helper allocations
  const calculateAllocations = () => {
    if (!insufficientInfo) return { allocations: [], remaining: 0 };

    const targetAmount = parseFloat(amount);
    const primaryMonthVal = parseInt(salaryMonth);
    const primaryYearVal = parseInt(salaryYear);

    // Primary month balance info
    const primaryMonthBalInfo = insufficientInfo.availableBalances.find(
      b => b.month === primaryMonthVal && b.year === primaryYearVal
    );

    const primarySalaryRem = primaryMonthBalInfo ? primaryMonthBalInfo.salary.remaining : 0;
    const primaryBonusRem = primaryMonthBalInfo ? primaryMonthBalInfo.bonus.remaining : 0;
    const primaryTotalAvailable = primarySalaryRem + primaryBonusRem;

    // Deduct from primary month first
    const primaryAllocated = Math.min(targetAmount, primaryTotalAvailable);
    let remainingToAllocate = targetAmount - primaryAllocated;

    const allocations = [
      {
        month: primaryMonthVal,
        year: primaryYearVal,
        amount: primaryAllocated,
        isPrimary: true
      }
    ];

    // Distribute among checked other months
    for (const key of checkedMonths) {
      if (remainingToAllocate <= 0) break;

      const [y, m] = key.split('-').map(Number);
      if (m === primaryMonthVal && y === primaryYearVal) continue; // Skip primary

      const mBal = insufficientInfo.availableBalances.find(b => b.month === m && b.year === y);
      if (!mBal) continue;

      const avail = mBal.salary.remaining + mBal.bonus.remaining;
      if (avail <= 0) continue;

      const allocAmt = Math.min(remainingToAllocate, avail);
      allocations.push({
        month: m,
        year: y,
        amount: allocAmt,
        isPrimary: false
      });
      remainingToAllocate -= allocAmt;
    }

    return { allocations, remaining: remainingToAllocate };
  };

  const { allocations: computedAllocations, remaining: remainingToAllocate } = calculateAllocations();

  const toggleCheckedMonth = (key) => {
    if (checkedMonths.includes(key)) {
      setCheckedMonths(checkedMonths.filter(k => k !== key));
    } else {
      setCheckedMonths([...checkedMonths, key]);
    }
  };

  // Submit handler
  const handleSubmit = async (e, explicitDeductions = null) => {
    if (e) e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = {
        amount: parseFloat(amount),
        title: title.trim(),
        description: description.trim(),
        type,
        useSalaryBalance,
        date: date ? new Date(date) : new Date(),
      };

      if (parentLending) {
        payload.parentEntryId = parentLending.id;
      }

      if (entryToEdit) {
        payload.id = entryToEdit.id;
      }

      if (useSalaryBalance) {
        if (explicitDeductions) {
          payload.deductions = explicitDeductions;
        } else {
          payload.salaryMonth = parseInt(salaryMonth);
          payload.salaryYear = parseInt(salaryYear);
        }
      }

      const method = entryToEdit ? 'PUT' : 'POST';
      const res = await fetch('/api/entries', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        if (data.error === 'INSUFFICIENT_BALANCE') {
          // Trigger split view
          setInsufficientInfo({
            selectedMonth: salaryMonth,
            requiredAmount: parseFloat(amount),
            availableBalances: data.availableBalances
          });
          setSplitViewOpen(true);
        } else {
          setError(data.error || 'Failed to save transaction.');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
          {/* Fading backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm cursor-pointer z-0"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full md:max-w-md bg-[#0b0f19] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[92vh] md:max-h-[85vh] z-10 flex flex-col justify-between text-left"
          >
            {/* Split view: Insufficient Balance Selector */}
            {splitViewOpen ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-400" /> Insufficient Balance
                  </h3>
                  <button
                    onClick={() => setSplitViewOpen(false)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    Back
                  </button>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-xs space-y-1.5">
                  <p className="font-extrabold text-orange-400">
                    You don't have enough only in {monthNames[parseInt(salaryMonth)]}.
                  </p>
                  <p className="text-slate-400">
                    Transaction amount: <strong className="text-white">{formatCurrency(parseFloat(amount))}</strong>.
                  </p>
                  <p className="text-slate-400">
                    Please select one or more other months to deduct the remaining{' '}
                    <strong className="text-white">{formatCurrency(remainingToAllocate)}</strong> from:
                  </p>
                </div>

                {/* List of other months with balance */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {insufficientInfo?.availableBalances
                    .filter(b => !(b.month === parseInt(salaryMonth) && b.year === parseInt(salaryYear)))
                    .map(b => {
                      const key = `${b.year}-${b.month}`;
                      const isChecked = checkedMonths.includes(key);
                      const totalAvail = b.salary.remaining + b.bonus.remaining;

                      return (
                        <div
                          key={key}
                          onClick={() => toggleCheckedMonth(key)}
                          className={`p-3 bg-slate-900/60 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                            isChecked ? 'border-violet-500/50 bg-violet-600/5' : 'border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isChecked ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/20 bg-transparent'
                            }`}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {monthNames[b.month]} {b.year}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Salary: {formatCurrency(b.salary.remaining)} | Bonus: {formatCurrency(b.bonus.remaining)}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black text-emerald-400">
                            {formatCurrency(totalAvail)}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* Allocation breakdown */}
                <div className="bg-slate-950/40 p-4 border border-white/5 rounded-xl space-y-2 text-xs">
                  <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider mb-2">
                    Deduction Allocation
                  </h4>
                  {computedAllocations.map((a, index) => (
                    <div key={index} className="flex justify-between items-center text-slate-300">
                      <span>
                        {monthNames[a.month]} {a.year} {a.isPrimary ? '(Selected)' : ''}
                      </span>
                      <span className="font-bold text-white">
                        {formatCurrency(a.amount)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-white/5 pt-2 mt-2 flex justify-between items-center font-extrabold">
                    <span className="text-slate-400">Remaining to Allocate</span>
                    <span className={remainingToAllocate > 0.01 ? 'text-red-400' : 'text-emerald-400'}>
                      {formatCurrency(remainingToAllocate)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSplitViewOpen(false)}
                    className="flex-1 py-3 bg-slate-900 border border-white/10 hover:bg-slate-850 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit(null, computedAllocations)}
                    disabled={loading || remainingToAllocate > 0.01}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl font-bold text-sm transition-all btn-glow shadow-lg shadow-violet-600/20 flex items-center justify-center cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      'Confirm & Log'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Main View: Form Inputs
              <div>
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-5">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-violet-400" />
                    {parentLending ? 'Receive Repayment' : entryToEdit ? 'Edit Transaction' : 'Log Financial Entry'}
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/5 border border-transparent hover:border-white/10 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {parentLending && (
                    <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl text-xs space-y-1">
                      <p className="font-extrabold text-blue-400">Lending Repayment</p>
                      <p className="text-slate-350">
                        Lent Amount: <strong className="text-white">{formatCurrency(parseFloat(parentLending.amount))}</strong>
                      </p>
                      <p className="text-slate-350">
                        Unpaid Balance: <strong className="text-emerald-400">{formatCurrency(parentLending.unpaidAmount)}</strong>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                          {user?.currency || '$'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-all font-semibold"
                          required
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Entry Type */}
                  {!parentLending && (
                    <div>
                      <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Entry Type</label>
                      <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-950/50 border border-white/5 rounded-xl">
                        {['SPENDING', 'LENDING', 'LOAN', 'ADVANCE', 'SAVINGS'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                              type === t
                                ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title / Description */}
                  <div className="relative">
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="e.g. Groceries, Bike Loan, John Dinner"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-all"
                      autoComplete="off"
                      required
                    />

                    {/* Suggestions Box */}
                    <AnimatePresence>
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 mt-1 bg-[#111827] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[120] divide-y divide-white/[0.04]"
                        >
                          {filteredSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(suggestion)}
                              className="w-full px-4 py-3 text-left hover:bg-violet-600/10 text-xs flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-white block truncate">{suggestion.title}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mt-0.5">
                                  {suggestion.type}
                                </span>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300">
                                <span>Autofill</span>
                                <span className="text-[11px] font-black text-violet-400">
                                  {formatCurrency(parseFloat(suggestion.amount))}
                                </span>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add description..."
                      rows="2"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-all resize-none"
                    />
                  </div>

                  {!parentLending ? (
                    <div className="p-4 bg-slate-950/30 border border-white/5 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="modalUseSalaryCheckbox"
                          checked={useSalaryBalance}
                          onChange={(e) => setUseSalaryBalance(e.target.checked)}
                          className="w-4 h-4 accent-violet-600 cursor-pointer"
                        />
                        <label htmlFor="modalUseSalaryCheckbox" className="text-xs font-bold text-white cursor-pointer select-none">
                          Use Salary Balance (Deduct from Salary)
                        </label>
                      </div>

                      {useSalaryBalance && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                          <div>
                            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Deduct Month</label>
                            <select
                              value={salaryMonth}
                              onChange={(e) => setSalaryMonth(e.target.value)}
                              className="w-full px-3 py-2 bg-[#0b0f19] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-violet-500"
                            >
                              {monthsList.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Deduct Year</label>
                            <input
                              type="number"
                              value={salaryYear}
                              onChange={(e) => setSalaryYear(e.target.value)}
                              className="w-full px-3 py-2 bg-[#0b0f19] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-violet-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    parentLending.useSalaryBalance && (
                      <div className="p-4 bg-slate-950/30 border border-white/5 rounded-xl space-y-1 text-xs text-slate-400">
                        <span className="font-bold text-white block mb-1">Salary Refund Details</span>
                        This repayment will credit back to the salary month of the original lending transaction: <strong className="text-white">{parentLending.salaryMonth}/{parentLending.salaryYear}</strong>.
                      </div>
                    )
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-bold text-sm transition-all btn-glow shadow-lg shadow-violet-600/20 cursor-pointer flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : parentLending ? (
                      'Log Repayment'
                    ) : entryToEdit ? (
                      'Save Changes'
                    ) : (
                      'Log Transaction'
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
