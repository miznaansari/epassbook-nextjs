'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import packageInfo from '@/package.json';
import OneSignal from 'react-onesignal';
import {
  Settings as SettingsIcon,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Coins,
  Bell,
  Clock,
  Volume2,
  Cpu,
  ArrowRight
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
  const [notifDailySpend, setNotifDailySpend] = useState(true);
  const [dailySpendReminderTime, setDailySpendReminderTime] = useState('22:00');

  // OneSignal Status States
  const [oneSignalEnabled, setOneSignalEnabled] = useState(false);
  const [oneSignalSubId, setOneSignalSubId] = useState(null);
  const [checkingPush, setCheckingPush] = useState(true);

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
      setNotifDailySpend(user.notifDailySpend !== false);
      setDailySpendReminderTime(user.dailySpendReminderTime || '22:00');
    }
  }, [user]);

  // Check and observe OneSignal status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStatus = () => {
      try {
        const isOptedIn = OneSignal.User?.PushSubscription?.optedIn;
        const subId = OneSignal.User?.PushSubscription?.id;
        setOneSignalEnabled(!!isOptedIn);
        setOneSignalSubId(subId);
        setCheckingPush(false);
      } catch (err) {
        console.warn("[Settings] Error checking status:", err);
      }
    };

    checkStatus();

    try {
      OneSignal.User?.PushSubscription?.addEventListener("change", checkStatus);
    } catch (err) {
      console.warn("[Settings] Error adding change listener:", err);
    }

    return () => {
      try {
        OneSignal.User?.PushSubscription?.removeEventListener("change", checkStatus);
      } catch (err) { }
    };
  }, []);

  const handleForceOptIn = async () => {
    setError('');
    setSuccess('');
    try {
      await OneSignal.Notifications?.requestPermission();
      const pushSubscription = OneSignal.User?.PushSubscription;
      if (pushSubscription) {
        await pushSubscription.optIn();
      }
      if (user?.uid) {
        await OneSignal.login(user.uid);
      }
      setSuccess("Push notification permissions registered successfully.");
    } catch (err) {
      console.error("Error during force opt-in:", err);
      setError("Failed to register push subscription. Check browser notification permissions.");
    }
  };

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
          notifDailySpend,
          dailySpendReminderTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (res.ok) {
        setSuccess('Settings updated successfully.');
        await refreshUser();
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
      <div className="min-h-screen flex items-center justify-center bg-[#050506]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#5E6AD2] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#050506] text-[#EDEDEF]">
      <Navbar />

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-12">

        {/* Title Header */}
        <div className="text-left mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-[#818cf8]" /> Settings
          </h1>
          <p className="text-[#8A8F98] text-xs mt-1">Configure profile preferences, salary calendar cycle, and notifications.</p>
        </div>

        {/* Settings Form Container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-[#0a0a0c] p-6 sm:p-8 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-left"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Feedback messages */}
          {success && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">

            {/* Profile section */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] border-b border-white/[0.06] pb-2">Profile & Schedule</h3>

              <div>
                <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#818cf8]" /> Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white placeholder-[#8A8F98]/50 text-xs focus:outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[#8A8F98] text-[10px] font-mono uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#818cf8]" /> Salary Cycle Day
                  </label>
                  <span className="text-[10px] bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded font-mono text-[#818cf8]">
                    Day: {cycleDate}th
                  </span>
                </div>

                <input
                  type="number"
                  value={cycleDate}
                  onChange={(e) => setCycleDate(e.target.value)}
                  min="1"
                  max="31"
                  placeholder="e.g. 1"
                  className="w-full px-3.5 py-2 bg-[#050506] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#5E6AD2]"
                />
              </div>
            </div>

            {/* Preferred Currency */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] border-b border-white/[0.06] pb-2">Currency</h3>

              <div className="grid grid-cols-2 gap-3">
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
                      className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#5E6AD2]/15 border-[#5E6AD2] text-white shadow-md'
                          : 'bg-[#050506] border-white/[0.06] text-[#8A8F98] hover:text-white hover:border-white/15'
                      }`}
                    >
                      <span className="text-xl font-semibold">{curr.symbol}</span>
                      <span className="text-xs">{curr.name} ({curr.code})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notifications & Triggers */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] border-b border-white/[0.06] pb-2">Alerts & Triggers</h3>

              <div className="space-y-2.5">
                {/* Salary celebration */}
                <label className="flex items-start gap-3 p-3 bg-[#050506] border border-white/[0.06] rounded-xl cursor-pointer hover:border-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifSalary}
                    onChange={(e) => setNotifSalary(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#5E6AD2] rounded cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-medium text-white flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Salary Celebration Overlay
                    </span>
                    <span className="block text-[10px] text-[#8A8F98] mt-0.5">
                      Show celebratory visual cards when monthly salary inflows are credited.
                    </span>
                  </div>
                </label>

                {/* Daily Reminder */}
                <div className="p-3 bg-[#050506] border border-white/[0.06] rounded-xl space-y-2.5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifDaily}
                      onChange={(e) => setNotifDaily(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-[#5E6AD2] rounded cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-medium text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-[#818cf8]" /> Daily Spend Audit Reminder
                      </span>
                      <span className="block text-[10px] text-[#8A8F98] mt-0.5">
                        Schedule a daily notification prompt to review expenditures.
                      </span>
                    </div>
                  </label>

                  {notifDaily && (
                    <div className="pl-7 pt-2 border-t border-white/[0.04] flex items-center gap-2.5">
                      <label className="text-[10px] font-mono uppercase text-[#8A8F98] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#818cf8]" /> Alert Time:
                      </label>
                      <input
                        type="time"
                        value={dailyReminderTime}
                        onChange={(e) => setDailyReminderTime(e.target.value)}
                        className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#5E6AD2]"
                      />
                    </div>
                  )}
                </div>

                {/* Push Notification OneSignal */}
                <div className="p-3.5 bg-[#050506] border border-white/[0.06] rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-left">
                      <span className="block text-xs font-medium text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-[#818cf8]" /> Web Push Permissions
                      </span>
                      <span className="block text-[10px] text-[#8A8F98] mt-0.5">
                        Registration status with OneSignal push service.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {checkingPush ? (
                        <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[#8A8F98] font-mono">
                          Checking...
                        </span>
                      ) : oneSignalEnabled ? (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> Subscribed
                        </span>
                      ) : (
                        <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-rose-400 font-mono flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleForceOptIn}
                    className="btn-linear-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="w-3 h-3 text-[#818cf8]" /> Request Browser Permission
                  </button>
                </div>

                {/* MCP Integration banner */}
                <div className="p-3.5 bg-gradient-to-r from-[#5E6AD2]/10 to-transparent border border-[#5E6AD2]/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-left">
                    <span className="block text-xs font-medium text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#818cf8]" /> Model Context Protocol (MCP) API
                    </span>
                    <span className="block text-[10px] text-[#8A8F98] mt-0.5">
                      Generate keys to connect Cursor, Claude Desktop, or custom external agents.
                    </span>
                  </div>
                  <Link
                    href="/mcp"
                    className="btn-linear-secondary px-3 py-1.5 text-xs text-white flex items-center justify-center gap-1 shrink-0"
                  >
                    <span>MCP Keys</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={updating}
              className="btn-linear-primary w-full py-2.5 text-xs flex items-center justify-center cursor-pointer"
            >
              {updating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Save Preferences"}
            </button>
          </form>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-6 bg-[#020203]">
        <div className="max-w-7xl mx-auto px-6 text-[#8A8F98] text-xs text-center font-mono">
          © {new Date().getFullYear()} MonthlyMoney • v{packageInfo.version}
        </div>
      </footer>
    </div>
  );
}
