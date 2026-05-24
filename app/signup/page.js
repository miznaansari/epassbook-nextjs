'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Wallet, Mail, Lock, UserPlus, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [showRetry, setShowRetry] = useState(false);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show manual PWA refresh/sync triggers if auth sync hangs beyond 4 seconds
  useEffect(() => {
    let timer;
    if (loading || user) {
      timer = setTimeout(() => {
        setShowRetry(true);
      }, 4000);
    } else {
      setShowRetry(false);
    }
    return () => clearTimeout(timer);
  }, [loading, user]);

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoadingState(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else {
        setError('Failed to create account. Please try again.');
      }
      setLoadingState(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoadingState(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Auth Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google Authentication failed. Please try again.');
      }
      setLoadingState(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        {showRetry && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 text-center mt-8 bg-slate-950/40 border border-white/5 p-6 rounded-2xl max-w-sm backdrop-blur-md"
          >
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-normal">PWA Sync is taking longer than expected...</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3.5 py-2 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/25 hover:border-violet-500/40 text-violet-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Force Reload
              </button>
              <button
                type="button"
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then((registrations) => {
                      for (let reg of registrations) {
                        reg.unregister();
                      }
                    });
                  }
                  window.location.reload();
                }}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/40 text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Clear Cache & Retry
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12">
      {/* Decorative Orbs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Auth Form Card */}
        <div className="glass-card p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Top subtle highlight line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-cyan-400"></div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-violet-600/15 rounded-xl text-violet-400 mb-4">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
            <p className="text-slate-400 text-sm mt-1">Start tracking and optimizing your monthly money</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  disabled={loadingState}
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  disabled={loadingState}
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  disabled={loadingState}
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-bold text-sm transition-all btn-glow shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 mt-6 cursor-pointer"
              disabled={loadingState}
            >
              {loadingState ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>

          {/* Social signup divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-white/5"></div>
            <span className="relative px-3 bg-[#0d1423] text-[10px] text-slate-600 uppercase font-bold tracking-widest">Or Register With</span>
          </div>

          <button
            onClick={handleGoogleSignup}
            className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            disabled={loadingState}
          >
            <Sparkles className="w-4 h-4 text-violet-400" /> Google Sign-Up
          </button>

          <p className="text-center text-slate-500 text-xs mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Log In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
