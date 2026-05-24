'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ArrowUpRight, 
  Calendar, 
  ChevronDown, 
  PlusCircle, 
  Trash2, 
  TrendingUp, 
  Wallet, 
  History, 
  AlertCircle,
  HelpCircle,
  PiggyBank,
  ArrowRightLeft,
  X
} from 'lucide-react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Primary Data State
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState('current'); // current, last, last3, last6, custom
  
  // Custom Date Range Pickers
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Modals & Drawers State
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  // Forms State
  // 1. Salary Form
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [salAmount, setSalAmount] = useState('');
  const [salMonth, setSalMonth] = useState(currentMonth);
  const [salYear, setSalYear] = useState(currentYear);
  const [salError, setSalError] = useState('');
  const [salLoading, setSalLoading] = useState(false);

  // 2. Financial Entry Form
  const [entryAmount, setEntryAmount] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryType, setEntryType] = useState('SPENDING'); // SPENDING, LENDING, LOAN, ADVANCE
  const [useSalaryBal, setUseSalaryBal] = useState(false);
  const [deductMonth, setDeductMonth] = useState(currentMonth);
  const [deductYear, setDeductYear] = useState(currentYear);
  const [entryError, setEntryError] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch Dashboard Aggregated Data
  const fetchDashboardData = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      let url = `/api/dashboard?userId=${user.uid}&filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, filter]);

  // Handle Salary Submit
  const handleAddSalary = async (e) => {
    e.preventDefault();
    if (!salAmount || parseFloat(salAmount) <= 0) {
      setSalError('Please enter a valid salary amount.');
      return;
    }
    setSalError('');
    setSalLoading(true);

    try {
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          amount: parseFloat(salAmount),
          month: parseInt(salMonth),
          year: parseInt(salYear),
        }),
      });

      if (res.ok) {
        setSalAmount('');
        setSalaryModalOpen(false);
        await fetchDashboardData();
      } else {
        const errData = await res.json();
        setSalError(errData.error || 'Failed to add salary.');
      }
    } catch (err) {
      setSalError('Network error. Please try again.');
    } finally {
      setSalLoading(false);
    }
  };

  // Handle Financial Entry Submit
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!entryAmount || parseFloat(entryAmount) <= 0) {
      setEntryError('Please enter a valid amount.');
      return;
    }
    if (!entryTitle.trim()) {
      setEntryError('Please enter a title.');
      return;
    }
    setEntryError('');
    setEntryLoading(true);

    try {
      const payload = {
        userId: user.uid,
        amount: parseFloat(entryAmount),
        title: entryTitle.trim(),
        description: entryDesc.trim(),
        type: entryType,
        useSalaryBalance: useSalaryBal,
      };

      if (useSalaryBal) {
        payload.salaryMonth = parseInt(deductMonth);
        payload.salaryYear = parseInt(deductYear);
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEntryAmount('');
        setEntryTitle('');
        setEntryDesc('');
        setUseSalaryBal(false);
        setEntryModalOpen(false);
        await fetchDashboardData();
      } else {
        const errData = await res.json();
        setEntryError(errData.error || 'Failed to add entry.');
      }
    } catch (err) {
      setEntryError('Network error. Please try again.');
    } finally {
      setEntryLoading(false);
    }
  };

  // Handle Quick Delete Entry
  const handleDeleteEntry = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/entries?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDashboardData();
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

  // Format Helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val || 0);
  };

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

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      <Navbar />

      {/* Main Dashboard Panel */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Row 1: Header Welcome and Date Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Financial Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Cycle Range:{' '}
              {dataLoading ? (
                <span className="inline-block w-36 h-4 bg-white/5 rounded animate-pulse"></span>
              ) : data?.startDate ? (
                <span className="text-violet-400 font-semibold">
                  {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →{' '}
                  {new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span className="text-slate-500 text-xs ml-2">(Cycle Day: {data.cycleDate})</span>
                </span>
              ) : (
                <span className="text-slate-500">Not configured</span>
              )}
            </p>
          </div>

          {/* Filters Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-semibold"
            >
              <option value="current">Current Cycle</option>
              <option value="last">Last Cycle</option>
              <option value="last3">Last 3 Months</option>
              <option value="last6">Last 6 Months</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {filter === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-950/40 border border-white/5 rounded-xl px-3 py-1 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                />
                <span className="text-slate-600">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                  onBlur={fetchDashboardData}
                />
              </div>
            )}

            {/* Quick Action Trigger Buttons */}
            <button
              onClick={() => setSalaryModalOpen(true)}
              className="px-4 py-2 border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/5"
            >
              <Plus className="w-4 h-4" /> Add Salary
            </button>

            <button
              onClick={() => setEntryModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all btn-glow shadow-lg shadow-violet-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Log Entry
            </button>
          </div>
        </div>

        {/* Row 2: KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
          {[
            {
              title: "Current Balance",
              amount: formatCurrency(data?.kpis?.currentBalance),
              glow: "glow-balance",
              text: "text-violet-400",
              icon: Wallet,
              desc: "Total cash in hand (All time)"
            },
            {
              title: "Salary Balance",
              amount: formatCurrency(data?.kpis?.salaryBalance),
              glow: "glow-salary",
              text: "text-emerald-400",
              icon: PiggyBank,
              desc: "Current month salary minus deductions"
            },
            {
              title: "Spending Amount",
              amount: formatCurrency(data?.kpis?.spending),
              glow: "glow-spending",
              text: "text-rose-400",
              icon: ArrowUpRight,
              desc: "Total expenses in active cycle"
            },
            {
              title: "Lending Amount",
              amount: formatCurrency(data?.kpis?.lending),
              glow: "glow-lending",
              text: "text-blue-400",
              icon: ArrowRightLeft,
              desc: "Money lent to others (Receivables)"
            },
            {
              title: "Loan Amount",
              amount: formatCurrency(data?.kpis?.loan),
              glow: "glow-loan",
              text: "text-orange-400",
              icon: HelpCircle,
              desc: "Active borrowed money (Debts)"
            },
            {
              title: "Advance Balance",
              amount: formatCurrency(data?.kpis?.advance),
              glow: "glow-advance",
              text: "text-cyan-400",
              icon: TrendingUp,
              desc: "Total advance deposits in cycle"
            }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`glass-card p-5 border text-left flex flex-col justify-between h-44 cursor-default relative group ${card.glow}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">{card.title}</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-tight group-hover:text-slate-400 transition-colors">
                      {card.desc}
                    </p>
                  </div>
                  <span className={`p-2 bg-slate-950/40 rounded-lg ${card.text}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>

                <div className="mt-4">
                  {dataLoading ? (
                    <div className="w-28 h-7 bg-white/5 rounded animate-pulse"></div>
                  ) : (
                    <p className={`text-2xl font-black tracking-tight ${card.text}`}>{card.amount}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Row 3: Recent Transactions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent E-Passbook Records List */}
          <div className="lg:col-span-2 glass-card p-6 border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-violet-400" /> Recent Cycle Entries
                </h2>
                <Link href="/transactions" className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">
                  View Full Passbook →
                </Link>
              </div>

              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : !data?.recentTransactions || data.recentTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-medium">
                  <Wallet className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No transactions logged in this cycle range.
                </div>
              ) : (
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
                      {data.recentTransactions.map((entry) => {
                        const colors = {
                          SPENDING: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                          LENDING: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                          LOAN: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                          ADVANCE: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                        };
                        return (
                          <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 pr-2 font-semibold text-white">
                              <div>{entry.title}</div>
                              {entry.description && <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{entry.description}</div>}
                            </td>
                            <td className="py-3.5 pr-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[entry.type]}`}>
                                {entry.type}
                              </span>
                              {entry.useSalaryBalance && (
                                <span className="block text-[8px] text-slate-500 mt-0.5">Deducted from Salary ({entry.salaryMonth}/{entry.salaryYear})</span>
                              )}
                            </td>
                            <td className="py-3.5 pr-2 text-xs text-slate-400 font-medium">
                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                            </td>
                            <td className={`py-3.5 pr-2 text-right font-black tracking-tight ${entry.type === 'SPENDING' || entry.type === 'LENDING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {entry.type === 'SPENDING' || entry.type === 'LENDING' ? '-' : '+'}{formatCurrency(entry.amount)}
                            </td>
                            <td className="py-3.5 text-center">
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick AI Analytics Summary Sidebar */}
          <div className="glass-card p-6 border border-white/5 flex flex-col justify-between text-left">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-violet-400" /> AI Insights Preview
              </h2>
              <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-xl mb-4">
                <h4 className="text-xs font-bold text-violet-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping"></span> Savings Engine Active
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed font-medium">
                  {data?.kpis?.spending > 0 
                    ? `You spent ${formatCurrency(data?.kpis?.spending)} this cycle. Your salary balance is ${formatCurrency(data?.kpis?.salaryBalance)}. Try talking to your AI Assistant to compare budgets and get saving suggestions!`
                    : "No spending logged this cycle yet! Keep track of expenses to let Gemini analyze savings trends and give optimization ideas."}
                </p>
              </div>

              <div className="p-4 bg-cyan-600/10 border border-cyan-500/20 rounded-xl">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-2">Cycle Outlook</h4>
                <p className="text-slate-300 text-xs leading-relaxed font-medium">
                  Based on your salary cycle beginning on the <span className="font-bold text-cyan-400">{data?.cycleDate}th</span>, all monthly ledgers are computed dynamically. Go to settings to modify the billing boundaries.
                </p>
              </div>
            </div>

            <Link
              href="/assistant"
              className="mt-6 w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl text-xs font-black tracking-wider text-center uppercase transition-all btn-glow shadow-md shadow-violet-600/15"
            >
              Ask AI Assistant
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-xs text-center font-medium">
          © {new Date().getFullYear()} Manage Monthly Money. Beautiful Dark HSL System.
        </div>
      </footer>

      {/* MODAL 1: Add Salary */}
      <AnimatePresence>
        {salaryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d1423] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500"></div>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-emerald-400" /> Log Month-Wise Salary
                </h3>
                <button onClick={() => setSalaryModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {salError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{salError}</span>
                </div>
              )}

              <form onSubmit={handleAddSalary} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Salary Amount</label>
                  <input
                    type="number"
                    value={salAmount}
                    onChange={(e) => setSalAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Month</label>
                    <select
                      value={salMonth}
                      onChange={(e) => setSalMonth(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Year</label>
                    <input
                      type="number"
                      value={salYear}
                      onChange={(e) => setSalYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salLoading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center"
                >
                  {salLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : "Save Salary"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Add Entry (Drawer Modal Overlay) */}
      <AnimatePresence>
        {entryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0d1423] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-cyan-400"></div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-violet-400" /> Log Financial Entry
                </h3>
                <button onClick={() => setEntryModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {entryError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{entryError}</span>
                </div>
              )}

              <form onSubmit={handleAddEntry} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Amount</label>
                    <input
                      type="number"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Entry Type</label>
                    <select
                      value={entryType}
                      onChange={(e) => setEntryType(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-all"
                    >
                      <option value="SPENDING">Spending Amount</option>
                      <option value="LENDING">Lending Amount</option>
                      <option value="LOAN">Loan Amount</option>
                      <option value="ADVANCE">Advance Balance</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Title</label>
                  <input
                    type="text"
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                    placeholder="e.g. Groceries, Bike Loan, Lent to John"
                    className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Description</label>
                  <textarea
                    value={entryDesc}
                    onChange={(e) => setEntryDesc(e.target.value)}
                    placeholder="Add extra context or descriptions..."
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-all"
                  ></textarea>
                </div>

                {/* Salary Balance checkbox */}
                <div className="p-4 bg-slate-950/30 border border-white/5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useSalaryCheckbox"
                      checked={useSalaryBal}
                      onChange={(e) => setUseSalaryBal(e.target.checked)}
                      className="w-4 h-4 accent-violet-600"
                    />
                    <label htmlFor="useSalaryCheckbox" className="text-xs font-bold text-white cursor-pointer select-none">
                      Use Salary Balance (Deduct from Salary)
                    </label>
                  </div>
                  
                  {useSalaryBal && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      <div>
                        <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Deduct Month</label>
                        <select
                          value={deductMonth}
                          onChange={(e) => setDeductMonth(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-white/5 rounded-lg text-white text-xs focus:outline-none"
                        >
                          {monthsList.map(m => (
                            <option key={m.value} value={m.value}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Deduct Year</label>
                        <input
                          type="number"
                          value={deductYear}
                          onChange={(e) => setDeductYear(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-white/5 rounded-lg text-white text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={entryLoading}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-bold text-sm transition-all btn-glow shadow-lg shadow-violet-600/20 cursor-pointer flex items-center justify-center"
                >
                  {entryLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : "Log Transaction"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
