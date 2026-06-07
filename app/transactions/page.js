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
  Plus
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
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, SPENDING, LENDING, LOAN, ADVANCE

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

  // Handle Delete Entry
  const handleDeleteEntry = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction permanently?')) return;
    try {
      const res = await fetch(`/api/entries?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchEntries();
      } else if (res.status === 401) {
        console.warn('Session expired (401), redirecting to login.');
        logout();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Filter and search entries client-side
  const filteredEntries = entries.filter(e => {
    const titleMatch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = (e.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return titleMatch || descMatch;
  });

  // Group entries month-wise for collapsible history
  // Groups by date month/year
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

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">

        {/* Row 1: Header Titles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <ReceiptText className="w-8 h-8 text-violet-400" /> E-Passbook
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Browse, search, and manage your complete historical ledger.</p>
          </div>

          {/* Search and Type Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search description..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 font-medium"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
            </div>

            {/* Selector Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 font-semibold w-full sm:w-auto"
            >
              <option value="ALL">All Transactions</option>
              <option value="SPENDING">Spendings</option>
              <option value="LENDING">Lendings</option>
              <option value="LOAN">Loans</option>
              <option value="ADVANCE">Advances</option>
              <option value="SAVINGS">Savings / SIPs</option>
            </select>
          </div>
        </div>

        {/* Row 2: Grouped Month-wise Passbook History list */}
        {loadingEntries ? (
          <div className="space-y-6">
            {[1, 2].map(n => (
              <div key={n} className="space-y-3">
                <div className="w-32 h-6 bg-white/5 rounded animate-pulse"></div>
                <div className="glass-card p-6 border border-white/5 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedEntries).length === 0 ? (
          <div className="glass-card py-20 text-center border border-white/5">
            <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-30 animate-pulse" />
            <h3 className="text-white text-lg font-bold">No Transactions Found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              We couldn't find any financial entries matching your criteria. Try adding some records on the dashboard first!
            </p>
          </div>
        ) : (
          <div className="space-y-8 text-left">
            {Object.entries(groupedEntries).map(([monthKey, list], groupIdx) => (
              <motion.div
                key={monthKey}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: groupIdx * 0.05 }}
                className="space-y-3"
              >
                {/* Month/Year Section Header */}
                <h3 className="text-md font-extrabold text-violet-400 flex items-center gap-2 px-1">
                  <Calendar className="w-4 h-4" /> {monthKey}
                  <span className="text-[10px] bg-slate-950/60 border border-white/10 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase tracking-wider">
                    {list.length} {list.length === 1 ? 'record' : 'records'}
                  </span>
                </h3>

                {/* Collapsible glassmorphic ledger table */}
                <div className="glass-card border border-white/5 p-4 sm:p-6 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <th className="pb-3">Title</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3 text-right">Amount</th>
                          <th className="pb-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {list.map((entry) => {
                          const typeConfigs = {
                            SPENDING: { text: 'text-rose-400 bg-rose-500/10 border-rose-500/20', sign: '-' },
                            LENDING: { text: 'text-blue-400 bg-blue-500/10 border-blue-500/20', sign: '-' },
                            LOAN: { text: 'text-orange-400 bg-orange-500/10 border-orange-500/20', sign: '+' },
                            ADVANCE: { text: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', sign: '+' },
                            SAVINGS: { text: 'text-amber-400 bg-amber-500/10 border-amber-500/20', sign: '-' },
                          };
                          const conf = typeConfigs[entry.type];

                          return (
                            <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3.5 pr-2">
                                <div className="font-bold text-white text-sm">{entry.title}</div>
                                {entry.description && (
                                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5 max-w-sm truncate">
                                    {entry.description}
                                  </div>
                                )}
                                {entry.type === 'LENDING' && (
                                  <div className="text-[10px] font-semibold mt-0.5">
                                    {entry.unpaidAmount === 0 ? (
                                      <span className="text-emerald-400">✓ Fully Repaid</span>
                                    ) : (
                                      <span className="text-slate-400">Unpaid: <strong className="text-blue-400">{formatCurrency(entry.unpaidAmount)}</strong></span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 pr-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${conf.text}`}>
                                  {entry.type}
                                </span>
                                {entry.useSalaryBalance && (
                                  <span className="block text-[8px] text-slate-500 mt-1 font-semibold">
                                    Deducted from Salary ({entry.salaryMonth}/{entry.salaryYear})
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 pr-2 text-xs text-slate-400 font-semibold">
                                {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className={`py-3.5 pr-2 text-right font-black tracking-tight text-md ${entry.type === 'SPENDING' || entry.type === 'LENDING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {conf.sign}{formatCurrency(entry.amount)}
                              </td>
                              <td className="py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {entry.type === 'LENDING' && entry.unpaidAmount > 0 && (
                                    <button
                                      onClick={() => {
                                        setParentLending(entry);
                                        setEntryModalOpen(true);
                                      }}
                                      title="Receive Repayment"
                                      className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded-xl transition-all cursor-pointer active:scale-90 flex items-center justify-center"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEntryToEdit(entry);
                                      setEntryModalOpen(true);
                                    }}
                                    className="p-2 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 rounded-xl transition-all cursor-pointer active:scale-90"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-xs text-center font-medium">
          © {new Date().getFullYear()} Manage Monthly Money. Collapsible Passbook System.
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
