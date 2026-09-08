'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import TransactionModal from '@/components/TransactionModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReceiptText,
  Search,
  Filter,
  Trash2,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowRightLeft,
  AlertCircle,
  HelpCircle,
  PiggyBank,
  TrendingUp,
  X,
  Pencil,
  Plus,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  Check
} from 'lucide-react';

const monthsList = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' },
];

export default function Transactions() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Transactions State
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [parentLending, setParentLending] = useState(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch all transactions
  const fetchEntries = async () => {
    if (!user) return;
    setLoadingEntries(true);
    try {
      let url = '/api/entries';
      if (typeFilter !== 'ALL') {
        url += `?type=${typeFilter}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const payload = await res.json();
        setEntries(payload);
      } else if (res.status === 401) {
        console.warn('Session expired (401), redirecting to login.');
        logout();
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user, typeFilter]);

  // Handle Single Delete Entry
  const handleDeleteEntry = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction permanently?')) return;
    try {
      const res = await fetch(`/api/entries?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedIds(prev => prev.filter(i => i !== id));
        await fetchEntries();
      } else if (res.status === 401) {
        console.warn('Session expired (401), redirecting to login.');
        logout();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Handle Multi-Select Delete
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0 || isDeletingBatch) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected transaction${selectedIds.length === 1 ? '' : 's'} permanently?`)) return;

    setIsDeletingBatch(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        setSelectedIds([]);
        await fetchEntries();
      } else if (res.status === 401) {
        console.warn('Session expired (401), redirecting to login.');
        logout();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to delete selected transactions.');
      }
    } catch (err) {
      console.error('Batch delete error:', err);
      alert('Error occurred during batch deletion.');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Multi-select helpers
  const toggleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectGroup = (groupEntries) => {
    const groupIds = groupEntries.map(e => e.id);
    const allGroupSelected = groupIds.every(id => selectedIds.includes(id));

    if (allGroupSelected) {
      setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const toggleSelectAllFiltered = (allFiltered) => {
    const filteredIds = allFiltered.map(e => e.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#5E6AD2] rounded-full animate-spin" />
      </div>
    );
  }

  // Filter and search entries client-side
  const filteredEntries = entries.filter(e => {
    const titleMatch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = (e.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return titleMatch || descMatch;
  });

  // Calculate sum of selected transactions
  const selectedEntriesList = entries.filter(e => selectedIds.includes(e.id));
  const selectedTotalAmount = selectedEntriesList.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Group entries month-wise for collapsible history
  const groupedEntries = {};
  filteredEntries.forEach(entry => {
    const d = new Date(entry.date);
    const key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!groupedEntries[key]) {
      groupedEntries[key] = [];
    }
    groupedEntries[key].push(entry);
  });

  const formatCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(val || 0);
  };

  const isAllFilteredSelected = filteredEntries.length > 0 && filteredEntries.every(e => selectedIds.includes(e.id));

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#050506] text-[#EDEDEF]">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 pb-28">

        {/* Header Titles & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight flex items-center gap-2.5">
              <ReceiptText className="w-7 h-7 text-[#818cf8]" /> E-Passbook
            </h1>
            <p className="text-[#8A8F98] text-xs mt-1">Audit, search, multi-select, and manage your complete historical ledger entries.</p>
          </div>

          {/* Search and Type Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ledger..."
                className="w-full pl-8 pr-3 py-2 bg-[#0a0a0c] border border-white/10 rounded-lg text-xs text-white placeholder-[#8A8F98]/50 focus:outline-none focus:border-[#5E6AD2]"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#8A8F98]" />
            </div>

            {/* Selector Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5E6AD2] font-medium w-full sm:w-auto cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="SPENDING">Spendings</option>
              <option value="LENDING">Lendings</option>
              <option value="LOAN">Loans</option>
              <option value="ADVANCE">Advances</option>
              <option value="SAVINGS">Savings / SIPs</option>
            </select>

            {/* Select All Filtered Toggle */}
            {filteredEntries.length > 0 && (
              <button
                type="button"
                onClick={() => toggleSelectAllFiltered(filteredEntries)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isAllFilteredSelected
                    ? 'bg-[#5E6AD2]/20 border-[#5E6AD2] text-white'
                    : 'bg-[#0a0a0c] border-white/10 text-[#8A8F98] hover:text-white hover:border-white/20'
                }`}
              >
                {isAllFilteredSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-[#818cf8]" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Select All ({filteredEntries.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Grouped Month-wise Passbook History list */}
        {loadingEntries ? (
          <div className="space-y-6">
            {[1, 2].map(n => (
              <div key={n} className="space-y-3">
                <div className="w-32 h-5 bg-white/5 rounded animate-pulse" />
                <div className="glass-card p-6 border border-white/[0.06] space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedEntries).length === 0 ? (
          <div className="glass-card py-16 text-center border border-white/[0.06] rounded-2xl">
            <Wallet className="w-8 h-8 text-[#8A8F98] mx-auto mb-3 opacity-30" />
            <h3 className="text-white text-sm font-semibold">No Transactions Found</h3>
            <p className="text-[#8A8F98] text-xs mt-1 max-w-sm mx-auto">
              No entries match your search query or filter.
            </p>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            {Object.entries(groupedEntries).map(([monthKey, list], groupIdx) => {
              const allMonthSelected = list.length > 0 && list.every(e => selectedIds.includes(e.id));
              const someMonthSelected = list.some(e => selectedIds.includes(e.id)) && !allMonthSelected;

              return (
                <motion.div
                  key={monthKey}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: groupIdx * 0.04 }}
                  className="space-y-2.5"
                >
                  {/* Month/Year Section Header with Batch Select Toggle */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectGroup(list)}
                        className="text-[#8A8F98] hover:text-white transition-colors cursor-pointer p-0.5"
                        title={allMonthSelected ? "Deselect this month" : "Select all in this month"}
                      >
                        {allMonthSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#818cf8]" />
                        ) : someMonthSelected ? (
                          <MinusSquare className="w-4 h-4 text-[#818cf8]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#818cf8]" /> {monthKey}
                      </h3>
                      <span className="text-[10px] bg-white/[0.04] border border-white/[0.06] px-2 py-0.2 rounded-full text-[#8A8F98] font-mono">
                        {list.length} {list.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-[#8A8F98]">
                      {list.filter(e => selectedIds.includes(e.id)).length > 0 && (
                        <span className="text-[#818cf8] font-semibold">
                          {list.filter(e => selectedIds.includes(e.id)).length} selected
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Ledger table */}
                  <div className="glass-card p-4 sm:p-5 border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#8A8F98]">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-[#8A8F98] text-[10px] font-mono uppercase tracking-widest">
                            <th className="pb-3 w-8 text-center">
                              <span className="sr-only">Select</span>
                            </th>
                            <th className="pb-3">Title</th>
                            <th className="pb-3">Category</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3 text-right">Amount</th>
                            <th className="pb-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {list.map((entry) => {
                            const isSelected = selectedIds.includes(entry.id);
                            const typeConfigs = {
                              SPENDING: { text: 'text-rose-400 bg-rose-500/10 border-rose-500/20', sign: '-' },
                              LENDING: { text: 'text-blue-400 bg-blue-500/10 border-blue-500/20', sign: '-' },
                              LOAN: { text: 'text-orange-400 bg-orange-500/10 border-orange-500/20', sign: '+' },
                              ADVANCE: { text: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', sign: '+' },
                              SAVINGS: { text: 'text-amber-400 bg-amber-500/10 border-amber-500/20', sign: '-' },
                            };
                            const conf = typeConfigs[entry.type] || { text: 'text-[#8A8F98] bg-white/5 border-white/10', sign: '' };

                            return (
                              <tr
                                key={entry.id}
                                className={`transition-colors group ${
                                  isSelected
                                    ? 'bg-[#5E6AD2]/10 hover:bg-[#5E6AD2]/15'
                                    : 'hover:bg-white/[0.02]'
                                }`}
                              >
                                <td className="py-3 pr-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectOne(entry.id)}
                                    className="w-4 h-4 rounded border-white/20 bg-[#0a0a0c] text-[#5E6AD2] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#5E6AD2]"
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <div className="font-medium text-white group-hover:text-[#EDEDEF]">{entry.title}</div>
                                  {entry.description && (
                                    <div className="text-[10px] text-[#8A8F98] mt-0.5 max-w-sm truncate">
                                      {entry.description}
                                    </div>
                                  )}
                                  {entry.type === 'LENDING' && (
                                    <div className="text-[10px] mt-0.5">
                                      {entry.unpaidAmount === 0 ? (
                                        <span className="text-emerald-400 font-medium">✓ Fully Repaid</span>
                                      ) : (
                                        <span className="text-[#8A8F98]">Unpaid: <strong className="text-blue-400">{formatCurrency(entry.unpaidAmount)}</strong></span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 pr-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border uppercase tracking-wider ${conf.text}`}>
                                    {entry.type}
                                  </span>
                                  {entry.useSalaryBalance && (
                                    <span className="block text-[8px] text-[#8A8F98] mt-0.5 font-mono">
                                      Deducted ({entry.salaryMonth}/{entry.salaryYear})
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 pr-2 text-[11px] text-[#8A8F98] font-mono">
                                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className={`py-3 pr-2 text-right font-mono font-medium text-xs sm:text-sm ${entry.type === 'SPENDING' || entry.type === 'LENDING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {conf.sign}{formatCurrency(entry.amount)}
                                </td>
                                <td className="py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {entry.type === 'LENDING' && entry.unpaidAmount > 0 && (
                                      <button
                                        onClick={() => {
                                          setParentLending(entry);
                                          setEntryModalOpen(true);
                                        }}
                                        title="Receive Repayment"
                                        className="p-1.5 text-[#8A8F98] hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setEntryToEdit(entry);
                                        setEntryModalOpen(true);
                                      }}
                                      className="p-1.5 text-[#8A8F98] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="p-1.5 text-[#8A8F98] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Multi-Select Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/15 shadow-[0_15px_50px_rgba(0,0,0,0.85)] p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left"
          >
            {/* Left Selection Info */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="w-8 h-8 rounded-xl bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 text-[#8B95F6] flex items-center justify-center font-bold text-xs shrink-0">
                {selectedIds.length}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  {selectedIds.length} {selectedIds.length === 1 ? 'transaction' : 'transactions'} selected
                </div>
                <div className="text-[11px] text-[#8A8F98] font-mono">
                  Total: <strong className="text-emerald-400 font-bold">{formatCurrency(selectedTotalAmount)}</strong>
                </div>
              </div>

              {/* Clear button on mobile */}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="sm:hidden p-1.5 text-[#8A8F98] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="hidden sm:inline-flex px-3 py-2 bg-white/5 hover:bg-white/10 text-[#8A8F98] hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={handleDeleteSelected}
                className="w-full sm:w-auto px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-lg shadow-rose-950/40"
              >
                {isDeletingBatch ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting {selectedIds.length}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-6 bg-[#020203]">
        <div className="max-w-7xl mx-auto px-6 text-[#8A8F98] text-xs text-center font-mono">
          © {new Date().getFullYear()} MonthlyMoney. Historical Audit Ledger.
        </div>
      </footer>

      <TransactionModal
        isOpen={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false);
          setEntryToEdit(null);
          setParentLending(null);
        }}
        entryToEdit={entryToEdit}
        parentLending={parentLending}
        onSuccess={fetchEntries}
        user={user}
        monthsList={monthsList}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
