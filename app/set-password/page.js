'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wallet, Lock, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !token) {
      setError('Invalid link. Missing email or token parameter.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        // Force refresh context if window reload/redirect
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setError(data.error || 'Failed to set password. Please request a new setup link.');
      }
    } catch (err) {
      console.error('Set password error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="glass-card p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-rose-500"></div>
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-rose-500/10 rounded-xl text-rose-400 mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Invalid Setup Link</h2>
          <p className="text-slate-400 text-sm mt-2">
            This setup link appears to be malformed or missing security credentials. Please try logging in again to request a new setup link.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 border border-white/5 shadow-2xl relative overflow-hidden text-center"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500"></div>
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/15 rounded-xl text-emerald-400 mb-4 animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Password Configured!</h2>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Your password has been successfully configured. Preparing your secure dashboard workspace...
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
          Redirecting to Dashboard <ArrowRight className="w-4 h-4" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="glass-card p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Top subtle highlight line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-cyan-400"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-violet-600/15 rounded-xl text-violet-400 mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Configure Password</h2>
          <p className="text-slate-400 text-sm mt-1">Set a password for account <span className="text-violet-400 font-mono">{email}</span></p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                disabled={loading}
              />
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                disabled={loading}
              />
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-bold text-sm transition-all btn-glow shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-violet-300" /> Save & Activate
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-[#090e1a]">
      {/* Decorative Orbs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <Suspense fallback={
        <div className="glass-card p-8 border border-white/5 shadow-2xl flex flex-col items-center justify-center w-full max-w-md">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4"></div>
          <span className="text-slate-400 text-sm">Loading security parameters...</span>
        </div>
      }>
        <SetPasswordForm />
      </Suspense>
    </div>
  );
}
