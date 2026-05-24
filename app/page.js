'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Coins, 
  ArrowRight, 
  Sparkles, 
  Wallet, 
  PieChart, 
  ShieldCheck, 
  Users 
} from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl animate-float-slow pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-float pointer-events-none"></div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:opacity-95">
            <span className="p-2 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg text-white">
              <Wallet className="w-5 h-5" />
            </span>
            <span>Monthly<span className="text-violet-400">Money</span></span>
          </Link>
          
          <nav className="flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-8 bg-white/5 rounded-md animate-pulse"></div>
            ) : user ? (
              <Link 
                href="/dashboard" 
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-lg font-medium text-sm transition-all btn-glow shadow-lg shadow-violet-600/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                  Log In
                </Link>
                <Link 
                  href="/signup" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12 md:py-24 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center gap-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Next-Gen Personal Finance Assistant
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">
            Manage Monthly Money <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">
              With AI-Driven Precision
            </span>
          </h1>

          <p className="text-lg text-slate-400 font-medium">
            Ditch the dusty passbooks. Log month-wise salaries, configure custom cycle calendars, track active debts and lending receivables, and chat with Gemini 2.5 to unlock real-time financial savings.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {user ? (
              <Link 
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl text-md hover:from-violet-700 hover:to-cyan-600 transition-all btn-glow shadow-lg shadow-violet-600/30"
              >
                Enter Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/signup"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl text-md hover:from-violet-700 hover:to-cyan-600 transition-all btn-glow shadow-lg shadow-violet-600/30"
                >
                  Create Free Account <ArrowRight className="w-5 h-5" />
                </Link>
                <Link 
                  href="/login"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl text-md transition-all"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </motion.div>

        {/* Dynamic Glowing Brand Cards Showcase */}
        <div className="mt-20 w-full grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { title: "Salary Balance", amount: "$5,000.00", glow: "glow-salary", text: "text-emerald-400", type: "Income" },
            { title: "Spending Amount", amount: "$1,240.00", glow: "glow-spending", text: "text-rose-400", type: "Expense" },
            { title: "Lending Amount", amount: "$600.00", glow: "glow-lending", text: "text-blue-400", type: "Receivable" },
            { title: "Loan Amount", amount: "$800.00", glow: "glow-loan", text: "text-orange-400", type: "Debt" },
            { title: "Current Balance", amount: "$3,560.00", glow: "glow-balance", text: "text-violet-400", type: "Savings" },
            { title: "Advance Balance", amount: "$400.00", glow: "glow-advance", text: "text-cyan-400", type: "Deposit" },
          ].map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className={`glass-card p-5 text-left border flex flex-col justify-between h-36 ${card.glow}`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{card.type}</span>
                <h3 className="text-slate-400 text-xs font-bold mt-1">{card.title}</h3>
              </div>
              <p className={`text-lg font-black tracking-tight ${card.text}`}>{card.amount}</p>
            </motion.div>
          ))}
        </div>

        {/* Feature Highlights Section */}
        <section className="mt-28 w-full">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white">Full-Suite Ledger Features</h2>
            <p className="text-slate-400 mt-2 font-medium">Everything you need to automate month-wise budgets and optimize active cash flow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 text-left border border-white/5">
              <div className="p-3 bg-violet-600/10 text-violet-400 rounded-xl w-fit mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Salary Cycles</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Receive salaries on different dates like the 7th? Set your customized salary cycle day and watch the system align all calculations automatically.
              </p>
            </div>

            <div className="glass-card p-8 text-left border border-white/5">
              <div className="p-3 bg-cyan-600/10 text-cyan-400 rounded-xl w-fit mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Gemini AI Assistant</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Instantly chat with a smart assistant that integrates direct database analysis to map top spending categories and compare budgets.
              </p>
            </div>

            <div className="glass-card p-8 text-left border border-white/5">
              <div className="p-3 bg-rose-600/10 text-rose-400 rounded-xl w-fit mb-6">
                <PieChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Gen-Z Visual Charts</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Beautiful, animated area, bar, and pie charts detailing income vs expenses and active spending trends for smart tracking.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/20 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Manage Monthly Money. Pair-Programmed with Antigravity AI.</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-400 transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
