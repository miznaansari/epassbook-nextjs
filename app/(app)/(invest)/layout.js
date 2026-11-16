import SectionTabs from '@/components/ui/SectionTabs';

// "Investments" menu item: Savings, Stocks and SIP plans as tabs of one area.
const TABS = [
  { href: '/savings', label: 'Savings', icon: 'wallet' },
  { href: '/stocks', label: 'Stocks', icon: 'stocks' },
  { href: '/sips', label: 'SIP plans', icon: 'calendar' },
];

export default function InvestLayout({ children }) {
  return (
    <>
      <SectionTabs tabs={TABS} label="Investments" />
      {children}
    </>
  );
}
