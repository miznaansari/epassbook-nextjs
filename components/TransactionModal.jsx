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
  const [checkedMonths, setCheckedMonths] = useState([]);

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
    setSalaryMonth((new Date().getMonth() + 1).toString());
    setSalaryYear(new Date().getFullYear().toString());
    setShowSuggestions(false);
  };

  // Split deduction helper allocations
  const calculateAllocations = () => {
    if (!insufficientInfo) return { allocations: [], remaining: 0 };

    const targetAmount = parseFloat(amount);
    const primaryMonthVal = parseInt(salaryMonth);
    const primaryYearVal = parseInt(salaryYear);

    const primaryMonthBalInfo = insufficientInfo.availableBalances.find(
      b => b.month === primaryMonthVal && b.year === primaryYearVal
    );

    const primarySalaryRem = primaryMonthBalInfo ? primaryMonthBalInfo.salary.remaining : 0;
    const primaryBonusRem = primaryMonthBalInfo ? primaryMonthBalInfo.bonus.remaining : 0;
    const primaryTotalAvailable = primarySalaryRem + primaryBonusRem;

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

    for (const key of checkedMonths) {
      if (remainingToAllocate <= 0) break;

      const [y, m] = key.split('-').map(Number);
      if (m === primaryMonthVal && y === primaryYearVal) continue;

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

      if (res.ok) {
        onSuccess?.();
        onClose?.();
      } else {
        const errData = await res.json();
        if (res.status === 409 && errData.insufficientInfo) {
          setInsufficientInfo(errData.insufficientInfo);
          setSplitViewOpen(true);
        } else {
          setError(errData.error || 'Failed to process transaction.');
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
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer z-0"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full md:max-w-md bg-[#0a0a0c] border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[92vh] md:max-h-[85vh] z-10 flex flex-col justify-between text-left"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Split view: Insufficient Balance Selector */}
            {splitViewOpen ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" /> Insufficient Single Month Balance
                  </h3>
                  <button
                    onClick={() => setSplitViewOpen(false)}
                    className="p-1 text-[#8A8F98] hover:text-white rounded-lg text-xs"
                  >
                    Back
                  </button>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 p-3.5 rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-orange-400">
                    Remaining balance needed: <strong className="text-white">{formatCurrency(remainingToAllocate)}</strong>
                  </p>
                  <p className="text-[#8A8F98]">
                    Select other salary months to distribute this deduction across:
                  </p>
                </div>

                {/* List of other months with balance */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                          className={`p-2.5 bg-[#050506] border rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'border-[#5E6AD2] bg-[#5E6AD2]/10' : 'border-white/[0.06] hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white' : 'border-white/20 bg-transparent'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <div>
                              <span className="text-xs font-medium text-white block">
                                {monthNames[b.month]} {b.year}
                              </span>
                              <span className="text-[10px] text-[#8A8F98]">
                                Available: {formatCurrency(totalAvail)}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-emerald-400">
                            {formatCurrency(totalAvail)}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* Allocation breakdown */}
                <div className="bg-[#050506] p-3.5 border border-white/[0.06] rounded-xl space-y-1.5 text-xs">
                  <h4 className="font-mono text-[#8A8F98] uppercase text-[9px] tracking-wider mb-1.5">
                    Deduction Allocation Plan
                  </h4>
                  {computedAllocations.map((a, index) => (
                    <div key={index} className="flex justify-between items-center text-[#EDEDEF]">
                      <span>
                        {monthNames[a.month]} {a.year} {a.isPrimary ? '(Primary)' : ''}
                      </span>
                      <span className="font-mono font-medium">
                        {formatCurrency(a.amount)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-white/[0.06] pt-2 mt-1.5 flex justify-between items-center font-medium">
                    <span className="text-[#8A8F98]">Remaining to Allocate</span>
                    <span className={remainingToAllocate > 0.01 ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                      {formatCurrency(remainingToAllocate)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setSplitViewOpen(false)}
                    className="btn-linear-secondary flex-1 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit(null, computedAllocations)}
                    disabled={loading || remainingToAllocate > 0.01}
                    className="btn-linear-primary flex-1 py-2 text-xs flex items-center justify-center cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <div className="flex justify-between items-center pb-3 border-b border-white/[0.06] mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#818cf8]" />
                    {parentLending ? 'Receive Repayment' : entryToEdit ? 'Edit Transaction' : 'Log Transaction'}
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-1 text-[#8A8F98] hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={(e) => handleSubmit(e)} className="space-y-3.5">
                  {error && (
                    <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {parentLending && (
                    <div className="bg-blue-600/10 border border-blue-500/20 p-3 rounded-xl text-xs space-y-1">
                      <p className="font-semibold text-blue-400">Lending Repayment</p>
                      <p className="text-[#8A8F98]">
                        Lent: <strong className="text-white">{formatCurrency(parseFloat(parentLending.amount))}</strong> | Unpaid: <strong className="text-emerald-400">{formatCurrency(parentLending.unpaidAmount)}</strong>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {/* Amount */}
                    <div>
                      <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98] font-mono text-xs">
                          {user?.currency || '$'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                          required
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                      />
                    </div>
                  </div>

                  {/* Entry Type */}
                  {!parentLending && (
                    <div>
                      <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Type</label>
                      <div className="grid grid-cols-5 gap-1 p-0.5 bg-[#050506] border border-white/[0.06] rounded-lg">
                        {['SPENDING', 'LENDING', 'LOAN', 'ADVANCE', 'SAVINGS'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`py-1.5 text-[8px] font-mono uppercase rounded-md transition-all cursor-pointer ${
                              type === t
                                ? 'bg-white/[0.1] text-white border border-white/15 shadow-sm'
                                : 'text-[#8A8F98] hover:text-white'
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
                    <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="e.g. Groceries, Coffee, Bike Loan"
                      className="w-full px-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                      autoComplete="off"
                      required
                    />

                    {/* Suggestions Box */}
                    <AnimatePresence>
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute left-0 right-0 mt-1 bg-[#0e0e12] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[130] divide-y divide-white/[0.04]"
                        >
                          {filteredSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(suggestion)}
                              className="w-full px-3 py-2.5 text-left hover:bg-white/[0.04] text-xs flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-medium text-white block truncate">{suggestion.title}</span>
                                <span className="text-[9px] font-mono text-[#8A8F98] uppercase">
                                  {suggestion.type}
                                </span>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-[#818cf8]">
                                <span>Autofill</span>
                                <span>{formatCurrency(parseFloat(suggestion.amount))}</span>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Notes / Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add details (optional)..."
                      rows="2"
                      className="w-full px-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2] resize-none"
                    />
                  </div>

                  {!parentLending ? (
                    <div className="p-3 bg-[#050506] border border-white/[0.06] rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="modalUseSalaryCheckbox"
                          checked={useSalaryBalance}
                          onChange={(e) => setUseSalaryBalance(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#5E6AD2] cursor-pointer"
                        />
                        <label htmlFor="modalUseSalaryCheckbox" className="text-xs font-medium text-white cursor-pointer select-none">
                          Deduct from Salary Balance
                        </label>
                      </div>

                      {useSalaryBalance && (
                        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.04]">
                          <div>
                            <label className="block text-[#8A8F98] text-[9px] font-mono uppercase mb-1">Month</label>
                            <select
                              value={salaryMonth}
                              onChange={(e) => setSalaryMonth(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                            >
                              {monthsList.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[#8A8F98] text-[9px] font-mono uppercase mb-1">Year</label>
                            <input
                              type="number"
                              value={salaryYear}
                              onChange={(e) => setSalaryYear(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    parentLending.useSalaryBalance && (
                      <div className="p-3 bg-[#050506] border border-white/[0.06] rounded-xl text-xs text-[#8A8F98]">
                        Refund will credit back to salary month: <strong className="text-white">{parentLending.salaryMonth}/{parentLending.salaryYear}</strong>.
                      </div>
                    )
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-linear-primary w-full py-2.5 text-xs flex items-center justify-center cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
