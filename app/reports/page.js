'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import ReportsMobile from '@/components/ReportsMobile';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  AreaChart as AreaIcon,
  PieChart as PieIcon,
  BarChart4,
  TrendingDown,
  TrendingUp,
  Coins,
  AlertCircle,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  CalendarDays,
  Briefcase,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { getLogicalCyclePeriod } from '@/lib/cycle';

export default function Reports() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Data States
  const [salaries, setSalaries] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [cycleDate, setCycleDate] = useState(1);
  const [stockHoldings, setStockHoldings] = useState([]);
  const [stockSummary, setStockSummary] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalReturns: 0,
    totalReturnsPercentage: 0
  });

  // Contribution Calendar States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Mobile View & Simulated Load States
  const [isMobile, setIsMobile] = useState(false);
  const [isSelectingDate, setIsSelectingDate] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDateSelect = (day) => {
    setIsSelectingDate(true);
    setSelectedDate(day);
    setTimeout(() => {
      setIsSelectingDate(false);
    }, 450);
  };

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch all user transactions, salaries & bonuses
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoadingData(true);
      try {
        // Fetch Salaries
        const salRes = await fetch('/api/salary');
        const salData = salRes.ok ? await salRes.json() : [];
        setSalaries(salData);

        // Fetch Bonuses
        const bonRes = await fetch('/api/bonus');
        const bonData = bonRes.ok ? await bonRes.json() : [];
        setBonuses(bonData);

        // Fetch Entries
        const entRes = await fetch('/api/entries');
        const entData = entRes.ok ? await entRes.json() : [];
        setEntries(entData);

        // Fetch Stock Holdings
        const stockRes = await fetch('/api/stocks/holdings');
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          if (stockData.summary) {
            setStockSummary(stockData.summary);
          }
          if (stockData.holdings) {
            setStockHoldings(stockData.holdings);
          }
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (user) {
      if (user.salaryCycleDate) {
        setCycleDate(user.salaryCycleDate);
      }
      fetchData();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- ANALYTICS PROCESSING LOGIC ---

  // Format Helpers
  const formatCurrency = (val) => {
    const currencyCode = user?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const toLocalDateString = (dateObj, tz = 'UTC') => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(dateObj);
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      const y = parts.find(p => p.type === 'year')?.value;
      return `${y}-${m}-${d}`;
    } catch (e) {
      const d = new Date(dateObj);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const tz = user?.timezone || 'UTC';

  const getCalendarGridDays = () => {
    const now = new Date();
    const daysToShow = 365;
    const gridStartDate = new Date(now.getTime() - (daysToShow - 1) * 24 * 60 * 60 * 1000);
    const startDayOfWeek = gridStartDate.getDay();
    const alignedStartDate = new Date(gridStartDate.getTime() - startDayOfWeek * 24 * 60 * 60 * 1000);
    
    const totalDays = daysToShow + startDayOfWeek;
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      days.push(new Date(alignedStartDate.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return days;
  };

  const getCellMetadata = (day) => {
    const dateStr = toLocalDateString(day, tz);
    
    const dayEntries = entries.filter(e => toLocalDateString(new Date(e.date), tz) === dateStr);
    const daySalaries = salaries.filter(s => toLocalDateString(new Date(s.createdAt), tz) === dateStr);
    
    const totalCount = dayEntries.length + daySalaries.length;
    
    if (totalCount === 0) {
      return {
        colorClass: 'bg-slate-900/40 border border-white/5 hover:border-slate-700',
        tooltip: `${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}: No transactions`,
        entries: [],
        salaries: []
      };
    }

    const hasSalary = daySalaries.length > 0;
    const hasLoan = dayEntries.some(e => e.type === 'LOAN');
    const hasAdvance = dayEntries.some(e => e.type === 'ADVANCE');
    const hasLending = dayEntries.some(e => e.type === 'LENDING');
    const hasSavings = dayEntries.some(e => e.type === 'SAVINGS');
    const hasSpending = dayEntries.some(e => e.type === 'SPENDING');

    let colorClass = 'bg-slate-800 border border-white/10';
    let labelText = '';

    if (hasSalary) {
      colorClass = 'bg-emerald-500 border border-emerald-400 hover:scale-110 shadow-lg shadow-emerald-500/20';
      labelText = 'Salary received 💰';
    } else if (hasLoan) {
      colorClass = 'bg-orange-500 border border-orange-400 hover:scale-110 shadow-lg shadow-orange-500/20';
      labelText = 'Loan logged ⚠️';
    } else if (hasAdvance) {
      colorClass = 'bg-cyan-500 border border-cyan-400 hover:scale-110 shadow-lg shadow-cyan-500/20';
      labelText = 'Advance received ⚡';
    } else if (hasLending) {
      colorClass = 'bg-blue-500 border border-blue-400 hover:scale-110 shadow-lg shadow-blue-500/20';
      labelText = 'Money lent 💸';
    } else if (hasSavings) {
      colorClass = 'bg-amber-500 border border-amber-400 hover:scale-110 shadow-lg shadow-amber-500/20';
      labelText = 'Invested savings 📈';
    } else if (hasSpending) {
      const spendAmount = dayEntries
        .filter(e => e.type === 'SPENDING')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      labelText = `Spent ${formatCurrency(spendAmount)}`;

      if (spendAmount <= 500) {
        colorClass = 'bg-violet-900/40 border border-violet-500/20 text-violet-300 hover:border-violet-400';
      } else if (spendAmount <= 2000) {
        colorClass = 'bg-violet-700/60 border border-violet-500/40 text-violet-200 hover:border-violet-300';
      } else if (spendAmount <= 5000) {
        colorClass = 'bg-violet-500 border border-violet-400 text-white hover:scale-105';
      } else {
        colorClass = 'bg-violet-400 border border-violet-300 text-slate-950 font-bold hover:scale-110 shadow-lg shadow-violet-500/40';
      }
    }

    const dateLabel = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const tooltip = `${dateLabel}: ${labelText || `${totalCount} transaction(s)`}`;

    return {
      colorClass,
      tooltip,
      entries: dayEntries,
      salaries: daySalaries
    };
  };

  const getMonthLabels = (daysList) => {
    const labels = [];
    let prevMonth = -1;
    for (let i = 0; i < daysList.length; i += 7) {
      const day = daysList[i];
      const currentMonthIdx = day.getMonth();
      if (currentMonthIdx !== prevMonth) {
        labels.push({ text: monthNames[currentMonthIdx], colIndex: i / 7 });
        prevMonth = currentMonthIdx;
      }
    }
    return labels;
  };

  const getMonthDays = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // 1. Prepare Area Chart (Income vs Outflow) & Bar Chart (Spending Trends) for last 6 logical months
  const prepareMonthlyComparisonData = () => {
    const now = new Date();
    const result = [];

    // We want the past 6 logical months
    for (let i = 5; i >= 0; i--) {
      const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const logicalPeriod = getLogicalCyclePeriod(checkDate, cycleDate);

      const label = `${monthNames[logicalPeriod.month - 1]} ${logicalPeriod.year.toString().slice(-2)}`;

      // Calculate Inflow for this logical month:
      // a. Salary of this month
      const matchingSalary = salaries.find(s => s.month === logicalPeriod.month && s.year === logicalPeriod.year);
      const salaryAmt = matchingSalary ? parseFloat(matchingSalary.amount) : 0;

      // b. Bonus of this month
      const matchingBonus = bonuses.find(b => b.month === logicalPeriod.month && b.year === logicalPeriod.year);
      const bonusAmt = matchingBonus ? parseFloat(matchingBonus.amount) : 0;

      // c. Inflows that fell into this cycle date boundary (Advance + Loan)
      // For simplified and accurate matching, let's group entry dates
      // Start and end boundaries of the cycle:
      const cycleStart = new Date(logicalPeriod.year, logicalPeriod.month - 1, cycleDate, 0, 0, 0, 0);
      let endMonth = logicalPeriod.month;
      let endYear = logicalPeriod.year;
      if (endMonth > 11) {
        endMonth = 0;
        endYear++;
      }
      const cycleEnd = new Date(endYear, endMonth, cycleDate - 1, 23, 59, 59, 999);

      const periodInflows = entries.filter(e => {
        const d = new Date(e.date);
        return d >= cycleStart && d <= cycleEnd && (e.type === 'ADVANCE' || e.type === 'LOAN');
      });
      const inflowExtra = periodInflows.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const totalInflow = salaryAmt + bonusAmt + inflowExtra;

      // Calculate Outflow for this cycle:
      // Spendings + Lendings in this cycle date boundary
      const periodOutflows = entries.filter(e => {
        const d = new Date(e.date);
        return d >= cycleStart && d <= cycleEnd && (e.type === 'SPENDING' || e.type === 'LENDING' || e.type === 'SAVINGS');
      });
      const totalOutflow = periodOutflows.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      // Only SPENDING alone for the bar chart
      const totalSpending = periodOutflows
        .filter(e => e.type === 'SPENDING')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      // Calculate real remaining salary + bonus balance of this month using actual linked deductions
      let periodDeductions = 0;
      let savingsDeductions = 0;

      entries.forEach(entry => {
        if (entry.deductions) {
          entry.deductions.forEach(d => {
            if (d.month === logicalPeriod.month && d.year === logicalPeriod.year) {
              const amt = parseFloat(d.amount);
              periodDeductions += amt;
              if (entry.type === 'SAVINGS') {
                savingsDeductions += amt;
              }
            }
          });
        }
      });

      const totalSalaryBonus = salaryAmt + bonusAmt;
      const remainingSalaryBonus = Math.max(0, totalSalaryBonus - periodDeductions);

      // Also get any general savings logged in this cycle date range (with useSalaryBalance === false)
      const periodGeneralSavings = periodOutflows.filter(e => e.type === 'SAVINGS' && !e.useSalaryBalance);
      const generalSavingsAmt = periodGeneralSavings.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const totalSavingsToShow = savingsDeductions + generalSavingsAmt;

      result.push({
        name: label,
        Inflow: totalInflow,
        Outflow: totalOutflow,
        Spending: totalSpending,
        "Remaining Balance": remainingSalaryBonus,
        "Invested Savings": totalSavingsToShow,
      });
    }

    return result;
  };

  const monthlyChartData = prepareMonthlyComparisonData();

  // Helper to get current period stats
  const getCurrentPeriodSummary = () => {
    const now = new Date();
    const logicalPeriod = getLogicalCyclePeriod(now, cycleDate);

    // Current month salary
    const matchingSalary = salaries.find(s => s.month === logicalPeriod.month && s.year === logicalPeriod.year);
    const salaryAmt = matchingSalary ? parseFloat(matchingSalary.amount) : 0;

    // Current month bonus
    const matchingBonus = bonuses.find(b => b.month === logicalPeriod.month && b.year === logicalPeriod.year);
    const bonusAmt = matchingBonus ? parseFloat(matchingBonus.amount) : 0;

    const cycleStart = new Date(logicalPeriod.year, logicalPeriod.month - 1, cycleDate, 0, 0, 0, 0);
    let endMonth = logicalPeriod.month;
    let endYear = logicalPeriod.year;
    if (endMonth > 11) {
      endMonth = 0;
      endYear++;
    }
    const cycleEnd = new Date(endYear, endMonth, cycleDate - 1, 23, 59, 59, 999);

    const periodInflows = entries.filter(e => {
      const d = new Date(e.date);
      return d >= cycleStart && d <= cycleEnd && (e.type === 'ADVANCE' || e.type === 'LOAN');
    });
    const inflowExtra = periodInflows.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalInflow = salaryAmt + bonusAmt + inflowExtra;

    const periodOutflows = entries.filter(e => {
      const d = new Date(e.date);
      return d >= cycleStart && d <= cycleEnd && (e.type === 'SPENDING' || e.type === 'LENDING' || e.type === 'SAVINGS');
    });
    const totalOutflow = periodOutflows.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Calculate real remaining salary + bonus balance
    let periodDeductions = 0;
    let savingsDeductions = 0;

    entries.forEach(entry => {
      if (entry.deductions) {
        entry.deductions.forEach(d => {
          if (d.month === logicalPeriod.month && d.year === logicalPeriod.year) {
            const amt = parseFloat(d.amount);
            periodDeductions += amt;
            if (entry.type === 'SAVINGS') {
              savingsDeductions += amt;
            }
          }
        });
      }
    });

    const periodGeneralSavings = periodOutflows.filter(e => e.type === 'SAVINGS' && !e.useSalaryBalance);
    const generalSavingsAmt = periodGeneralSavings.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalSavings = savingsDeductions + generalSavingsAmt;

    return {
      totalInflow,
      totalOutflow,
      totalSavings
    };
  };

  const currentPeriodStats = getCurrentPeriodSummary();

  // 2. Prepare Pie Chart: Spending Categories Breakdown for current logical month
  const prepareCategoriesPieData = () => {
    const now = new Date();
    const logicalPeriod = getLogicalCyclePeriod(now, cycleDate);

    const cycleStart = new Date(logicalPeriod.year, logicalPeriod.month - 1, cycleDate, 0, 0, 0, 0);
    let endMonth = logicalPeriod.month;
    let endYear = logicalPeriod.year;
    if (endMonth > 11) {
      endMonth = 0;
      endYear++;
    }
    const cycleEnd = new Date(endYear, endMonth, cycleDate - 1, 23, 59, 59, 999);

    const currentPeriodSpending = entries.filter(e => {
      const d = new Date(e.date);
      return d >= cycleStart && d <= cycleEnd && (e.type === 'SPENDING' || e.type === 'SAVINGS');
    });

    if (currentPeriodSpending.length === 0) {
      return [];
    }

    const groups = {};
    currentPeriodSpending.forEach(e => {
      if (e.type === 'SAVINGS') {
        groups['Invested Savings'] = (groups['Invested Savings'] || 0) + parseFloat(e.amount);
        return;
      }
      const title = e.title.trim().toLowerCase();
      let cat = 'Others';

      if (title.includes('food') || title.includes('eat') || title.includes('restaurant') || title.includes('cafe')) cat = 'Dining Out';
      else if (title.includes('rent') || title.includes('flat') || title.includes('room')) cat = 'Rent & Living';
      else if (title.includes('movie') || title.includes('game') || title.includes('ott') || title.includes('netflix') || title.includes('fun')) cat = 'Entertainment';
      else if (title.includes('travel') || title.includes('cab') || title.includes('uber') || title.includes('fuel') || title.includes('bike') || title.includes('car')) cat = 'Transport';
      else if (title.includes('bill') || title.includes('recharge') || title.includes('wifi') || title.includes('power') || title.includes('electricity')) cat = 'Utilities';
      else if (title.includes('cloth') || title.includes('shop') || title.includes('shoes') || title.includes('amazon') || title.includes('flipkart')) cat = 'Shopping';

      groups[cat] = (groups[cat] || 0) + parseFloat(e.amount);
    });

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  };

  const pieChartData = prepareCategoriesPieData();

  // Color mappings matching our visual identity
  const COLORS = {
    'Dining Out': '#10B981',     // emerald
    'Rent & Living': '#8B5CF6',  // purple
    'Entertainment': '#FB923C', // orange
    'Transport': '#3B82F6',     // blue
    'Utilities': '#06B6D4',     // cyan
    'Shopping': '#EC4899',      // pink
    'Invested Savings': '#F59E0B', // amber (glowing gold)
    'Others': '#64748B',         // slate
  };

  const PIE_COLORS = pieChartData.map(slice => COLORS[slice.name] || '#A78BFA');

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0a0a0c] border border-white/[0.08] p-3 rounded-xl shadow-2xl backdrop-blur-xl text-left font-mono">
          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-xs font-semibold tracking-tight flex items-center gap-2" style={{ color: item.color || item.fill }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }}></span>
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isMobile) {
    return (
      <>
        <Navbar />
        {loadingData ? (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#050506] px-6 text-center select-none relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-[#5E6AD2]/10 border border-[#5E6AD2]/30 flex items-center justify-center shadow-lg shadow-[#5E6AD2]/10 mb-4 animate-pulse">
              <AreaIcon className="w-6 h-6 text-[#5E6AD2]" />
            </div>
            <h3 className="text-white font-semibold text-base tracking-tight mb-1">Reports & Analytics</h3>
            <p className="text-slate-400 text-xs font-mono">Synthesizing ledger intelligence...</p>
          </div>
        ) : (
          <ReportsMobile
            user={user}
            loadingData={loadingData}
            cycleDate={cycleDate}
            stockSummary={stockSummary}
            stockHoldings={stockHoldings}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            salaries={salaries}
            bonuses={bonuses}
            entries={entries}
            formatCurrency={formatCurrency}
            monthlyChartData={monthlyChartData}
            currentPeriodStats={currentPeriodStats}
            pieChartData={pieChartData}
            COLORS={COLORS}
            PIE_COLORS={PIE_COLORS}
            CustomTooltip={CustomTooltip}
            getCellMetadata={getCellMetadata}
            getMonthDays={getMonthDays}
            getCalendarGridDays={getCalendarGridDays}
            getMonthLabels={getMonthLabels}
            toLocalDateString={toLocalDateString}
            tz={tz}
            isSelectingDate={isSelectingDate}
            handleDateSelect={handleDateSelect}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        {/* Row 1: Header Titles */}
        <div className="text-left mb-8">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#818cf8] text-[10px] font-mono uppercase tracking-wider rounded-md">
              Intelligence
            </span>
            <span className="text-[10px] text-slate-400 font-mono">FINANCIAL AUDIT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <AreaIcon className="w-7 h-7 text-[#5E6AD2]" /> Analytics & Reports
          </h1>
          <p className="text-slate-400 text-xs mt-1">Multi-cycle financial metrics, liquidity trends, and asset allocation</p>
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-72 bg-white/[0.02] border border-white/[0.04] rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Linear Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Cycle Cashflow */}
              <SpotlightCard className="p-5 flex items-start justify-between" spotlightColor="rgba(94, 106, 210, 0.12)">
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Cycle Net Cashflow
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight mt-1">
                    {formatCurrency(currentPeriodStats.totalInflow - currentPeriodStats.totalOutflow)}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-2 flex items-center gap-2">
                    <span>In: <strong className="text-emerald-400 font-semibold">{formatCurrency(currentPeriodStats.totalInflow)}</strong></span>
                    <span className="text-slate-600">|</span>
                    <span>Out: <strong className="text-rose-400 font-semibold">{formatCurrency(currentPeriodStats.totalOutflow)}</strong></span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <Coins className="w-5 h-5 text-[#5E6AD2]" />
                </div>
              </SpotlightCard>

              {/* Card 2: Ledger Savings */}
              <SpotlightCard className="p-5 flex items-start justify-between" spotlightColor="rgba(245, 158, 11, 0.1)">
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Ledger Invested Savings
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-amber-400 tracking-tight mt-1">
                    {formatCurrency(currentPeriodStats.totalSavings)}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500 mt-2">
                    Accumulated savings logged
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <PiggyBank className="w-5 h-5 text-amber-400" />
                </div>
              </SpotlightCard>

              {/* Card 3: Share Market Portfolio */}
              <SpotlightCard className="p-5 flex items-start justify-between" spotlightColor="rgba(6, 182, 212, 0.1)">
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Equity Market Portfolio
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight mt-1">
                    {formatCurrency(stockSummary.totalCurrentValue)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-[11px]">
                    <span className="text-slate-400">
                      Invested: {formatCurrency(stockSummary.totalInvested)}
                    </span>
                    {stockSummary.totalInvested > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        stockSummary.totalReturns >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {stockSummary.totalReturns >= 0 ? '+' : ''}{stockSummary.totalReturnsPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <Briefcase className="w-5 h-5 text-[#06B6D4]" />
                </div>
              </SpotlightCard>
            </div>
 
            {/* Linear Contribution Calendar and Date Selector */}
            <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 space-y-6 text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#5E6AD2]" /> Transaction Contribution Calendar
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Yearly cashflow velocity. Click any day to inspect ledger events.
                  </p>
                </div>
                
                {/* Legend explaining the colors */}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 bg-[#050506] p-2 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-white/[0.03] border border-white/[0.08]"></span> Inactive
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#5E6AD2]/30 border border-[#5E6AD2]/50"></span> Low
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#5E6AD2]"></span> High
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]"></span> Salary
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#F97316]"></span> Loan
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]"></span> Lending
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#06B6D4]"></span> Advance
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left 3 cols: GitHub 12-Month Calendar Grid */}
                <div className="xl:col-span-3 bg-[#050506]/80 border border-white/[0.06] p-4 rounded-xl flex flex-col justify-between overflow-hidden">
                  <div className="relative">
                    {/* Month labels header */}
                    <div className="h-6 relative text-[10px] font-mono text-slate-400 select-none">
                      {(() => {
                        const daysList = getCalendarGridDays();
                        const labels = getMonthLabels(daysList);
                        return labels.map((label, lIdx) => (
                          <span
                            key={lIdx}
                            className="absolute"
                            style={{ left: `${label.colIndex * 14.5}px` }}
                          >
                            {label.text}
                          </span>
                        ));
                      })()}
                    </div>

                    <div className="flex gap-1.5">
                      {/* Day of Week labels on left */}
                      <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500 select-none pr-1 justify-around h-[90px] pt-1">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                      </div>

                      {/* Flex grid of weeks */}
                      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 flex-grow">
                        {(() => {
                          const daysList = getCalendarGridDays();
                          const weeks = [];
                          let currentWeek = [];
                          daysList.forEach((day, index) => {
                            currentWeek.push(day);
                            if (currentWeek.length === 7 || index === daysList.length - 1) {
                              weeks.push(currentWeek);
                              currentWeek = [];
                            }
                          });

                          return weeks.map((week, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                              {week.map((day) => {
                                const metadata = getCellMetadata(day);
                                const isSelected = toLocalDateString(day, tz) === toLocalDateString(selectedDate, tz);
                                return (
                                  <div
                                    key={day.getTime()}
                                    title={metadata.tooltip}
                                    onClick={() => {
                                      handleDateSelect(day);
                                      setCurrentMonth(day);
                                    }}
                                    className={`w-[11px] h-[11px] rounded-[3px] cursor-pointer transition-all ${metadata.colorClass} ${
                                      isSelected ? 'ring-2 ring-violet-400 scale-125 z-10' : ''
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-white/5 pt-3">
                    <span className="flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-violet-400" />
                      Tip: Click any square to check detailed logs on that day.
                    </span>
                    <span className="text-slate-400 font-extrabold">Past 12 Months Grid</span>
                  </div>
                </div>

                {/* Right 1 col: Interactive Shadcn-style Month Datepicker */}
                <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="p-1 hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black tracking-wider text-white uppercase">
                      {fullMonthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="p-1 hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                      <span key={d} className="text-[10px] font-extrabold text-slate-500 uppercase select-none">
                        {d}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {getMonthDays(currentMonth).map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="h-8 w-8"></div>;
                      
                      const metadata = getCellMetadata(day);
                      const isSelected = toLocalDateString(day, tz) === toLocalDateString(selectedDate, tz);
                      
                      const indicators = [];
                      if (metadata.salaries.length > 0) indicators.push('bg-emerald-500');
                      if (metadata.entries.some(e => e.type === 'LOAN')) indicators.push('bg-orange-500');
                      if (metadata.entries.some(e => e.type === 'ADVANCE')) indicators.push('bg-cyan-500');
                      if (metadata.entries.some(e => e.type === 'LENDING')) indicators.push('bg-blue-500');
                      if (metadata.entries.some(e => e.type === 'SAVINGS')) indicators.push('bg-amber-500');
                      if (metadata.entries.some(e => e.type === 'SPENDING')) indicators.push('bg-violet-500');

                      return (
                        <button
                          key={day.getTime()}
                          onClick={() => {
                            handleDateSelect(day);
                          }}
                          className={`h-8 w-8 flex flex-col items-center justify-center rounded-lg text-xs font-semibold relative transition-all ${
                            isSelected 
                              ? 'bg-violet-600 text-white font-extrabold ring-2 ring-violet-400' 
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <span className={isSelected ? '' : 'text-slate-200'}>{day.getDate()}</span>
                          {indicators.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5 justify-center absolute bottom-1">
                              {indicators.slice(0, 3).map((bg, dotIdx) => (
                                <span key={dotIdx} className={`w-1 h-1 rounded-full ${bg}`} />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Date Transaction Drawer/List */}
              <div className="border-t border-white/5 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-5 h-5 text-violet-400" />
                  <h4 className="text-sm font-black tracking-tight text-white">
                    Logs on {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h4>
                </div>

                {isSelectingDate ? (
                  <div className="py-8 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    <span className="text-xs text-slate-500 font-bold animate-pulse">Syncing transactions ledger...</span>
                  </div>
                ) : (() => {
                  const metadata = getCellMetadata(selectedDate);
                  const hasTx = metadata.entries.length > 0 || metadata.salaries.length > 0;

                  if (!hasTx) {
                    return (
                      <div className="py-8 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2 select-none">
                        <AlertCircle className="w-4 h-4 opacity-50 text-slate-500" />
                        No transaction activity logged on this calendar date.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {metadata.salaries.map((salary) => (
                        <div
                          key={salary.id}
                          className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex justify-between items-center hover:bg-white/[0.04] transition-all"
                        >
                          <div className="text-left">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Income Inflow</span>
                            <h5 className="text-sm font-extrabold text-white mt-0.5">Month Salary Received</h5>
                            <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              SALARY
                            </span>
                          </div>
                          <span className="text-md font-black text-emerald-400">
                            + {formatCurrency(salary.amount)}
                          </span>
                        </div>
                      ))}

                      {metadata.entries.map((entry) => {
                        const amt = parseFloat(entry.amount);
                        const isSpending = entry.type === 'SPENDING';
                        const isLending = entry.type === 'LENDING';
                        const isLoan = entry.type === 'LOAN';
                        const isAdvance = entry.type === 'ADVANCE';
                        const isSavings = entry.type === 'SAVINGS';

                        let typeBadgeClass = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
                        let amountClass = 'text-white';
                        let prefix = '';

                        if (isSpending) {
                          typeBadgeClass = 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
                          amountClass = 'text-violet-400';
                          prefix = '-';
                        } else if (isLoan) {
                          typeBadgeClass = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
                          amountClass = 'text-orange-400';
                          prefix = '+';
                        } else if (isLending) {
                          typeBadgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                          amountClass = 'text-blue-400';
                          prefix = '-';
                        } else if (isAdvance) {
                          typeBadgeClass = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
                          amountClass = 'text-cyan-400';
                          prefix = '+';
                        } else if (isSavings) {
                          typeBadgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                          amountClass = 'text-amber-400';
                          prefix = '-';
                        }

                        return (
                          <div
                            key={entry.id}
                            className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex justify-between items-center hover:bg-white/[0.04] transition-all"
                          >
                            <div className="text-left">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                {isSpending || isLending || isSavings ? 'Outflow Transaction' : 'Inflow Transaction'}
                              </span>
                              <h5 className="text-sm font-extrabold text-white mt-0.5">{entry.title}</h5>
                              <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase ${typeBadgeClass}`}>
                                {entry.type}
                              </span>
                            </div>
                            <span className={`text-md font-black ${amountClass}`}>
                              {prefix} {formatCurrency(amt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Row 2: Triple Chart Columns (Income vs Outflow, Spending Trends, AND Balance & Savings) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
              {/* Chart A: Income vs Outflow Area Graph */}
              <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                    <Coins className="w-4 h-4 text-emerald-400" /> Income vs Outflow
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-5">Cash inflows vs outflows per cycle</p>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Inflow" stroke="#10B981" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Outflow" stroke="#F43F5E" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: Monthly Spending Trends Bar Chart */}
              <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-rose-400" /> Historical Spending
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-5">Monthly expense trajectory across cycles</p>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Spending" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart C: Balance & Savings Trend Stacked Bar Chart */}
              <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                    <PiggyBank className="w-4 h-4 text-amber-400" /> Balance & Savings
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-5">Pocket reserve + logged savings stacked</p>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Remaining Balance" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Invested Savings" stackId="a" fill="#5E6AD2" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 3: Category Breakdown Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
              {/* Category Pie Chart */}
              <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                    <PieIcon className="w-4 h-4 text-[#5E6AD2]" /> Cycle Spending Breakdown
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-5">Categorical distribution of expenditures in active cycle</p>
                </div>

                {pieChartData.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 font-mono text-xs">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No spending logged in the current active billing cycle.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-60">
                    <div className="w-44 h-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={3}
                            stroke="rgba(10,10,12,0.8)"
                            strokeWidth={2}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full space-y-2 max-w-xs font-mono text-xs">
                      {pieChartData.map((slice, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
                          <div className="flex items-center gap-2 text-slate-200">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[slice.name] }}></span>
                            <span>{slice.name}</span>
                          </div>
                          <span className="font-semibold text-white">{formatCurrency(slice.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Category Stats summary card */}
              <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <PiggyBank className="w-4 h-4 text-[#06B6D4]" /> Cycle Discipline
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3.5 bg-[#050506] border border-white/[0.06] rounded-xl text-left">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Target Rule</span>
                      <h4 className="text-xs font-semibold text-white mt-1">Inflow &gt; Outflow Velocity</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Maintaining net cashflow surplus preserves safety buffer for upcoming cycles.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#050506] border border-white/[0.06] rounded-xl text-left">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Auto Deduction</span>
                      <h4 className="text-xs font-semibold text-white mt-1">Salary Balance Synchronization</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Balances adjust when checking "Use Salary Balance" during transaction entries.
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/transactions"
                  className="mt-5 btn-linear-secondary text-xs text-center py-2.5 flex items-center justify-center gap-1.5"
                >
                  View Passbook Ledger
                </Link>
              </div>
            </div>

            {/* Row 4: Stocks Portfolio Performance & Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
              {/* Stock Growth Comparison Bar Chart */}
              <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-[#5E6AD2]" /> Stock Portfolio Performance
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-5">Invested capital vs live market valuation</p>
                </div>

                {stockHoldings.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 font-mono text-xs">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No stocks logged in your Groww portfolio ledger.
                    <div className="mt-3">
                      <Link
                        href="/stocks"
                        className="btn-linear-secondary text-xs inline-flex items-center gap-1 px-3 py-1.5"
                      >
                        Add Stocks
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stockHoldings.map(h => ({
                          name: h.symbol.split('.')[0],
                          Invested: h.investedValue,
                          Current: h.currentValue
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                          }}
                          formatter={(value) => [formatCurrency(value), '']}
                        />
                        <Bar dataKey="Invested" fill="#5E6AD2" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Current" fill="#06B6D4" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Stock Allocation & Summary */}
              <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl shadow-linear-card backdrop-blur-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <PieIcon className="w-4 h-4 text-[#06B6D4]" /> Portfolio Holdings Weight
                  </h3>

                  {stockHoldings.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 font-mono text-xs">
                      Log shares to view asset allocation.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1 font-mono text-xs">
                        {stockHoldings.map((h, idx) => {
                          const weight = stockSummary.totalCurrentValue > 0 
                            ? ((h.currentValue / stockSummary.totalCurrentValue) * 100).toFixed(1) 
                            : '0.0';
                          return (
                            <div key={idx} className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-white">{h.symbol.split('.')[0]}</span>
                                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{h.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-300 font-semibold">{formatCurrency(h.currentValue)}</span>
                                <span className="block text-[10px] text-[#818cf8] font-semibold">{weight}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {stockHoldings.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Holdings Count</span>
                    <span className="text-white font-semibold">{stockHoldings.length} Positions</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-[#050506]/60 backdrop-blur-xl py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-slate-500 text-xs font-mono text-center">
          © {new Date().getFullYear()} ePassbook Analytics & Reporting Engine.
        </div>
      </footer>
    </div>
  );
}
