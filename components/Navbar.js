'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  LayoutDashboard, 
  ReceiptText, 
  AreaChart, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User,
  TrendingUp,
  Bell,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'E-Passbook', path: '/transactions', icon: ReceiptText },
    { name: 'Stocks', path: '/stocks', icon: TrendingUp },
    { name: 'Reports', path: '/reports', icon: AreaChart },
    { name: 'Campaigns', path: '/notifications', icon: Bell },
    { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Mobile Bottom Navigation Links (Streamlined to 4 primary tabs)
  const mobileBottomLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'E-Passbook', path: '/transactions', icon: ReceiptText },
    { name: 'Stocks', path: '/stocks', icon: TrendingUp },
    { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white hover:opacity-95">
            <span className="p-1.5 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg text-white">
              <Wallet className="w-4.5 h-4.5" />
            </span>
            <span>Monthly<span className="text-violet-400">Money</span></span>
          </Link>

          {/* Navigation Links (Desktop Only) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.path;

              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Actions & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 max-w-[150px]">
              <div className="w-8 h-8 rounded-full bg-violet-600/25 border border-violet-500/35 text-violet-400 flex items-center justify-center shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">{user?.displayName || 'User'}</span>
                <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{user?.email}</span>
              </div>
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={logout}
              className="hidden md:flex p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation Bar (Streamlined to 5 Items) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#02040a]/95 backdrop-blur-xl border-t border-white/5 shadow-2xl pt-2 px-1 flex items-center justify-between"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        {mobileBottomLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.path;

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-200 flex-1 min-w-0 ${
                isActive
                  ? 'text-violet-400 font-bold'
                  : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-violet-400' : 'text-slate-400'}`} />
              <span className="text-[8px] uppercase tracking-wider font-extrabold truncate w-full text-center">{link.name.split(' ')[0]}</span>
            </Link>
          );
        })}

        {/* 5th Menu Item: More */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-200 flex-1 min-w-0 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Menu className="w-5 h-5 text-slate-400" />
          <span className="text-[8px] uppercase tracking-wider font-extrabold truncate w-full text-center">Menu</span>
        </button>
      </nav>

      {/* Navigation Drawer Slide-out Sidebar */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[100] md:hidden overflow-hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
            />

            {/* Sidebar drawer body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-[80vw] max-w-[320px] bg-[#0c1221] border-l border-white/[0.08] shadow-2xl flex flex-col justify-between"
            >
              {/* Header inside Drawer */}
              <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="p-1.5 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg text-white">
                    <Wallet className="w-4 h-4" />
                  </span>
                  <span className="text-sm">MonthlyMoney</span>
                </div>
                <button 
                  onClick={() => setDrawerOpen(false)} 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Drawer Content Area */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                {/* Profile Widget */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-600/25 border border-violet-500/35 text-violet-400 flex items-center justify-center shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex flex-col text-left min-w-0 flex-1">
                    <span className="text-xs font-bold text-white truncate">{user?.displayName || 'User'}</span>
                    <span className="text-[10px] text-slate-500 truncate">{user?.email}</span>
                  </div>
                </div>

                {/* Navigation Links list */}
                <div className="space-y-1">
                  {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.path;

                    return (
                      <Link
                        key={link.path}
                        href={link.path}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                          isActive
                            ? 'bg-violet-600/10 border-violet-500/20 text-violet-400 shadow-lg shadow-violet-600/5'
                            : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                          <span>{link.name}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Log Out at the bottom */}
              <div className="p-5 border-t border-white/[0.05]">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2 w-full justify-center py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-350 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer font-black"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Session</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
