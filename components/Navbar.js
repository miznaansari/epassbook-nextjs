'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
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
  ChevronLeft,
  ChevronDown,
  Coins,
  Cpu,
  Sparkles,
  PiggyBank,
  Layers,
  Camera,
  Compass,
  SlidersHorizontal,
  Zap,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar, mounted } = useSidebar();
  const { theme, resolvedTheme, toggleTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Close mobile drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Categorized Navigation Groups for Desktop Sidebar & Mobile Drawer
  const navigationGroups = [
    {
      category: 'Core Finance',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: null },
        { name: 'E-Passbook', path: '/transactions', icon: ReceiptText, badge: null },
        { name: 'Saving Management', path: '/savings', icon: PiggyBank, badge: 'Pots & SIP' },
        { name: 'Stocks Portfolio', path: '/stocks', icon: TrendingUp, badge: 'Live Quotes' },
      ]
    },
    {
      category: 'Intelligence & AI',
      items: [
        { name: 'AI Vision Assistant', path: '/assistant', icon: Sparkles, badge: 'OCR Vision', isAi: true },
        { name: 'Reports & Analytics', path: '/reports', icon: AreaChart, badge: 'Graphs' },
      ]
    },
    {
      category: 'Automation & System',
      items: [
        { name: 'SIP Investment Plans', path: '/sips', icon: Coins, badge: null },
        { name: 'Campaigns & Alerts', path: '/notifications', icon: Bell, badge: null },
        { name: 'MCP & Developer API', path: '/mcp', icon: Cpu, badge: 'Dev' },
        { name: 'App Settings', path: '/settings', icon: Settings, badge: null },
      ]
    }
  ];

  // Mobile Bottom Navigation Links (5 High-Ergonomic Touch Targets)
  const mobileBottomLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Passbook', path: '/transactions', icon: ReceiptText },
    { name: 'Savings', path: '/savings', icon: PiggyBank },
    { name: 'AI Assistant', path: '/assistant', icon: Sparkles, isAi: true },
  ];

  // Helper to get active page title for top bar breadcrumb
  const getCurrentPageTitle = () => {
    for (const group of navigationGroups) {
      const match = group.items.find(item => item.path === pathname);
      if (match) return match.name;
    }
    return 'Financial Overview';
  };

  return (
    <>
      {/* Hidden native camera capture input for receipt OCR */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCaptured}
      />

      {/* ========================================================================= */}
      {/* 1. DESKTOP / TABLET COLLAPSIBLE LEFT SIDEBAR (>= md)                       */}
      {/* ========================================================================= */}
      <aside 
        className={`hidden md:flex fixed top-0 left-0 bottom-0 z-40 flex-col bg-[#060608]/95 backdrop-blur-3xl border-r border-white/[0.08] shadow-[4px_0_30px_rgba(0,0,0,0.85)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Sidebar Header: Logo & Collapse / Expand Toggle */}
        <div className={`h-16 border-b border-white/[0.08] flex items-center justify-between px-3.5 transition-all ${
          isCollapsed ? 'justify-center px-2' : 'px-4'
        }`}>
          {/* Brand Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2.5 group transition-transform duration-200 active:scale-98 min-w-0"
            title="MonthlyMoney Ledger"
          >
            <div className="relative p-2 bg-gradient-to-tr from-[#5E6AD2] via-[#7056E0] to-[#4B55B0] rounded-xl text-white shadow-[0_0_16px_rgba(94,106,210,0.4),inset_0_1px_0_0_rgba(255,255,255,0.3)] shrink-0 group-hover:shadow-[0_0_22px_rgba(94,106,210,0.6)] transition-all">
              <Wallet className="w-4 h-4 transition-transform group-hover:scale-105" />
            </div>

            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col min-w-0 truncate"
              >
                <span className="text-sm font-semibold tracking-tight text-[#EDEDEF] group-hover:text-white flex items-center gap-1">
                  <span>Monthly</span>
                  <span className="bg-gradient-to-r from-[#818cf8] via-[#a5b4fc] to-[#6366f1] bg-clip-text text-transparent font-bold">
                    Money
                  </span>
                </span>
                <span className="text-[9px] text-[#8A8F98] font-mono tracking-wider uppercase -mt-0.5 truncate">
                  Precision Ledger
                </span>
              </motion.div>
            )}
          </Link>

          {/* Toggle Sidebar Button (Collapse / Expand) */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={`p-1.5 text-[#8A8F98] hover:text-white hover:bg-white/[0.06] rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 ${
              isCollapsed ? 'hidden' : 'flex'
            }`}
            title="Collapse Sidebar (Icon Only)"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* If Collapsed, show Expand toggle below logo */}
        {isCollapsed && (
          <div className="pt-2 pb-1 flex justify-center border-b border-white/[0.04]">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 text-[#8A8F98] hover:text-white hover:bg-white/[0.06] rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#818cf8]" />
            </button>
          </div>
        )}

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 sidebar-scrollbar">
          {navigationGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {/* Category Header (Only visible when Expanded) */}
              {!isCollapsed && (
                <div className="px-2.5 pt-1 pb-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8A8F98]/70 truncate">
                  {group.category}
                </div>
              )}

              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;

                  // ----------------------------------------------------
                  // Collapsed State (Icon-Only Mode with Tooltip)
                  // ----------------------------------------------------
                  if (isCollapsed) {
                    return (
                      <div key={item.path} className="relative group flex justify-center py-0.5">
                        <Link
                          href={item.path}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
                            isActive
                              ? 'bg-gradient-to-b from-[#5E6AD2]/30 to-[#5E6AD2]/10 border border-[#5E6AD2]/40 text-[#818cf8] shadow-[0_0_16px_rgba(94,106,210,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)] scale-105'
                              : 'text-[#8A8F98] hover:text-white hover:bg-white/[0.05] border border-transparent active:scale-95'
                          }`}
                        >
                          <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#818cf8]' : 'text-[#8A8F98]'}`} />

                          {/* AI Pulse Dot */}
                          {item.isAi && !isActive && (
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-pulse shadow-[0_0_6px_#818cf8]" />
                          )}

                          {/* Active Indicator Bar on left edge */}
                          {isActive && (
                            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-[#818cf8] rounded-r-full shadow-[0_0_8px_#818cf8]" />
                          )}
                        </Link>

                        {/* Floating Tooltip on Hover */}
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0a0a0c]/98 border border-white/[0.12] rounded-xl text-xs text-white font-medium whitespace-nowrap shadow-[0_10px_25px_rgba(0,0,0,0.9)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                              item.isAi 
                                ? 'bg-[#5E6AD2]/25 text-[#a5b4fc] border border-[#5E6AD2]/40' 
                                : 'bg-white/[0.06] text-[#8A8F98] border border-white/[0.08]'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // ----------------------------------------------------
                  // Expanded State (Icon + Label + Badges)
                  // ----------------------------------------------------
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border ${
                        isActive
                          ? 'bg-[#5E6AD2]/15 border-[#5E6AD2]/30 text-white shadow-[0_0_12px_rgba(94,106,210,0.2),inset_0_1px_0_0_rgba(255,255,255,0.1)] font-semibold'
                          : 'bg-transparent border-transparent text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          isActive 
                            ? 'bg-[#5E6AD2]/30 text-[#818cf8]' 
                            : 'bg-white/[0.03] text-[#8A8F98]'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded-md ${
                            item.isAi 
                              ? 'bg-gradient-to-r from-[#5E6AD2]/30 to-[#818cf8]/20 border border-[#818cf8]/40 text-[#a5b4fc] shadow-[0_0_8px_rgba(94,106,210,0.25)]' 
                              : 'bg-white/[0.05] text-[#8A8F98] border border-white/[0.06]'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: Quick Actions, Theme Switcher & User Profile */}
        <div className="p-3 border-t border-white/[0.08] bg-white/[0.01] space-y-2">
          {/* Quick OCR Scan Button */}
          {!isCollapsed ? (
            <button
              type="button"
              onClick={handleCameraOpen}
              className="w-full py-2 px-3 text-xs font-semibold text-[#818cf8] hover:text-white bg-[#5E6AD2]/10 hover:bg-[#5E6AD2]/20 border border-[#5E6AD2]/25 hover:border-[#5E6AD2]/40 rounded-xl transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(94,106,210,0.15)]"
            >
              <Camera className="w-3.5 h-3.5 text-[#818cf8]" />
              <span>Scan Receipt OCR</span>
            </button>
          ) : (
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={handleCameraOpen}
                className="w-11 h-11 text-[#818cf8] hover:text-white bg-[#5E6AD2]/10 hover:bg-[#5E6AD2]/20 border border-[#5E6AD2]/25 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-[0_0_12px_rgba(94,106,210,0.15)]"
                aria-label="Scan Receipt OCR"
              >
                <Camera className="w-4 h-4 text-[#818cf8]" />
              </button>
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0a0a0c]/98 border border-white/[0.12] rounded-xl text-xs text-white font-medium whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                Scan Receipt OCR
              </div>
            </div>
          )}

          {/* Theme Toggle Button */}
          {!isCollapsed ? (
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full py-2 px-3 text-xs font-medium text-[#8A8F98] hover:text-[#EDEDEF] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-xl transition-all cursor-pointer active:scale-98 flex items-center justify-between"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              <div className="flex items-center gap-2">
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-[#818cf8]" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <span className="text-[10px] font-mono uppercase text-[#8A8F98]/70 px-1.5 py-0.5 rounded bg-white/[0.04]">
                {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>
          ) : (
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-11 h-11 text-[#8A8F98] hover:text-[#EDEDEF] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-4 h-4 text-[#818cf8]" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </button>
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0a0a0c]/98 border border-white/[0.12] rounded-xl text-xs text-white font-medium whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                Switch to {resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode
              </div>
            </div>
          )}

          {/* User Profile Card */}
          {!isCollapsed ? (
            <div className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0a0a0c] border border-white/10 text-[#818cf8] flex items-center justify-center overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-[#8A8F98]" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#060608]" />
                </div>
                <div className="flex flex-col text-left min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[#EDEDEF] truncate">
                    {user?.displayName || 'User'}
                  </span>
                  <span className="text-[9px] text-[#8A8F98] truncate font-mono">
                    {user?.email || 'synced'}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-[#8A8F98] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative group flex justify-center">
              <div className="relative shrink-0 cursor-pointer" onClick={logout}>
                <div className="w-10 h-10 rounded-xl bg-[#0a0a0c] border border-white/10 text-[#818cf8] flex items-center justify-center overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-[#8A8F98]" />
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#060608]" />
              </div>
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0a0a0c]/98 border border-white/[0.12] rounded-xl text-xs text-white font-medium whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex flex-col">
                <span className="font-semibold">{user?.displayName || 'User'}</span>
                <span className="text-[9px] text-rose-400">Click to Log Out</span>
              </div>
            </div>
          )}
        </div>
      </aside>


      {/* ========================================================================= */}
      {/* 2. DESKTOP / TABLET TOP CONTEXT HEADER (>= md)                             */}
      {/* ========================================================================= */}
      <header 
        className="hidden md:flex sticky top-0 z-30 h-16 w-full bg-[#050506]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.7)]"
      >
        <div className="w-full px-6 flex items-center justify-between">
          {/* Breadcrumb / Page Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span className="text-[#8A8F98]">Portal</span>
              <span className="text-white/40">/</span>
              <span className="text-white">{getCurrentPageTitle()}</span>
            </h1>
          </div>

          {/* Top Right Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Live Sync Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE LEDGER</span>
            </div>

            {/* Quick OCR Scan Button */}
            <button
              type="button"
              onClick={handleCameraOpen}
              className="px-3 py-1.5 text-xs font-semibold text-[#818cf8] hover:text-white bg-[#5E6AD2]/10 hover:bg-[#5E6AD2]/20 border border-[#5E6AD2]/25 hover:border-[#5E6AD2]/40 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
              title="Upload / Scan Receipt"
            >
              <Camera className="w-3.5 h-3.5 text-[#818cf8]" />
              <span>Scan Receipt</span>
            </button>

            {/* Top Bar Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-[#8A8F98] hover:text-[#EDEDEF] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/15 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-[#818cf8]" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div className="w-6 h-6 rounded-md bg-[#0a0a0c] border border-white/10 text-[#818cf8] flex items-center justify-center overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3 h-3 text-[#8A8F98]" />
                )}
              </div>
              <span className="text-xs font-medium text-[#EDEDEF] max-w-[120px] truncate">
                {user?.displayName ? user.displayName.split(' ')[0] : 'User'}
              </span>
            </div>
          </div>
        </div>
      </header>


      {/* ========================================================================= */}
      {/* 3. MOBILE TOP HEADER (< md)                                               */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-50 w-full bg-[#050506]/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.7)] transition-all">
        <div className="px-4 h-15 flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 group active:scale-98"
          >
            <div className="p-1.5 bg-gradient-to-tr from-[#5E6AD2] to-[#7056E0] rounded-xl text-white shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex items-center">
              <span className="text-sm font-semibold tracking-tight text-white">Monthly</span>
              <span className="text-sm font-bold bg-gradient-to-r from-[#818cf8] via-[#a5b4fc] to-[#6366f1] bg-clip-text text-transparent">
                Money
              </span>
            </div>
          </Link>

          {/* Right Action Hub: Camera, Theme, Profile & Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick OCR Scan Button */}
            <button
              type="button"
              onClick={handleCameraOpen}
              className="p-2 text-[#818cf8] bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-sm"
              aria-label="Scan Receipt"
              title="Open Camera to scan receipt"
            >
              <Camera className="w-4 h-4 text-[#818cf8]" />
            </button>

            {/* Mobile Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-[#8A8F98] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="Toggle Theme"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-[#818cf8]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {/* User Avatar */}
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-[#0a0a0c] border border-white/10 text-[#818cf8] flex items-center justify-center overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3 h-3 text-[#8A8F98]" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#050506]" />
            </div>

            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 text-[#8A8F98] hover:text-white bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/[0.08] transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>


      {/* ========================================================================= */}
      {/* 4. GEN-Z / ALPHA FLOATING CAPSULE DOCK (< md)                             */}
      {/* ========================================================================= */}
      <div 
        className="fixed left-3 right-3 max-w-[420px] mx-auto z-50 md:hidden"
        style={{ 
          bottom: 'max(10px, calc(env(safe-area-inset-bottom, 0px) + 6px))',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
      >
        <nav 
          className="relative floating-bottom-dock rounded-full p-1.5 flex items-center justify-between transition-all duration-200"
        >
          {/* Ambient Top Glow Line */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#5E6AD2]/30 to-transparent" />

          {mobileBottomLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.path;

            return (
              <Link
                key={link.path}
                href={link.path}
                className={`relative flex flex-col items-center justify-center h-12 flex-1 rounded-full transition-all duration-200 active:scale-90 select-none ${
                  isActive ? 'dock-item-active' : 'dock-item-inactive'
                }`}
              >
                {/* Active Floating Spring Pill */}
                {isActive && (
                  <motion.div
                    layoutId="genzActiveTab"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute inset-0 dock-active-pill rounded-full"
                  />
                )}

                {/* Icon & AI indicator */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    <Icon 
                      className={`w-[18px] h-[18px] transition-all duration-200 ${
                        isActive 
                          ? 'scale-105 drop-shadow-[0_0_8px_rgba(94,106,210,0.5)]' 
                          : 'opacity-85'
                      }`} 
                    />
                    {link.isAi && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gradient-to-r from-[#5E6AD2] to-[#818cf8] animate-pulse shadow-[0_0_8px_#5E6AD2]" />
                    )}
                  </div>

                  <span className={`text-[9px] tracking-tight mt-0.5 leading-none truncate max-w-[56px] text-center ${
                    isActive ? 'font-bold' : 'font-medium'
                  }`}>
                    {link.name}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* 5th Dock Action: Menu / More Drawer Trigger */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`relative flex flex-col items-center justify-center h-12 flex-1 rounded-full transition-all duration-200 active:scale-90 cursor-pointer select-none ${
              drawerOpen ? 'dock-item-active' : 'dock-item-inactive'
            }`}
            aria-label="Open Navigation Menu"
          >
            {drawerOpen && (
              <motion.div
                layoutId="genzActiveTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute inset-0 dock-active-pill rounded-full"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <Menu className={`w-[18px] h-[18px] transition-transform ${drawerOpen ? 'scale-105' : 'opacity-85'}`} />
              <span className={`text-[9px] tracking-tight mt-0.5 leading-none truncate max-w-[56px] text-center ${
                drawerOpen ? 'font-bold' : 'font-medium'
              }`}>
                Menu
              </span>
            </div>
          </button>
        </nav>
      </div>


      {/* ========================================================================= */}
      {/* 5. MOBILE SLIDE-OUT NAVIGATION DRAWER (< md)                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[100] md:hidden overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute top-0 right-0 h-full w-[85vw] max-w-[340px] bg-[#08080a]/98 backdrop-blur-3xl border-l border-white/[0.1] shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col justify-between"
            >
              {/* Header inside Drawer */}
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-2.5 font-semibold text-white">
                  <div className="p-1.5 bg-gradient-to-tr from-[#5E6AD2] to-[#7056E0] rounded-xl text-white shadow-sm">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold tracking-tight">MonthlyMoney</span>
                </div>
                
                <button 
                  onClick={() => setDrawerOpen(false)} 
                  className="p-1.5 text-[#8A8F98] hover:text-white hover:bg-white/[0.06] rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content Area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 sidebar-scrollbar">
                
                {/* User Profile Card */}
                <div className="p-3.5 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] backdrop-blur-md rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-[#5E6AD2]/20 border border-[#5E6AD2]/30 text-[#818cf8] flex items-center justify-center shrink-0 overflow-hidden">
                        {user?.photoURL ? (
                          <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#08080a]" />
                    </div>
                    <div className="flex flex-col text-left min-w-0 flex-1">
                      <span className="text-xs font-semibold text-[#EDEDEF] truncate">
                        {user?.displayName || 'User'}
                      </span>
                      <span className="text-[10px] text-[#8A8F98] truncate font-mono">
                        {user?.email || 'synced account'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      logout();
                    }}
                    className="p-2 text-[#8A8F98] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-white/[0.06] hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Theme Switcher in Drawer */}
                <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#EDEDEF] flex items-center gap-2">
                      {resolvedTheme === 'dark' ? <Moon className="w-3.5 h-3.5 text-[#818cf8]" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      Appearance Theme
                    </span>
                    <span className="text-[10px] font-mono text-[#8A8F98] uppercase px-1.5 py-0.5 bg-white/[0.04] rounded">
                      {theme}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'system', label: 'Auto', icon: Monitor },
                    ].map((t) => {
                      const IconComp = t.icon;
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#5E6AD2]/20 border-[#5E6AD2]/40 text-white font-semibold shadow-sm'
                              : 'bg-white/[0.02] border-transparent text-[#8A8F98] hover:text-white'
                          }`}
                        >
                          <IconComp className="w-3 h-3" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Categorized Navigation Groups */}
                <div className="space-y-4">
                  {navigationGroups.map((group, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8A8F98]">
                        {group.category}
                      </span>
                      <div className="space-y-0.5 mt-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.path;

                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              onClick={() => setDrawerOpen(false)}
                              className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                                isActive
                                  ? 'bg-[#5E6AD2]/15 border-[#5E6AD2]/30 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                                  : 'bg-transparent border-transparent text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.03]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#5E6AD2]/30 text-[#818cf8]' : 'bg-white/[0.04] text-[#8A8F98]'}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className={isActive ? 'font-semibold text-white' : ''}>{item.name}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {item.badge && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded-md ${
                                    item.isAi 
                                      ? 'bg-[#5E6AD2]/25 text-[#818cf8] border border-[#5E6AD2]/40'
                                      : 'bg-white/[0.05] text-[#8A8F98] border border-white/[0.06]'
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-[#8A8F98]/50" />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drawer Footer with Version & Logout */}
              <div className="p-4 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#8A8F98]">
                  v0.1.39 • Precision Ledger
                </span>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
