'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Coins,
  Bell,
  Clock,
  Volume2
} from 'lucide-react';

export default function Settings() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  // Settings Forms State
  const [name, setName] = useState('');
  const [cycleDate, setCycleDate] = useState('1');
  const [currency, setCurrency] = useState('USD');
  const [dailyReminderTime, setDailyReminderTime] = useState('23:00');
  const [notifSalary, setNotifSalary] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifCycle, setNotifCycle] = useState(true);
  
  // Feedback Messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load current values
  useEffect(() => {
    if (user) {
      setName(user.displayName || user.name || '');
      setCycleDate(user.salaryCycleDate?.toString() || '1');
      setCurrency(user.currency || 'USD');
      setDailyReminderTime(user.dailyReminderTime || '23:00');
      setNotifSalary(user.notifSalary !== false);
      setNotifDaily(user.notifDaily !== false);
      setNotifCycle(user.notifCycle !== false);
    }
  }, [user]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!name.trim()) {
      setError('Please enter a display name.');
      return;
    }
    
    const parsedDate = parseInt(cycleDate);
    if (isNaN(parsedDate) || parsedDate < 1 || parsedDate > 31) {
      setError('Salary cycle date must be a valid day between 1 and 31.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          name: name.trim(),
          salaryCycleDate: parsedDate,
          currency,
          dailyReminderTime,
          notifSalary,
          notifDaily,
          notifCycle,
        }),
      });

      if (res.ok) {
        setSuccess('Profile configurations successfully synchronized!');
        await refreshUser(); // Refresh the AuthContext
      } else {
        const payload = await res.json();
        setError(payload.error || 'Failed to update configurations.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow max-w-3xl w-full mx-auto px-6 py-8 pb-24 md:pb-12">
        
        {/* Row 1: Title Header */}
        <div className="text-left mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-violet-400" /> Account Configurations
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Configure profile settings, financial calendars, currency, and notification timings.</p>
        </div>

        {/* Row 2: Settings Form Container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="glass-card p-6 sm:p-8 border border-white/5 shadow-2xl relative overflow-hidden text-left"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-cyan-400"></div>

          {/* Feedback messages */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* 1. Profile section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white tracking-wider uppercase border-b border-white/5 pb-2">Profile & Calendar</h3>
              
              {/* Field A: Profile Name */}
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-violet-400" /> Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-semibold"
                />
              </div>

              {/* Field B: Salary Cycle Date */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-violet-400" /> Salary Cycle Date
                  </label>
                  <span className="text-[10px] bg-violet-600/15 border border-violet-500/20 px-2 py-0.5 rounded-full text-violet-400 font-extrabold">
                    Active Date: {cycleDate}th
                  </span>
                </div>
                
                <input
                  type="number"
                  value={cycleDate}
                  onChange={(e) => setCycleDate(e.target.value)}
                  min="1"
                  max="31"
                  placeholder="e.g. 7"
                  className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-semibold"
                />
              </div>
            </div>

            {/* 2. Preferred Currency */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white tracking-wider uppercase border-b border-white/5 pb-2">Preferences</h3>
              
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-violet-400" /> Preferred Currency
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { code: 'USD', name: 'US Dollar', symbol: '$' },
                    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
                  ].map((curr) => {
                    const isSelected = currency === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => setCurrency(curr.code)}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-violet-600/10 border-violet-500/50 shadow-md shadow-violet-600/10 text-white'
                            : 'bg-slate-950/20 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                        )}
                        <span className="text-2xl font-black">{curr.symbol}</span>
                        <span className="text-xs font-bold">{curr.name} ({curr.code})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Notification Center & Timings */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white tracking-wider uppercase border-b border-white/5 pb-2">Notifications & Triggers</h3>
              
              <div className="space-y-3">
                {/* Salary celebration */}
                <label className="flex items-start gap-3 p-4 bg-slate-950/30 border border-white/5 rounded-xl cursor-pointer hover:bg-slate-950/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifSalary}
                    onChange={(e) => setNotifSalary(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-violet-500 rounded cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Salary Added Celebration
                    </span>
                    <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                      Show celebratory animated popups and congratulatory greetings when salary credit entries are added.
                    </span>
                  </div>
                </label>

                {/* Daily Spend Reminder & Custom Timing Input */}
                <div className="p-4 bg-slate-950/30 border border-white/5 rounded-xl space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifDaily}
                      onChange={(e) => setNotifDaily(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-violet-500 rounded cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5 text-violet-400" /> Daily Spend Reminder
                      </span>
                      <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                        Schedule an alert asking how you spent money today. Custom timing below.
                      </span>
                    </div>
                  </label>

                  {notifDaily && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pl-7 pt-2 border-t border-white/5 flex items-center gap-3"
                    >
                      <label className="text-[10px] uppercase font-extrabold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" /> Alert Time:
                      </label>
                      <input
                        type="time"
                        value={dailyReminderTime}
                        onChange={(e) => setDailyReminderTime(e.target.value)}
                        className="bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Cycle budget check */}
                <label className="flex items-start gap-3 p-4 bg-slate-950/30 border border-white/5 rounded-xl cursor-pointer hover:bg-slate-950/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifCycle}
                    onChange={(e) => setNotifCycle(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-violet-500 rounded cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      <SettingsIcon className="w-3.5 h-3.5 text-cyan-400" /> End-Of-Cycle Budget Review
                    </span>
                    <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                      Triggers AI-driven prompt alerts summarizing your total savings versus expenditures at the end of every cycle.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={updating}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-black tracking-wider text-xs uppercase transition-all btn-glow shadow-lg shadow-violet-600/20 flex items-center justify-center cursor-pointer"
            >
              {updating ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : "Synchronize Configurations"}
            </button>
          </form>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-xs text-center font-medium">
          © {new Date().getFullYear()} Manage Monthly Money. Configurator Settings.
        </div>
      </footer>
    </div>
  );
}
