'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { setPendingCameraPhoto } from '@/lib/cameraBridge';
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
  ChevronRight,
  ChevronDown,
  Coins,
  Cpu,
  Sparkles,
  Layers,
  Camera
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleCameraOpen = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleCameraCaptured = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so subsequent captures trigger change event
    e.target.value = '';

    await setPendingCameraPhoto(file);

    if (pathname !== '/assistant') {
      router.push('/assistant?attachCamera=true');
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setMoreDropdownOpen(false);
  }, [pathname]);

  // Primary Navigation Links (Always easily accessible)
  const primaryLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'E-Passbook', path: '/transactions', icon: ReceiptText },
    { name: 'Stocks', path: '/stocks', icon: TrendingUp },
    { name: 'Reports', path: '/reports', icon: AreaChart, hideOnMd: true }, // Shown on lg+
    { name: 'AI Assistant', path: '/assistant', icon: Sparkles, isAi: true },
  ];

  // Secondary Tools (Grouped in sleek "More" dropdown on desktop)
  const secondaryLinks = [
    { name: 'Reports & Analytics', path: '/reports', icon: AreaChart, desc: 'Contribution graph & trends', showOnlyOnMd: true },
    { name: 'SIP Tracker', path: '/sips', icon: Coins, desc: 'Recurring investment plans' },
    { name: 'Campaigns & Streaks', path: '/notifications', icon: Bell, desc: 'Automated push alerts & streaks' },
    { name: 'MCP & Developer API', path: '/mcp', icon: Cpu, desc: 'External MCP server & API keys' },
    { name: 'Settings & Preferences', path: '/settings', icon: Settings, desc: 'Salary cycles & currency' },
  ];

  // All links for mobile slide-out drawer
  const allLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'E-Passbook', path: '/transactions', icon: ReceiptText },
    { name: 'Stocks Portfolio', path: '/stocks', icon: TrendingUp },
    { name: 'Reports & Insights', path: '/reports', icon: AreaChart },
    { name: 'AI Vision Assistant', path: '/assistant', icon: Sparkles },
    { name: 'SIP Tracker', path: '/sips', icon: Coins },
    { name: 'Campaigns & Streaks', path: '/notifications', icon: Bell },
    { name: 'MCP & API Keys', path: '/mcp', icon: Cpu },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Mobile Bottom Navigation Links (Streamlined to 4 primary tabs)
  const mobileBottomLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'E-Passbook', path: '/transactions', icon: ReceiptText },
    { name: 'Stocks', path: '/stocks', icon: TrendingUp },
    { name: 'AI Assistant', path: '/assistant', icon: Sparkles },
  ];

  // Check if any secondary link is currently active
  const isSecondaryActive = secondaryLinks.some(link => pathname === link.path);

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-nav">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-white hover:opacity-95 shrink-0">
            <span className="p-1.5 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-xl text-white shadow-md shadow-violet-600/20">
              <Wallet className="w-4.5 h-4.5" />
            </span>
            <span className="tracking-tight">Monthly<span className="text-violet-400">Money</span></span>
          </Link>

          {/* Navigation Links (Desktop & Tablet: md & md+) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" style={{ fontFamily: "'General Sans Variable', 'General Sans', -apple-system, sans-serif" }}>
            {primaryLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.path;

              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                    link.hideOnMd ? 'hidden lg:flex' : 'flex'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/20 to-cyan-500/20 text-violet-300 border-violet-500/35 shadow-[0_0_15px_-3px_rgba(139,92,246,0.25)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 text-violet-400' : 'text-slate-400'}`} />
                  <span>{link.name}</span>
                  {link.isAi && (
                    <span className="px-1.5 py-0.2 bg-gradient-to-r from-violet-500 to-cyan-400 text-[9px] font-black text-white rounded-full uppercase tracking-tighter shadow-sm">
                      AI
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Smart "More Tools" Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                  isSecondaryActive || moreDropdownOpen
                    ? 'bg-violet-600/15 text-violet-300 border-violet-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent'
                }`}
                title="More features and settings"
              >
                <Layers className={`w-4 h-4 ${isSecondaryActive ? 'text-violet-400' : 'text-slate-400'}`} />
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180 text-violet-400' : 'text-slate-500'}`} />
              </button>

              <AnimatePresence>
                {moreDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-slate-950/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 text-left"
                  >
                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Tools & Integrations
                      </span>
                    </div>

                    <div className="space-y-1">
                      {secondaryLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.path;

                        // Hide Reports in dropdown if screen is lg+ (since it's already shown in primary bar)
                        if (link.showOnlyOnMd) {
                          return (
                            <div key={link.path} className="lg:hidden">
                              <Link
                                href={link.path}
                                onClick={() => setMoreDropdownOpen(false)}
                                className={`flex items-start gap-3 p-2.5 rounded-xl text-xs transition-all ${
                                  isActive
                                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                              >
                                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-900 text-slate-400'}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-white block truncate">{link.name}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">{link.desc}</span>
                                </div>
                              </Link>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={link.path}
                            href={link.path}
                            onClick={() => setMoreDropdownOpen(false)}
                            className={`flex items-start gap-3 p-2.5 rounded-xl text-xs transition-all ${
                              isActive
                                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-900 text-slate-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-white block truncate">{link.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{link.desc}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* User Actions & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0" style={{ fontFamily: "'General Sans Variable', 'General Sans', -apple-system, sans-serif" }}>
            {/* Mobile Camera Quick-Capture Button */}
            <button
              type="button"
              onClick={handleCameraOpen}
              className="md:hidden p-2 text-violet-300 hover:text-white bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.2)]"
              aria-label="Open Camera to scan receipt"
              title="Open camera to scan receipt"
            >
              <Camera className="w-5 h-5 text-violet-400" />
            </button>

            {/* Hidden native camera capture input */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCaptured}
            />

            <div className="flex items-center gap-2 max-w-[150px]">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative w-8 h-8 rounded-full bg-slate-950 border border-white/10 text-violet-400 flex items-center justify-center shrink-0 overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">{user?.displayName || 'User'}</span>
                <span className="text-[9px] text-slate-500 truncate max-w-[100px]">{user?.email}</span>
              </div>
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={logout}
              className="hidden md:flex p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all cursor-pointer active:scale-90"
              title="Log Out"
              style={{ fontFamily: "'General Sans Variable', 'General Sans', -apple-system, sans-serif" }}
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
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#030712]/95 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-10px_30px_rgba(0,0,0,0.7)] pt-2 px-1 flex items-center justify-between"
        style={{ 
          paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          fontFamily: "'General Sans Variable', 'General Sans', -apple-system, sans-serif" 
        }}
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
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110 text-violet-450 filter drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]' : 'text-slate-400'}`} />
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
              className="absolute top-0 right-0 h-full w-[80vw] max-w-[320px] bg-slate-950/45 backdrop-blur-3xl border-l border-white/[0.08] shadow-2xl flex flex-col justify-between"
            >
              {/* Header inside Drawer */}
              <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="p-1.5 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg text-white">
                    <Wallet className="w-4 h-4" />
                  </span>
                  <span className="text-sm">MonthlyMoney</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      logout();
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer active:scale-95"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDrawerOpen(false)} 
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all cursor-pointer"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content Area */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                {/* Profile Widget */}
                <div className="p-4 bg-white/[0.03] border border-white/[0.07] backdrop-blur-md rounded-2xl flex items-center gap-3">
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
                  {allLinks.map((link) => {
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


            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
