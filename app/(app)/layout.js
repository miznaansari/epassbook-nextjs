import Navbar from '@/components/Navbar';

// Shared shell for every signed-in page. The sidebar, top bar and mobile dock
// live here so they stay mounted across navigations instead of rebuilding on
// every page change.
export default function AppLayout({ children }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col app-sidebar-offset">
      <Navbar />
      {children}
    </div>
  );
}
