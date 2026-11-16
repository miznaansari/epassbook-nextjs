'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LineIcon from '@/components/ui/LineIcon';

/**
 * Tab bar that groups several pages under one menu item (Investments, Settings).
 * Each tab is a normal route, so deep links and the back button keep working.
 * `tabs`: [{ href, label, icon }]
 */
export default function SectionTabs({ tabs, label }) {
  const pathname = usePathname();
  return (
    <nav
      data-ui="v2"
      aria-label={label}
      className="mm sticky top-[var(--app-header-h,0px)] z-20 border-b border-(--mm-line) bg-(--mm-canvas)/90 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-[1100px] gap-2 overflow-x-auto px-5 py-2.5 [scrollbar-width:none] md:px-10 [&::-webkit-scrollbar]:hidden">
        {tabs.map(tab => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`mm-ft ${active ? 'is-on' : ''}`}
            >
              {tab.icon && <LineIcon name={tab.icon} size={16} />}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
