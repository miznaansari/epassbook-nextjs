'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, AlertCircle, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden px-4">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-600/20">
            <ShieldCheck className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Admin Portal</h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold">Manage Monthly Money Smart System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Admin Email</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500"><Mail className="w-5 h-5" /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@monthlymoney.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Security Password</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500"><Lock className="w-5 h-5" /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-violet-600/15 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : "Authenticate Admin"}
          </button>
        </form>

        <div className="mt-8 p-4 bg-slate-950/50 border border-white/5 rounded-xl text-left">
          <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Terminal className="w-3.5 h-3.5" /> Initial Boot Instructions
          </h4>
          <p className="text-slate-400 text-[10px] leading-relaxed font-semibold">
            If there are no registered admins, logging in will automatically seed a default administrator account:<br/>
            <span className="text-slate-200">Email:</span> <code className="text-cyan-400 font-mono">admin@monthlymoney.com</code><br/>
            <span className="text-slate-200">Password:</span> <code className="text-cyan-400 font-mono">admin123</code>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
