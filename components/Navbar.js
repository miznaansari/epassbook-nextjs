'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useKeyboard } from '@/context/KeyboardContext';
import LineIcon from '@/components/ui/LineIcon';
import ThemeToggle from '@/components/ui/ThemeToggle';
import ScanReceiptButton from '@/components/ScanReceiptButton';

// Navigation model (shared by sidebar, drawer and page titles). Icons: components/ui/LineIcon.jsx
const NAV_GROUPS = [
  {
    category: 'Money',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: 'home' },
      { name: 'Passbook', path: '/transactions', icon: 'passbook' },
      { name: 'Savings', path: '/savings', icon: 'wallet' },
      { name: 'Stocks', path: '/stocks', icon: 'stocks' },
      { name: 'SIP plans', path: '/sips', icon: 'calendar' },
    ],
  },
  {
    category: 'Insights',
    items: [
      { name: 'AI Assistant', path: '/assistant', icon: 'sparkle' },
      { name: 'Reports', path: '/reports', icon: 'grid' },
      { name: 'Alerts', path: '/notifications', icon: 'bell' },
    ],
  },
  {
    category: 'Account',
    items: [
      { name: 'Developer API', path: '/mcp', icon: 'code' },
      { name: 'Settings', path: '/settings', icon: 'settings' },
    ],
  },
];

const DOCK_LINKS = [
  { name: 'Home', path: '/dashboard', icon: 'home' },
  { name: 'Passbook', path: '/transactions', icon: 'passbook' },
  { name: 'AI', path: '/assistant', icon: 'sparkle', center: true },
  { name: 'Savings', path: '/savings', icon: 'wallet' },
];

// Pages that render their own header (title + scan button) in place of the desktop top bar.
const OWN_HEADER = new Set(['/dashboard']);

function pageTitle(pathname) {
  for (const g of NAV_GROUPS) {
    const hit = g.items.find(i => i.path === pathname);
    if (hit) return hit.name;
  }
  return 'MonthlyMoney';
}

function LogoMark({ size = 36 }) {
  return (
    <span
      className="grid shrink-0 place-items-center bg-[#4F46E5] text-white"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.31) }}
    >
      <LineIcon name="wallet" />
    </span>
  );
}

function Avatar({ user, size = 34 }) {
  const initial = (user?.displayName || user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      className="inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-(--mm-brand-soft) text-[13px] font-extrabold text-(--mm-brand-ink)"
      style={{ width: size, height: size }}
    >
      {user?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
      ) : initial}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { isKeyboardOpen } = useKeyboard();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Route the user just tapped. Highlighting it immediately (instead of after the
  // new page commits) makes the dock/sidebar respond on touch.
  const [pendingPath, setPendingPath] = useState(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
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

  const displayName = user?.displayName || user?.name || 'You';

  return (
    <>
      {/* ============ Desktop sidebar (md+) ============ */}
      <aside
        data-ui="v2"
        className={`mm group/side hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-(--mm-line) bg-(--mm-card) py-5 select-none transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCollapsed ? 'w-[72px] px-3' : 'w-[248px] px-4'
        }`}
      >
        <div className={`flex items-center pb-5 pt-1 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <Link href="/dashboard" title="MonthlyMoney" onClick={markNav('/dashboard')} className="mm-focus flex min-w-0 items-center gap-2.5 rounded-xl">
            <LogoMark />
            {!isCollapsed && (
              <span className="truncate text-[18px] font-extrabold text-(--mm-ink)">
                Monthly<span className="text-(--mm-indigo)">Money</span>
              </span>
            )}
          </Link>
        </div>

        {/* Collapse toggle sits on the sidebar edge; shown on hover / keyboard focus. */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="mm-focus absolute -right-3.5 top-7 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-(--mm-line) bg-(--mm-card) text-(--mm-ink-3) opacity-0 shadow-sm transition-opacity hover:text-(--mm-ink) focus-visible:opacity-100 group-hover/side:opacity-100"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <LineIcon name={isCollapsed ? 'panelOpen' : 'panelClose'} size={15} />
        </button>

        <nav className="sidebar-scrollbar -mx-1 flex-1 overflow-y-auto overflow-x-hidden px-1" aria-label="Main">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.category}>
              {isCollapsed ? (
                gi > 0 && <div className="mx-2 my-3 border-t border-(--mm-line)" aria-hidden="true" />
              ) : (
                <div className={`mm-lbl px-3.5 pb-1.5 uppercase tracking-[0.08em] ${gi > 0 ? 'pt-[18px]' : ''}`}>{group.category}</div>
              )}
              <ul className="flex flex-col gap-1">
                {group.items.map(item => {
                  const active = activePath === item.path;
                  return (
                    <li key={item.path} className="group relative">
                      <Link
                        href={item.path}
                        onClick={markNav(item.path)}
                        aria-current={active ? 'page' : undefined}
                        aria-label={isCollapsed ? item.name : undefined}
                        className={`mm-nav ${active ? 'is-on' : ''} ${isCollapsed ? 'h-11 justify-center px-0' : ''}`}
                      >
                        <LineIcon name={item.icon} />
                        {!isCollapsed && <span className="flex-1 truncate">{item.name}</span>}
                      </Link>
                      {isCollapsed && (
                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-(--mm-line) bg-(--mm-card) px-2.5 py-1.5 text-xs font-semibold text-(--mm-ink) opacity-0 shadow-pop transition-opacity group-hover:opacity-100">
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

        <div className={`mt-3 flex items-center gap-2 rounded-2xl ${isCollapsed ? 'flex-col' : 'bg-(--mm-soft) p-1.5'}`}>
          <Avatar user={user} size={isCollapsed ? 36 : 34} />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-(--mm-ink)">{displayName}</p>
              <p className="truncate text-[11px] font-medium text-(--mm-ink-3)">{user?.email || ''}</p>
            </div>
          )}
          <ThemeToggle className="!h-9 !w-9" />
          <button
            type="button"
            onClick={logout}
            className="mm-focus cursor-pointer rounded-lg p-2 text-(--mm-ink-3) hover:bg-(--mm-red-soft) hover:text-(--mm-red-ink)"
            aria-label="Log out"
            title="Log out"
          >
            <LineIcon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {/* ============ Desktop top bar (md+), for pages without their own header ============ */}
      {!OWN_HEADER.has(pathname) && (
        <header
          data-ui="v2"
          className="mm hidden md:flex sticky top-0 z-30 h-16 w-full items-center justify-between gap-4 border-b border-(--mm-line) bg-(--mm-canvas)/85 px-6 backdrop-blur-xl"
        >
          <h1 className="text-[18px] font-extrabold text-(--mm-ink)">{pageTitle(activePath)}</h1>
          <ScanReceiptButton className="mm-btn mm-btn-ghost min-h-10">
            <LineIcon name="camera" /> Scan receipt
          </ScanReceiptButton>
        </header>
      )}

      {/* ============ Mobile app bar (< md) ============ */}
      <header
        data-ui="v2"
        className="mm md:hidden sticky top-0 z-50 w-full bg-(--mm-canvas)/90 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-[60px] items-center justify-between gap-2 px-5">
          <Link href="/dashboard" aria-label="MonthlyMoney home" onClick={markNav('/dashboard')} className="mm-focus flex items-center gap-2 rounded-xl text-[17px] font-extrabold text-(--mm-ink)">
            <LogoMark size={32} />
            MonthlyMoney
          </Link>
          <ScanReceiptButton className="mm-btn mm-btn-ghost w-11 px-0" aria-label="Scan receipt">
            <LineIcon name="camera" />
          </ScanReceiptButton>
        </div>
      </header>

      {/* ============ Mobile dock (< md) ============ */}
      <div
        data-ui="v2"
        className="mm floating-bottom-dock-container fixed inset-x-3 z-50 mx-auto max-w-[440px] md:hidden"
        style={{
          bottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 6px))',
          transform: isKeyboardOpen ? 'translate3d(0, 110px, 0)' : 'translate3d(0, 0, 0)',
          opacity: isKeyboardOpen ? 0 : 1,
          pointerEvents: isKeyboardOpen ? 'none' : 'auto',
        }}
        aria-hidden={isKeyboardOpen}
      >
        <nav
          className="grid h-[68px] grid-cols-5 items-center rounded-[22px] border border-(--mm-line) bg-(--mm-card) text-center text-[11px] font-bold text-(--mm-ink-3) shadow-[0_10px_30px_-14px_rgb(16_24_40/0.25)]"
          aria-label="Quick navigation"
        >
          {DOCK_LINKS.map(link => {
            const active = !drawerOpen && activePath === link.path;
            if (link.center) {
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={markNav(link.path)}
                  aria-current={active ? 'page' : undefined}
                  aria-label="AI Assistant"
                  className={`mm-focus -mt-[22px] grid h-[52px] w-[52px] place-items-center justify-self-center rounded-2xl bg-(--mm-amber) text-(--mm-on-amber) transition-transform active:scale-95 ${active ? 'ring-4 ring-(--mm-brand-soft)' : ''}`}
                >
                  <LineIcon name={link.icon} />
                </Link>
              );
            }
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={markNav(link.path)}
                aria-current={active ? 'page' : undefined}
                className={`mm-focus grid justify-items-center gap-0.5 rounded-xl py-1 transition-colors active:scale-95 ${active ? 'text-(--mm-brand-ink)' : 'hover:text-(--mm-ink)'}`}
              >
                <LineIcon name={link.icon} />
                {link.name}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`mm-focus grid cursor-pointer justify-items-center gap-0.5 rounded-xl py-1 transition-colors active:scale-95 ${drawerOpen ? 'text-(--mm-brand-ink)' : 'hover:text-(--mm-ink)'}`}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            <LineIcon name="grid" />
            More
          </button>
        </nav>
      </div>

      {/* ============ Mobile drawer ============
          Always mounted and moved with a GPU transform, so opening it costs no
          React mount work. */}
      <div data-ui="v2" className="mm md:hidden">
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
          className={`fixed inset-y-0 right-0 z-[101] flex w-[86vw] max-w-[360px] transform-gpu flex-col border-l border-(--mm-line) bg-(--mm-card) shadow-pop transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            drawerOpen ? 'visible translate-x-0' : 'invisible translate-x-full'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex h-14 items-center justify-between border-b border-(--mm-line) px-4">
            <span className="flex items-center gap-2 text-[17px] font-extrabold text-(--mm-ink)">
              <LogoMark size={32} />
              MonthlyMoney
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mm-focus cursor-pointer rounded-lg p-2 text-(--mm-ink-2) hover:bg-(--mm-soft) hover:text-(--mm-ink)"
              aria-label="Close menu"
            >
              <LineIcon name="close" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3">
            <div className="flex items-center gap-3 rounded-2xl bg-(--mm-soft) p-3">
              <Avatar user={user} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-(--mm-ink)">{displayName}</p>
                <p className="truncate text-xs font-medium text-(--mm-ink-3)">{user?.email || ''}</p>
              </div>
            </div>

            <ThemeToggle variant="segmented" />

            {NAV_GROUPS.map(group => (
              <div key={group.category}>
                <p className="mm-lbl px-3.5 pb-1.5 uppercase tracking-[0.08em]">{group.category}</p>
                <ul className="flex flex-col gap-1">
                  {group.items.map(item => {
                    const active = activePath === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          onClick={navigateFromDrawer(item.path)}
                          aria-current={active ? 'page' : undefined}
                          className={`mm-nav ${active ? 'is-on' : ''}`}
                        >
                          <LineIcon name={item.icon} />
                          <span className="flex-1">{item.name}</span>
                          <LineIcon name="chevron" size={16} className="text-(--mm-ink-3)" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-(--mm-line) p-3">
            <button
              type="button"
              onClick={() => { setDrawerOpen(false); logout(); }}
              className="mm-focus flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-(--mm-red-ink) hover:bg-(--mm-red-soft)"
            >
              <LineIcon name="logout" size={18} /> Log out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export { NAV_GROUPS };
