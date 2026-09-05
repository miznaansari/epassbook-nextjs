'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { 
  TrendingUp, 
  ArrowRight, 
  Sparkles, 
  Wallet, 
  PieChart, 
  ShieldCheck, 
  Activity,
  Layers,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Cpu
} from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between overflow-hidden">
      {/* Header / Top Navigation */}
      <header className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-base text-white tracking-tight group">
            <span className="p-1.5 bg-gradient-to-b from-[#5E6AD2] to-[#4B55B0] rounded-lg text-white shadow-[0_0_12px_rgba(94,106,210,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)]">
              <Wallet className="w-4 h-4" />
            </span>
            <span>Monthly<span className="text-[#818cf8]">Money</span></span>
          </Link>
          
          <nav className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-white/5 rounded-md animate-pulse"></div>
            ) : user ? (
              <Link 
                href="/dashboard" 
                className="btn-linear-primary px-4 py-2 text-xs"
              >
                Enter App
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3.5 py-1.5 text-xs text-[#8A8F98] hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  className="btn-linear-primary px-4 py-2 text-xs"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 pt-16 pb-24 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6 max-w-3xl"
        >
          {/* Linear Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] rounded-full text-xs font-mono tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
            <span>v0.1.39 • Intelligent Financial Infrastructure</span>
          </div>

          {/* Display Typography */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.08] text-white">
            Personal finance with <br />
            <span className="bg-gradient-to-r from-white via-[#818cf8] to-[#5E6AD2] bg-clip-text text-transparent">
              engineering precision.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#8A8F98] font-normal max-w-2xl leading-relaxed">
            Eliminate guesswork from your finances. Track dynamic salary cycles, active lending receivables, loan obligations, and portfolio health with Gemini 2.5 intelligence.
          </p>

          <div className="mt-2 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {user ? (
              <Link 
                href="/dashboard"
                className="btn-linear-primary flex items-center justify-center gap-2 px-6 py-3 text-sm"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/signup"
                  className="btn-linear-primary flex items-center justify-center gap-2 px-6 py-3 text-sm"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link 
                  href="/login"
                  className="btn-linear-secondary flex items-center justify-center gap-2 px-6 py-3 text-sm"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </motion.div>

        {/* Live Metrics Bento Strip */}
        <div className="mt-16 w-full grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
          {[
            { title: "Salary Inflow", amount: "$5,000.00", text: "text-emerald-400", type: "INCOME", border: "rgba(16, 185, 129, 0.2)", glow: "rgba(16, 185, 129, 0.12)" },
            { title: "Outflows", amount: "$1,240.00", text: "text-rose-400", type: "EXPENSE", border: "rgba(244, 63, 94, 0.2)", glow: "rgba(244, 63, 94, 0.12)" },
            { title: "Lending Out", amount: "$600.00", text: "text-blue-400", type: "RECEIVABLE", border: "rgba(59, 130, 246, 0.2)", glow: "rgba(59, 130, 246, 0.12)" },
            { title: "Active Debt", amount: "$800.00", text: "text-orange-400", type: "LIABILITY", border: "rgba(249, 115, 22, 0.2)", glow: "rgba(249, 115, 22, 0.12)" },
            { title: "Liquid Balance", amount: "$3,560.00", text: "text-[#818cf8]", type: "AVAILABLE", border: "rgba(94, 106, 210, 0.3)", glow: "rgba(94, 106, 210, 0.18)" },
            { title: "Advance Capital", amount: "$400.00", text: "text-cyan-400", type: "DEPOSIT", border: "rgba(6, 182, 212, 0.2)", glow: "rgba(6, 182, 212, 0.12)" },
          ].map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                spotlightColor={card.glow}
                borderColor={card.border}
                className="p-4 text-left flex flex-col justify-between h-32"
              >
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-[#8A8F98] uppercase">{card.type}</span>
                  <h3 className="text-xs font-medium text-[#EDEDEF] mt-0.5">{card.title}</h3>
                </div>
                <p className={`text-lg font-semibold tracking-tight ${card.text}`}>{card.amount}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        {/* Asymmetric Linear Bento Grid Features */}
        <section className="mt-28 w-full text-left">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] text-[#8A8F98] rounded-md text-[11px] font-mono uppercase tracking-widest mb-3">
              Capabilities
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
              Built for speed, depth, and clarity.
            </h2>
            <p className="text-sm text-[#8A8F98] mt-2">
              Every detail is engineered to feel instant, responsive, and tactile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Hero Bento Card - 4 Columns */}
            <SpotlightCard 
              className="md:col-span-4 p-8 flex flex-col justify-between min-h-[300px]"
              spotlightColor="rgba(94, 106, 210, 0.18)"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/25 text-[#818cf8] flex items-center justify-center mb-6">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">AI Vision & Streaming Intelligence</h3>
                <p className="text-sm text-[#8A8F98] mt-2 leading-relaxed max-w-xl">
                  Snap receipts on mobile with the direct camera bridge, let Gemini 2.5 structure multi-line expense proposals, and auto-populate your ledger with zero friction.
                </p>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-[#050506]/60 border border-white/[0.06] font-mono text-xs text-[#8A8F98] flex items-center justify-between">
                <span className="text-[#818cf8] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini Flash 2.5 Connected
                </span>
                <span className="text-[11px] text-[#8A8F98]/60">Streaming Mode</span>
              </div>
            </SpotlightCard>

            {/* Bento Card - 2 Columns */}
            <SpotlightCard 
              className="md:col-span-2 p-8 flex flex-col justify-between min-h-[300px]"
              spotlightColor="rgba(59, 130, 246, 0.15)"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center mb-6">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight">Salary Cycles</h3>
                <p className="text-xs text-[#8A8F98] mt-2 leading-relaxed">
                  Receive income on the 7th or 25th? Configure your cycle day and watch every calculation align across monthly boundaries.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#8A8F98]">
                <span>Custom Boundary</span>
                <span className="font-mono text-white">Day 1 - 31</span>
              </div>
            </SpotlightCard>

            {/* Bento Card - 2 Columns */}
            <SpotlightCard 
              className="md:col-span-2 p-8 flex flex-col justify-between min-h-[260px]"
              spotlightColor="rgba(244, 63, 94, 0.15)"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center mb-6">
                  <PieChart className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight">Spending Analytics</h3>
                <p className="text-xs text-[#8A8F98] mt-2 leading-relaxed">
                  Interactive area graphs and category breakdowns revealing exact outflow trajectories.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#8A8F98]">
                <span>Live Breakdown</span>
                <span className="font-mono text-rose-400">Recharts 3.8</span>
              </div>
            </SpotlightCard>

            {/* Bento Card - 4 Columns */}
            <SpotlightCard 
              className="md:col-span-4 p-8 flex flex-col justify-between min-h-[260px]"
              spotlightColor="rgba(94, 106, 210, 0.15)"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/25 text-[#818cf8] flex items-center justify-center mb-6">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">SIPs, Stocks & Wealth Tracking</h3>
                <p className="text-sm text-[#8A8F98] mt-2 leading-relaxed max-w-xl">
                  Unified portfolio tracker for recurring mutual funds (SIPs), real-time stock quotes, return percentages, and capital allocation.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#8A8F98]">
                <span>Real-Time Market Tracking</span>
                <span className="text-[#EDEDEF] flex items-center gap-1.5 font-medium">
                  Active Sync <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              </div>
            </SpotlightCard>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#020203] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[#8A8F98] text-xs font-normal">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5E6AD2]" />
            <p>© {new Date().getFullYear()} MonthlyMoney. Engineering-grade personal finance.</p>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span className="hover:text-white cursor-pointer transition-colors">PRIVACY</span>
            <span className="hover:text-white cursor-pointer transition-colors">SECURITY</span>
            <span className="hover:text-white cursor-pointer transition-colors">MCP API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
