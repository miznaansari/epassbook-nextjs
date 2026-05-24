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
  Sparkles
} from 'lucide-react';

export default function Settings() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  // Settings Forms State
  const [name, setName] = useState('');
  const [cycleDate, setCycleDate] = useState('1');
  
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

      <main className="flex-grow max-w-3xl w-full mx-auto px-6 py-8">
        
        {/* Row 1: Title Header */}
        <div className="text-left mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-violet-400" /> Account Configurations
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Configure profile settings and financial calendar cycles.</p>
        </div>

        {/* Row 2: Settings Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
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
                  Active Date: {user.salaryCycleDate}th
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

              <div className="mt-3 p-4 bg-slate-950/30 border border-white/5 rounded-xl">
                <h4 className="text-xs font-bold text-white flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> How Salary Cycles Work
                </h4>
                <p className="text-slate-400 text-[10px] leading-relaxed mt-1 font-semibold">
                  If you receive salary on the 7th of every month, setting this date to **7** will align your budget dashboards to run from the **7th of the current month to the 6th of the next month**. Any ledger logs created within this span belong automatically to this billing cycle.
                </p>
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
              ) : "Synchronize Profile"}
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
