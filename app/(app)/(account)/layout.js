import SectionTabs from '@/components/ui/SectionTabs';

// "Settings" menu item: general settings, alerts and the developer API as tabs.
const TABS = [
  { href: '/settings', label: 'General', icon: 'settings' },
  { href: '/notifications', label: 'Alerts', icon: 'bell' },
  { href: '/mcp', label: 'Developer API', icon: 'code' },
];

export default function AccountLayout({ children }) {
  return (
    <>
      <SectionTabs tabs={TABS} label="Settings" />
      {children}
    </>
  );
}
