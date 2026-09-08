'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext({
  isCollapsed: false,
  toggleSidebar: () => {},
  setIsCollapsed: () => {},
});

export function SidebarProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedState = localStorage.getItem('passbook_sidebar_collapsed');
      if (savedState !== null) {
        setIsCollapsed(savedState === 'true');
      }
    } catch (e) {
      console.warn('Could not read sidebar preference from localStorage:', e);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const nextState = !prev;
      try {
        localStorage.setItem('passbook_sidebar_collapsed', String(nextState));
      } catch (e) {
        console.warn('Could not save sidebar preference to localStorage:', e);
      }
      return nextState;
    });
  };

  const handleSetCollapsed = (value) => {
    setIsCollapsed(value);
    try {
      localStorage.setItem('passbook_sidebar_collapsed', String(value));
    } catch (e) {
      console.warn('Could not save sidebar preference to localStorage:', e);
    }
  };

  // Sync CSS variable on root element for smooth global layout transitions
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--sidebar-width',
        isCollapsed ? '72px' : '260px'
      );
    }
  }, [isCollapsed]);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        setIsCollapsed: handleSetCollapsed,
        mounted
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
