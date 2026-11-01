'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useKeyboard } from '@/context/KeyboardContext';
import { motion } from 'framer-motion';
import { setPendingCameraPhoto } from '@/lib/cameraBridge';
import { ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import Icon3D from '@/components/ui/Icon3D';
import ThemeToggle from '@/components/ui/ThemeToggle';

// Navigation model (shared by sidebar, drawer and page titles)
const NAV_GROUPS = [
  {
    category: 'Money',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: 'home' },
      { name: 'Passbook', path: '/transactions', icon: 'passbook' },
      { name: 'Savings', path: '/savings', icon: 'savings' },
      { name: 'Stocks', path: '/stocks', icon: 'stocks' },
      { name: 'SIP plans', path: '/sips', icon: 'sips' },
    ],
  },
  {
    category: 'Insights',
    items: [
      { name: 'AI Assistant', path: '/assistant', icon: 'assistant', badge: 'AI' },
      { name: 'Reports', path: '/reports', icon: 'reports' },
    ],
  },
  {
    category: 'More',
    items: [
      { name: 'Alerts', path: '/notifications', icon: 'alerts' },
      { name: 'Developer API', path: '/mcp', icon: 'developer' },
      { name: 'Settings', path: '/settings', icon: 'settings' },
    ],
  },
];

const DOCK_LINKS = [
  { name: 'Home', path: '/dashboard', icon: 'home' },
  { name: 'Passbook', path: '/transactions', icon: 'passbook' },
  { name: 'AI', path: '/assistant', icon: 'assistant', center: true },
  { name: 'Savings', path: '/savings', icon: 'savings' },
];

function pageTitle(pathname) {
  for (const g of NAV_GROUPS) {
    const hit = g.items.find(i => i.path === pathname);
    if (hit) return hit.name;
  }
  return 'MonthlyMoney';
}

function Logo({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hero shadow-glow-primary">
        <Icon3D name="savings" size={22} />
      </span>
      {!compact && (
        <span className="font-display text-[15px] font-extrabold tracking-tight text-ink truncate">
          Monthly<span className="text-primary">Money</span>
        </span>
      )}
    </span>
  );
}

function Avatar({ user, size = 32 }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft"
      style={{ width: size, height: size }}
    >
      {user?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon3D name="user" size={Math.round(size * 0.62)} />
      )}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { isKeyboardOpen } = useKeyboard();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Route the user just tapped. Highlighting it immediately (instead of after the
  // new page commits) makes the dock/sidebar respond on touch.
  const [pendingPath, setPendingPath] = useState(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const cameraInputRef = useRef(null);
  const closeButtonRef = useRef(null);

  // A completed navigation (link, back/forward, redirect) settles both the
  // optimistic highlight and the drawer.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setPendingPath(null);
    setDrawerOpen(false);
  }

  const activePath = pendingPath ?? pathname;

  const markNav = (path) => (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    setPendingPath(path);
  };

  const navigateFromDrawer = (path) => (e) => {
    markNav(path)(e);
    setDrawerOpen(false);
  };

  // While the drawer is open: lock page scroll, close on Escape, focus the close button.
  useEffect(() => {
    if (!drawerOpen) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    closeButtonRef.current?.focus({ preventScroll: true });
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      root.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const handleCameraOpen = () => cameraInputRef.current?.click();

  const handleCameraCaptured = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow capturing the same file again
    await setPendingCameraPhoto(file);
    if (pathname !== '/assistant') router.push('/assistant?attachCamera=true');
  };

  const displayName = user?.displayName || user?.name || 'You';

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCaptured}
      />

      {/* ============ Desktop sidebar (md+) ============ */}
      <aside
        data-ui="v2"
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-card border-r border-line transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <div className={`h-16 flex items-center border-b border-line ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <Link href="/dashboard" title="MonthlyMoney" className="min-w-0" onClick={markNav('/dashboard')}>
            <Logo compact={isCollapsed} />
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-card-2 cursor-pointer"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div className="flex justify-center py-2 border-b border-line">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-ink-3 hover:text-ink hover:bg-card-2 cursor-pointer"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 sidebar-scrollbar" aria-label="Main">
          {NAV_GROUPS.map(group => (
            <div key={group.category}>
              {!isCollapsed && (
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{group.category}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const active = activePath === item.path;
                  return (
                    <li key={item.path} className="relative group">
                      <Link
                        href={item.path}
                        onClick={markNav(item.path)}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex items-center gap-3 rounded-xl transition-colors ${
                          isCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'px-2 py-1.5'
                        } ${active ? 'bg-primary-soft text-primary-ink font-semibold' : 'text-ink-2 hover:text-ink hover:bg-card-2'}`}
                      >
                        {active && !isCollapsed && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-primary" aria-hidden="true" />}
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-card shadow-card' : ''}`}>
                          <Icon3D name={item.icon} size={24} />
                        </span>
                        {!isCollapsed && <span className="flex-1 truncate text-[13px]">{item.name}</span>}
                        {!isCollapsed && item.badge && (
                          <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold text-secondary-ink">{item.badge}</span>
                        )}
                      </Link>
                      {isCollapsed && (
                        <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-ink shadow-pop opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.name}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3 space-y-2">
          <button
            type="button"
            onClick={handleCameraOpen}
            title="Scan a receipt"
            className={`w-full flex items-center gap-2 rounded-xl bg-secondary-soft text-secondary-ink font-semibold text-[13px] hover:brightness-95 dark:hover:brightness-125 transition cursor-pointer ${
              isCollapsed ? 'justify-center h-11' : 'px-3 py-2'
            }`}
          >
            <Icon3D name="camera" size={22} />
            {!isCollapsed && <span>Scan receipt</span>}
          </button>

          <div className={`flex items-center gap-2 rounded-xl ${isCollapsed ? 'flex-col' : 'p-1.5 bg-card-2'}`}>
            <Avatar user={user} size={isCollapsed ? 36 : 34} />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{displayName}</p>
                <p className="truncate text-[11px] text-ink-3">{user?.email || ''}</p>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-lg text-ink-3 hover:text-danger-ink hover:bg-danger-soft cursor-pointer"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============ Desktop top bar (md+) ============ */}
      <header
        data-ui="v2"
        className="hidden md:flex sticky top-0 z-30 h-16 w-full items-center justify-between gap-4 border-b border-line px-6 bg-canvas/80 backdrop-blur-xl"
      >
        <h1 className="font-display text-base font-bold text-ink">{pageTitle(activePath)}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCameraOpen}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-secondary px-3.5 text-sm font-semibold text-secondary-fg shadow-glow-secondary hover:bg-secondary-hover transition cursor-pointer"
          >
            <Icon3D name="camera" size={20} />
            Scan receipt
          </button>
          <ThemeToggle />
          <span className="flex items-center gap-2 rounded-xl border border-line bg-card py-1 pl-1 pr-3">
            <Avatar user={user} size={30} />
            <span className="max-w-[120px] truncate text-sm font-medium text-ink">{displayName.split(' ')[0]}</span>
          </span>
        </div>
      </header>

      {/* ============ Mobile top bar (< md) ============ */}
      <header
        data-ui="v2"
        className="md:hidden sticky top-0 z-50 w-full border-b border-line bg-canvas/90 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-[52px] items-center justify-between gap-2 px-4">
          <Link href="/dashboard" aria-label="MonthlyMoney home" onClick={markNav('/dashboard')}>
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCameraOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-soft cursor-pointer"
              aria-label="Scan a receipt"
            >
              <Icon3D name="camera" size={22} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ============ Mobile dock (< md) ============ */}
      <div
        data-ui="v2"
        className="fixed inset-x-3 z-50 mx-auto max-w-[440px] md:hidden floating-bottom-dock-container"
        style={{
          bottom: 'max(10px, calc(env(safe-area-inset-bottom, 0px) + 6px))',
          transform: isKeyboardOpen ? 'translate3d(0, 110px, 0)' : 'translate3d(0, 0, 0)',
          opacity: isKeyboardOpen ? 0 : 1,
          pointerEvents: isKeyboardOpen ? 'none' : 'auto',
        }}
        aria-hidden={isKeyboardOpen}
      >
        <nav className="floating-bottom-dock relative flex items-end justify-between rounded-[26px] px-1.5 pb-1.5 pt-1.5" aria-label="Quick navigation">
          {DOCK_LINKS.map(link => {
            const active = !drawerOpen && activePath === link.path;
            if (link.center) {
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={markNav(link.path)}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex flex-1 flex-col items-center -mt-6 select-none active:scale-95 transition-transform"
                >
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary shadow-glow-secondary ring-4 ring-canvas transition-transform ${active ? 'scale-105' : ''}`}>
                    <Icon3D name={link.icon} size={34} />
                  </span>
                  <span className={`mt-1 text-[10px] leading-none ${active ? 'font-bold text-ink' : 'font-semibold text-ink-2'}`}>{link.name}</span>
                </Link>
              );
            }
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={markNav(link.path)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-14 flex-1 flex-col items-center justify-center rounded-2xl select-none active:scale-95 transition-transform ${
                  active ? 'dock-item-active' : 'dock-item-inactive'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dockActive"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-2xl dock-active-pill"
                  />
                )}
                <span className="relative z-10 flex flex-col items-center">
                  <Icon3D name={link.icon} size={26} className={active ? '' : 'opacity-90'} />
                  <span className={`mt-0.5 text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>{link.name}</span>
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`relative flex h-14 flex-1 flex-col items-center justify-center rounded-2xl select-none cursor-pointer active:scale-95 transition-transform ${
              drawerOpen ? 'dock-item-active' : 'dock-item-inactive'
            }`}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            {drawerOpen && (
              <motion.span
                layoutId="dockActive"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-2xl dock-active-pill"
              />
            )}
            <span className="relative z-10 flex flex-col items-center">
              <Icon3D name="more" size={26} className="opacity-90" />
              <span className="mt-0.5 text-[10px] font-medium leading-none">More</span>
            </span>
          </button>
        </nav>
      </div>

      {/* ============ Mobile drawer ============
          Always mounted and moved with a GPU transform, so opening it costs no
          React mount work and its icons are already decoded. */}
      <div data-ui="v2" className="md:hidden">
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 ease-out ${
            drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!drawerOpen}
          className={`fixed inset-y-0 right-0 z-[101] flex w-[86vw] max-w-[360px] flex-col bg-card border-l border-line shadow-pop transform-gpu transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            drawerOpen ? 'visible translate-x-0' : 'invisible translate-x-full'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 h-14">
            <Logo />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-lg text-ink-2 hover:text-ink hover:bg-card-2 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-card-2 p-3">
              <Avatar user={user} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="truncate text-xs text-ink-3">{user?.email || ''}</p>
              </div>
            </div>

            <ThemeToggle variant="segmented" />

            {NAV_GROUPS.map(group => (
              <div key={group.category}>
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{group.category}</p>
                <ul>
                  {group.items.map(item => {
                    const active = activePath === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          onClick={navigateFromDrawer(item.path)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors active:bg-card-3 ${active ? 'bg-primary-soft text-primary-ink font-semibold' : 'text-ink hover:bg-card-2'}`}
                        >
                          <Icon3D name={item.icon} size={26} />
                          <span className="flex-1 text-sm">{item.name}</span>
                          {item.badge && (
                            <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold text-secondary-ink">{item.badge}</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-ink-3" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-line p-3">
            <button
              type="button"
              onClick={() => { setDrawerOpen(false); logout(); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-danger-ink hover:bg-danger-soft cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export { NAV_GROUPS };
