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
          <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold text-base text-[#EDEDEF] hover:text-white transition-colors shrink-0 group">
            <span className="p-1.5 bg-gradient-to-b from-[#5E6AD2] to-[#4B55B0] rounded-lg text-white shadow-[0_0_12px_rgba(94,106,210,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)]">
              <Wallet className="w-4 h-4" />
            </span>
            <span className="tracking-tight font-medium">Monthly<span className="text-[#818cf8]">Money</span></span>
          </Link>

          {/* Navigation Links (Desktop & Tablet: md & md+) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {primaryLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.path;

              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    link.hideOnMd ? 'hidden lg:flex' : 'flex'
                  } ${
                    isActive
                      ? 'bg-white/[0.08] text-white border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                      : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-[#818cf8]' : 'text-[#8A8F98]'}`} />
                  <span>{link.name}</span>
                  {link.isAi && (
                    <span className="px-1.5 py-0.2 bg-[#5E6AD2]/20 border border-[#5E6AD2]/30 text-[9px] font-mono font-semibold text-[#818cf8] rounded-full uppercase tracking-wider">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] border cursor-pointer ${
                  isSecondaryActive || moreDropdownOpen
                    ? 'bg-white/[0.08] text-white border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                    : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04] border-transparent'
                }`}
                title="More features and settings"
              >
                <Layers className={`w-3.5 h-3.5 ${isSecondaryActive ? 'text-[#818cf8]' : 'text-[#8A8F98]'}`} />
                <span>More</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180 text-white' : 'text-[#8A8F98]'}`} />
              </button>

              <AnimatePresence>
                {moreDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-64 bg-[#0a0a0c]/95 border border-white/10 rounded-xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl z-50 text-left"
                  >
                    <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#8A8F98]">
                        Tools & Integrations
                      </span>
                    </div>

                    <div className="space-y-0.5">
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
                                className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-all ${
                                  isActive
                                    ? 'bg-[#5E6AD2]/15 text-white border border-[#5E6AD2]/30'
                                    : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04] border border-transparent'
                                }`}
                              >
                                <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${isActive ? 'bg-[#5E6AD2]/20 text-[#818cf8]' : 'bg-white/[0.03] text-[#8A8F98]'}`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-[#EDEDEF] block truncate">{link.name}</span>
                                  <span className="text-[10px] text-[#8A8F98] block truncate">{link.desc}</span>
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
                            className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-all ${
                              isActive
                                ? 'bg-[#5E6AD2]/15 text-white border border-[#5E6AD2]/30'
                                : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04] border border-transparent'
                            }`}
                          >
                            <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${isActive ? 'bg-[#5E6AD2]/20 text-[#818cf8]' : 'bg-white/[0.03] text-[#8A8F98]'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-[#EDEDEF] block truncate">{link.name}</span>
                              <span className="text-[10px] text-[#8A8F98] block truncate">{link.desc}</span>
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
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Camera Quick-Capture Button */}
            <button
              type="button"
              onClick={handleCameraOpen}
              className="md:hidden p-2 text-[#818cf8] hover:text-white bg-[#5E6AD2]/10 hover:bg-[#5E6AD2]/20 border border-[#5E6AD2]/25 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="Open Camera to scan receipt"
              title="Open camera to scan receipt"
            >
              <Camera className="w-4 h-4 text-[#818cf8]" />
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

            <div className="flex items-center gap-2.5 max-w-[160px]">
              <div className="relative group">
                <div className="w-8 h-8 rounded-full bg-[#0a0a0c] border border-white/10 text-[#818cf8] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-[#8A8F98]" />
                  )}
                </div>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#EDEDEF] truncate max-w-[110px]">{user?.displayName || 'User'}</span>
                <span className="text-[10px] text-[#8A8F98] truncate max-w-[110px] font-mono">{user?.email}</span>
              </div>
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={logout}
              className="hidden md:flex p-2 text-[#8A8F98] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all cursor-pointer active:scale-95"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.05] rounded-lg border border-white/[0.06] transition-all cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#050506]/95 backdrop-blur-2xl border-t border-white/[0.06] shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pt-2 px-1 flex items-center justify-between"
        style={{ 
          paddingBottom: 'max(10px, calc(env(safe-area-inset-bottom, 0px) + 6px))',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
      >
        {mobileBottomLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.path;

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg transition-all duration-200 flex-1 min-w-0 ${
                isActive
                  ? 'text-white font-medium'
                  : 'text-[#8A8F98] hover:text-[#EDEDEF]'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 text-[#818cf8]' : 'text-[#8A8F98]'}`} />
              <span className="text-[9px] tracking-tight font-medium truncate w-full text-center">{link.name.split(' ')[0]}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#5E6AD2]" />
              )}
            </Link>
          );
        })}

        {/* 5th Menu Item: More */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-1 rounded-lg transition-all duration-200 flex-1 min-w-0 text-[#8A8F98] hover:text-[#EDEDEF] cursor-pointer"
        >
          <Menu className="w-4 h-4 text-[#8A8F98]" />
          <span className="text-[9px] tracking-tight font-medium truncate w-full text-center">Menu</span>
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
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            {/* Sidebar drawer body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute top-0 right-0 h-full w-[80vw] max-w-[320px] bg-[#0a0a0c]/98 backdrop-blur-3xl border-l border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col justify-between"
            >
              {/* Header inside Drawer */}
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <span className="p-1.5 bg-[#5E6AD2] rounded-lg text-white">
                    <Wallet className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-medium">MonthlyMoney</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      logout();
                    }}
                    className="p-1.5 text-[#8A8F98] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer active:scale-95"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDrawerOpen(false)} 
                    className="p-1.5 text-[#8A8F98] hover:text-white hover:bg-white/[0.05] rounded-lg border border-transparent hover:border-white/10 transition-all cursor-pointer"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Content Area */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
                {/* Profile Widget */}
                <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] backdrop-blur-md rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#5E6AD2]/20 border border-[#5E6AD2]/30 text-[#818cf8] flex items-center justify-center shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col text-left min-w-0 flex-1">
                    <span className="text-xs font-semibold text-[#EDEDEF] truncate">{user?.displayName || 'User'}</span>
                    <span className="text-[10px] text-[#8A8F98] truncate font-mono">{user?.email}</span>
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
                        className={`flex items-center justify-between p-3 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          isActive
                            ? 'bg-white/[0.08] border-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                            : 'bg-transparent border-transparent text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-[#818cf8]' : 'text-[#8A8F98]'}`} />
                          <span>{link.name}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-[#8A8F98]/50" />
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
