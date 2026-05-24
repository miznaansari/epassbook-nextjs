'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
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
  Coins, 
  AlertCircle,
  PiggyBank
} from 'lucide-react';
import { getLogicalCyclePeriod } from '@/lib/cycle';

export default function Reports() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Data States
  const [salaries, setSalaries] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [cycleDate, setCycleDate] = useState(1);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch all user transactions & salaries
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoadingData(true);
      try {
        // Fetch User settings
        const userRes = await fetch(`/api/user`);
        if (userRes.ok) {
          const userPayload = await userRes.json();
          // Find the current authenticated user's cycle date
          // If we have to search the list of users or read specific payload:
          // Our POST/api/user endpoint returned user record, let's look at user.salaryCycleDate
          setCycleDate(user.salaryCycleDate || 1);
        }

        // Fetch Salaries
        const salRes = await fetch(`/api/salary?userId=${user.uid}`);
        const salData = salRes.ok ? await salRes.json() : [];
        setSalaries(salData);

        // Fetch Entries
        const entRes = await fetch(`/api/entries?userId=${user.uid}`);
        const entData = entRes.ok ? await entRes.json() : [];
        setEntries(entData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (user) {
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
      
      // b. Inflows that fell into this cycle date boundary (Advance + Loan)
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

      const totalInflow = salaryAmt + inflowExtra;

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

      result.push({
        name: label,
        Inflow: totalInflow,
        Outflow: totalOutflow,
        Spending: totalSpending,
      });
    }

    return result;
  };

  const monthlyChartData = prepareMonthlyComparisonData();

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
        <div className="bg-slate-950/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md text-left">
          <p className="text-xs font-bold text-slate-500 mb-1.5">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-xs font-black tracking-tight flex items-center gap-2" style={{ color: item.color || item.fill }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }}></span>
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Row 1: Header Titles */}
        <div className="text-left mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <AreaIcon className="w-8 h-8 text-violet-400" /> Analytics & Reports
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Explore Gen-Z style charts and deep monthly spending insights.</p>
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-80 bg-white/5 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Row 2: Double Chart Columns (Income vs Outflow AND Spending Trends) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
              
              {/* Chart A: Income vs Outflow Area Graph */}
              <div className="glass-card p-6 border border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-emerald-400" /> Income vs Outflow
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mb-6">Compare cash inflows (salaries + advances) against cash outflows.</p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Inflow" stroke="#10B981" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Outflow" stroke="#F43F5E" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: Monthly Spending Trends Bar Chart */}
              <div className="glass-card p-6 border border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-rose-400" /> Historical Spending Trends
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mb-6">Explore total spending amounts across the past six salary cycles.</p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Spending" fill="#F43F5E" radius={[8, 8, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 3: Category Breakdown Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
              
              {/* Category Pie Chart */}
              <div className="glass-card p-6 border border-white/5 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-2 mb-2">
                    <PieIcon className="w-5 h-5 text-violet-400" /> Current Cycle Spending breakdown
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mb-6">Visual breakdown of where your cash went in the current salary cycle.</p>
                </div>

                {pieChartData.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 font-medium">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    No spending logged in the current active billing cycle.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-64">
                    {/* Left: Pie visual container */}
                    <div className="w-48 h-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
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

                    {/* Right: Legend list detailing exact amounts */}
                    <div className="w-full space-y-2.5 max-w-xs">
                      {pieChartData.map((slice, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-1.5">
                          <div className="flex items-center gap-2 font-bold text-white">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[slice.name] }}></span>
                            <span>{slice.name}</span>
                          </div>
                          <span className="font-extrabold text-slate-400">{formatCurrency(slice.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Category Stats summary card */}
              <div className="glass-card p-6 border border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-2 mb-4">
                    <PiggyBank className="w-5 h-5 text-cyan-400" /> Cycle Performance
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Savings Target</span>
                      <h4 className="text-md font-bold text-white mt-1">Spend less than Inflow</h4>
                      <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                        Keeping your outflows (Spendings + Lendings) below your inflows is the golden rule. Talk to your assistant to evaluate customized savings templates.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Auto Deductions</span>
                      <h4 className="text-md font-bold text-white mt-1">Salary Balance Tracking</h4>
                      <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                        Your Salary Balance dynamically adapts when checking "Use Salary Balance" during transaction logs. Ensure logs are mapped to the correct cycle!
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/transactions"
                  className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-black tracking-wider text-center uppercase transition-all"
                >
                  View Passbook Ledger
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-xs text-center font-medium">
          © {new Date().getFullYear()} Manage Monthly Money. Responsive Recharts Core.
        </div>
      </footer>
    </div>
  );
}
