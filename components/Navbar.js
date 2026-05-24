'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Wallet, 
  LayoutDashboard, 
  ReceiptText, 
  AreaChart, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User 
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'E-Passbook', path: '/transactions', icon: ReceiptText },
    { name: 'Reports', path: '/reports', icon: AreaChart },
    { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white hover:opacity-95">
          <span className="p-1.5 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg text-white">
            <Wallet className="w-4.5 h-4.5" />
          </span>
          <span className="hidden sm:inline">Monthly<span className="text-violet-400">Money</span></span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
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
                <span className="hidden md:inline">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 max-w-[150px]">
            <div className="w-8 h-8 rounded-full bg-violet-600/25 border border-violet-500/35 text-violet-400 flex items-center justify-center shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-white truncate max-w-[100px]">{user?.displayName || 'User'}</span>
              <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{user?.email}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
