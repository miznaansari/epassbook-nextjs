'use client';

import { useTheme } from '@/context/ThemeContext';

// Chart chrome + series colors per theme. The investment series trio is validated
// for CVD separation against each theme's card surface.
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  return {
    isLight,
    surface: isLight ? '#FFFFFF' : '#0a0a0c',
    grid: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)',
    axis: isLight ? '#94A3B8' : '#8A8F98',
    muted: isLight ? '#CBD5E1' : '#3F4350',
    accent: isLight ? '#5E6AD2' : '#818cf8',
    good: isLight ? '#059669' : '#10B981',
    bad: isLight ? '#E11D48' : '#F43F5E',
    series: isLight
      ? { sip: '#5E6AD2', stocks: '#eb6834', other: '#1baf7a' }
      : { sip: '#727cf0', stocks: '#d95926', other: '#199e70' },
  };
}

export function makeCompactFormatter(currencyCode) {
  const symbol = currencyCode === 'INR' ? '₹' : '$';
  return (val) => {
    const abs = Math.abs(val);
    if (abs >= 10000000) return `${symbol}${(val / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${symbol}${(val / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${symbol}${(val / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    return `${symbol}${Math.round(val)}`;
  };
}
