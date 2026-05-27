'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  BellRing, 
  History, 
  Activity, 
  LogOut, 
  Search, 
  Send, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Mail,
  Calendar,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, broadcast, logs
  const [stats, setStats] = useState({
    usersCount: 0,
    activeUserSessions: 0,
    salariesCount: 0,
    entriesCount: 0,
    recentBroadcasts: [],
  });
  const [usersList, setUsersList] = useState([]);
  const [broadcastsList, setBroadcastsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notification form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTargetType, setNotifTargetType] = useState('ALL'); // ALL, SPECIFIC
  const [notifTargetEmail, setNotifTargetEmail] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifError, setNotifError] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch Dashboard Aggregated Stats
  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        router.push('/admin/login');
      }
    } catch (err) {
      console.error('Error fetching admin dashboard stats:', err);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    }
  };

  // Fetch Dispatched Broadcast Logs
  const fetchBroadcasts = async () => {
    try {
      const res = await fetch('/api/admin/broadcast');
      if (res.ok) {
        const data = await res.json();
        setBroadcastsList(data);
      }
    } catch (err) {
      console.error('Error fetching admin broadcasts:', err);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle || !notifBody) {
      setNotifError('Please complete both notification title and description.');
      return;
    }
    if (notifTargetType === 'SPECIFIC' && !notifTargetEmail) {
      setNotifError('Please select or specify a target user email.');
      return;
    }

    setNotifError('');
    setNotifSuccess('');
    setNotifSending(true);

    try {
      const target = notifTargetType === 'ALL' ? 'ALL' : notifTargetEmail;
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifTitle,
          body: notifBody,
          target,
        }),
      });

      if (res.ok) {
        setNotifSuccess(`Notification dispatched successfully to: ${target}!`);
        setNotifTitle('');
        setNotifBody('');
        fetchBroadcasts();
        fetchDashboardStats();
      } else {
        const errData = await res.json();
        setNotifError(errData.error || 'Failed to dispatch notification.');
      }
    } catch (err) {
      setNotifError('Network error while dispatching notification.');
    } finally {
      setNotifSending(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchDashboardStats();
      await fetchUsers();
      await fetchBroadcasts();
      setLoading(false);
    };
    init();
  }, []);

  // Filtered Users List
  const filteredUsers = usersList.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a] text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] text-white flex flex-col font-sans">
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* TOP HEADER */}
      <header className="border-b border-white/5 bg-[#070b14]/75 backdrop-blur-xl sticky top-0 z-30 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-xl shadow-md shadow-violet-600/10">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-wider flex items-center gap-1.5 leading-none">
              Passbook Admin <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-bold">Portal</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Control Center & System Analytics</p>
          </div>
        </div>

        <button 
          onClick={handleAdminLogout}
          className="px-4 py-2 bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* SIDE NAVIGATION */}
        <aside className="w-full md:w-64 border-r border-white/5 bg-[#05080f]/40 p-6 space-y-2 shrink-0">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-4">Operations</p>
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 cursor-pointer transition-all ${activeTab === 'overview' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-600/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Activity className="w-4 h-4" /> Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 cursor-pointer transition-all ${activeTab === 'users' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-600/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Users className="w-4 h-4" /> Users Directory
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 cursor-pointer transition-all ${activeTab === 'broadcast' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-600/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <BellRing className="w-4 h-4" /> Send Notifications
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 cursor-pointer transition-all ${activeTab === 'logs' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-600/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <History className="w-4 h-4" /> Dispatched Audits
          </button>
        </aside>

        {/* MAIN DISPLAY AREA */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-white">System Aggregates</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Real-time status of active users and database collections</p>
                </div>

                {/* STATS MATRIX GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0b101c]/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-2 bg-violet-500/10 text-violet-400 rounded-xl"><Users className="w-5 h-5" /></span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-white">{stats.usersCount}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Registered Users</p>
                  </div>

                  <div className="bg-[#0b101c]/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/5 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl"><Activity className="w-5 h-5" /></span>
                      <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">Live</span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-white">{stats.activeUserSessions}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active User Sessions</p>
                  </div>

                  <div className="bg-[#0b101c]/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><TrendingUp className="w-5 h-5" /></span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-white">{stats.salariesCount}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Salary Logs Registered</p>
                  </div>

                  <div className="bg-[#0b101c]/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl"><Layers className="w-5 h-5" /></span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-white">{stats.entriesCount}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Transaction Logs</p>
                  </div>
                </div>

                {/* RECENT DISPATCHED AUDIT */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <History className="w-4 h-4 text-violet-400" /> Recent Broadcast Log
                  </h3>

                  <div className="bg-[#0b101c]/40 border border-white/5 rounded-2xl overflow-hidden">
                    {stats.recentBroadcasts.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-semibold">No recent broadcasts recorded.</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {stats.recentBroadcasts.map((b) => (
                          <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-white/[0.01] transition-all">
                            <div>
                              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                                {b.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-1">{b.body}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border border-white/10 bg-slate-900/60 text-slate-400 uppercase">
                                To: {b.target}
                              </span>
                              <span className="text-[9px] text-slate-500 font-medium">
                                {new Date(b.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: USERS DIRECTORY */}
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-wider text-white">Users Directory</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Audit profiles, currency choices, and alert schedules</p>
                  </div>

                  {/* SEARCH FIELD */}
                  <div className="relative w-full sm:w-72">
                    <span className="absolute left-3.5 top-2.5 text-slate-500"><Search className="w-4 h-4" /></span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search email or name..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* USERS TABLE */}
                <div className="bg-[#0b101c]/40 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#070b14]/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <th className="px-6 py-4">User Details</th>
                          <th className="px-6 py-4">Status & Currency</th>
                          <th className="px-6 py-4">Daily Reminder Time</th>
                          <th className="px-6 py-4">Toggles</th>
                          <th className="px-6 py-4 text-right">Logs Counts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-slate-300 font-semibold">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-medium">No registered users matched search query.</td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/[0.01] transition-all">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-black text-xs">
                                    {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-white">{u.name || 'Anonymous User'}</h4>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                    {u.currency}
                                  </span>
                                  <div className="text-[9px] text-slate-500 font-medium flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Cycle Day: {u.salaryCycleDate}th
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-cyan-400 font-bold">{u.dailyReminderTime}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${u.notifSalary ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-600 border border-white/5'}`}>
                                    Salary
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${u.notifDaily ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-600 border border-white/5'}`}>
                                    Daily
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${u.notifDailySpend ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-600 border border-white/5'}`}>
                                    Spend
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${u.notifCycle ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-600 border border-white/5'}`}>
                                    Cycle
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="text-[10px] space-y-0.5">
                                  <span className="block text-slate-400">Salaries: <span className="text-white font-bold">{u._count?.salaries || 0}</span></span>
                                  <span className="block text-slate-400">Entries: <span className="text-white font-bold">{u._count?.financialEntries || 0}</span></span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: SEND BROADCAST */}
            {activeTab === 'broadcast' && (
              <motion.div
                key="broadcast"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-2xl"
              >
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-white">Trigger Push Notification</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Dispatches alerts via database-backed in-app notifications and OneSignal APIs</p>
                </div>

                {notifSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs flex items-center gap-3 font-semibold">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <span>{notifSuccess}</span>
                  </div>
                )}

                {notifError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs flex items-center gap-3 font-semibold">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{notifError}</span>
                  </div>
                )}

                <form onSubmit={handleSendNotification} className="space-y-6 bg-[#0b101c]/40 border border-white/5 p-6 rounded-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Delivery Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNotifTargetType('ALL')}
                          className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all ${notifTargetType === 'ALL' ? 'bg-violet-600/10 border-violet-500 text-violet-300' : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-white'}`}
                        >
                          Broadcast to All
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifTargetType('SPECIFIC')}
                          className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all ${notifTargetType === 'SPECIFIC' ? 'bg-violet-600/10 border-violet-500 text-violet-300' : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-white'}`}
                        >
                          Target Specific User
                        </button>
                      </div>
                    </div>

                    {notifTargetType === 'SPECIFIC' && (
                      <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Target User Email</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3.5 text-slate-500"><Mail className="w-4 h-4" /></span>
                          <select
                            value={notifTargetEmail}
                            onChange={(e) => setNotifTargetEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500 transition-all font-semibold"
                          >
                            <option value="">-- Choose User Profile --</option>
                            {usersList.map(u => (
                              <option key={u.id} value={u.email}>{u.email} ({u.name || 'Anonymous'})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Notification Title</label>
                    <input
                      type="text"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g. System Upgrades, budget constraints Alert!"
                      className="w-full px-4 py-3.5 bg-slate-950/40 border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Notification Message (Body)</label>
                    <textarea
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      placeholder="Type brief details or actionable notification alerts here..."
                      rows="4"
                      className="w-full px-4 py-3.5 bg-slate-950/40 border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all font-semibold"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={notifSending}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-violet-600/15 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {notifSending ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Dispatch Push Notification
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* TAB 4: DISPATCHED AUDITS LOG */}
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-white">Dispatched Audits</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Historical list of sent system broadcasts and push notifications</p>
                </div>

                <div className="bg-[#0b101c]/40 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#070b14]/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <th className="px-6 py-4">Dispatch ID</th>
                          <th className="px-6 py-4">Title</th>
                          <th className="px-6 py-4">Body / Message Context</th>
                          <th className="px-6 py-4">Target Audience</th>
                          <th className="px-6 py-4 text-right">Sent Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-slate-300 font-semibold">
                        {broadcastsList.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-medium">No sent dispatches logged.</td>
                          </tr>
                        ) : (
                          broadcastsList.map((b) => (
                            <tr key={b.id} className="hover:bg-white/[0.01] transition-all">
                              <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{b.id.slice(0, 8)}...</td>
                              <td className="px-6 py-4 font-bold text-white">{b.title}</td>
                              <td className="px-6 py-4 text-slate-400 max-w-sm truncate">{b.body}</td>
                              <td className="px-6 py-4">
                                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border ${b.target === 'ALL' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-violet-500/10 text-violet-300 border-violet-500/20'}`}>
                                  {b.target}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-500 font-medium font-mono text-[10px]">
                                {new Date(b.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
