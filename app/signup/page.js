'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Wallet, Mail, Lock, UserPlus, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

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
      const result = await login(email, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to create account.');
        setLoadingState(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to create account. Please try again.');
      setLoadingState(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoadingState(true);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName,
        }),
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError('Failed to sync session. Please try again.');
        setLoadingState(false);
      }
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050506] px-6">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#5E6AD2] rounded-full animate-spin" />
        {showRetry && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 text-center mt-6 bg-[#0a0a0c] border border-white/10 p-5 rounded-xl max-w-sm"
          >
            <p className="text-[10px] text-[#8A8F98] font-mono uppercase tracking-widest">PWA Sync Delay</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-linear-secondary px-3 py-1.5 text-xs"
              >
                Reload
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
                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg"
              >
                Clear Cache
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-[#050506] text-[#EDEDEF]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-[#8A8F98] hover:text-white transition-colors text-xs font-medium mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        {/* Auth Form Card */}
        <div className="bg-[#0a0a0c] p-8 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-left">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-2.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 rounded-xl text-[#818cf8] mb-3">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Create an Account</h2>
            <p className="text-[#8A8F98] text-xs mt-1">Start managing your personal finances with AI precision</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white placeholder-[#8A8F98]/50 text-xs focus:outline-none focus:border-[#5E6AD2]"
                  disabled={loadingState}
                />
                <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8A8F98]" />
              </div>
            </div>

            <div>
              <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white placeholder-[#8A8F98]/50 text-xs focus:outline-none focus:border-[#5E6AD2]"
                  disabled={loadingState}
                />
                <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8A8F98]" />
              </div>
            </div>

            <div>
              <label className="block text-[#8A8F98] text-[10px] font-mono uppercase mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#050506] border border-white/10 rounded-lg text-white placeholder-[#8A8F98]/50 text-xs focus:outline-none focus:border-[#5E6AD2]"
                  disabled={loadingState}
                />
                <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8A8F98]" />
              </div>
            </div>

            <button
              type="submit"
              className="btn-linear-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-4 cursor-pointer"
              disabled={loadingState}
            >
              {loadingState ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </>
              )}
            </button>
          </form>

          {/* Social divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute w-full h-px bg-white/[0.06]" />
            <span className="relative px-2.5 bg-[#0a0a0c] text-[9px] font-mono text-[#8A8F98] uppercase tracking-wider">Or</span>
          </div>

          <button
            onClick={handleGoogleSignup}
            className="btn-linear-secondary w-full py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
            disabled={loadingState}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" /> Continue with Google
          </button>

          <p className="text-center text-[#8A8F98] text-xs mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#818cf8] hover:text-white transition-colors font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
