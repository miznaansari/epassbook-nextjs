'use client';

// TEMPORARY visual preview of the new Reports/Stocks components — delete after review.
import { useState } from 'react';
import ReportInsights from '@/components/reports/ReportInsights';
import PortfolioChart from '@/components/stocks/PortfolioChart';
import history from './history.json';

let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const DAY = 86400000;
const now = Date.now();
const entries = [];
let id = 1;
const add = (daysAgo, type, title, amount, extra = {}) =>
  entries.push({ id: id++, type, title, amount: String(Math.round(amount)), date: new Date(now - daysAgo * DAY - 3600000 * (rand() * 10)).toISOString(), description: '', ...extra });

for (let d = 0; d < 240; d++) {
  if (rand() < 0.35) add(d, 'SPENDING', 'Blinkit', 250 + rand() * 650);
  if (rand() < 0.15) add(d, 'SPENDING', 'Zepto', 200 + rand() * 500);
  if (rand() < 0.2) add(d, 'SPENDING', rand() < 0.5 ? 'Swiggy' : 'Zomato', 300 + rand() * 500);
  if (rand() < 0.25) add(d, 'SPENDING', 'Uber ride', 120 + rand() * 300);
  if (rand() < 0.6) add(d, 'SPENDING', 'Chai / Tea', 20 + rand() * 40);
  if (rand() < 0.1) add(d, 'SPENDING', 'Petrol / Fuel', 800 + rand() * 900);
  if (rand() < 0.05) add(d, 'SPENDING', 'Amazon', 600 + rand() * 3000);
  if ((new Date(now - d * DAY)).getDay() === 6 && rand() < 0.6) add(d, 'SPENDING', 'Movie night', 500 + rand() * 600);
  if (d % 30 === 3) {
    add(d, 'SPENDING', 'Rent', 15000);
    add(d, 'SPENDING', 'Electricity Bill', 1200 + rand() * 900);
    add(d, 'SPENDING', 'Netflix', 649);
    add(d, 'SAVINGS', 'Axis Bluechip', 5000, { description: 'SIP Payment: Axis Bluechip (monthly)' });
    add(d, 'SAVINGS', 'Emergency Fund', 2000);
  }
  if (d % 7 === 2) add(d, 'SAVINGS', 'Parag Parikh Flexi', 750, { description: 'SIP Payment: Parag Parikh Flexi (weekly)' });
}
add(200, 'SAVINGS', 'Invested in Reliance (RELIANCE.NS)', 13000);
add(40, 'SAVINGS', 'Invested in TCS (TCS.NS)', 17500);
add(20, 'SAVINGS', 'Invested in Apple (AAPL)', 380);
add(12, 'ADVANCE', 'Withdrawal: Emergency Fund', 3000, { description: 'Withdrawal from savings pot "Emergency Fund"' });
add(6, 'LENDING', 'Lent to Rahul', 2500, { unpaidAmount: 1500 });

const salaries = [];
for (let i = 0; i < 9; i++) {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
  salaries.push({ id: i, month: d.getMonth() + 1, year: d.getFullYear(), amount: '65000', createdAt: d.toISOString() });
}

const mkPeriods = (statuses) => statuses.map((status, i) => ({ label: `0${i + 5}/26`, targetDate: `t${i}`, status }));
const sips = [
  { id: 1, title: 'Axis Bluechip', amount: 5000, frequency: 'MONTHLY', isActive: true, periods: mkPeriods(['PAID', 'PAID', 'MISSED', 'PAID', 'PAID', 'PENDING']) },
  { id: 2, title: 'Parag Parikh Flexi', amount: 750, frequency: 'WEEKLY', isActive: true, periods: mkPeriods(['PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PENDING']) },
];

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
const formatCompact = (val) => (Math.abs(val) >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${Math.round(val)}`);

const day = history['1D'];
const holdings = Object.entries(day.symbols).map(([symbol, s]) => ({
  symbol,
  name: s.name,
  quantity: s.quantity,
  currentPrice: s.lastPrice,
  currentValue: s.lastPrice * s.quantity,
  investedValue: s.invested,
}));
const totalCurrentValue = holdings.reduce((a, h) => a + h.currentValue, 0);
const summary = { totalCurrentValue, totalInvested: day.invested, totalReturns: totalCurrentValue - day.invested, totalReturnsPercentage: ((totalCurrentValue - day.invested) / day.invested) * 100 };

export default function Preview() {
  const [range, setRange] = useState(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('range') || '1D');
  return (
    <div className="min-h-screen bg-[#050506] p-6 space-y-8 max-w-7xl mx-auto">
      <div className="bg-[#0a0a0c]/80 border border-white/[0.06] rounded-2xl p-6 max-w-4xl">
        <PortfolioChart
          data={history[range] || null}
          isStale={false}
          error=""
          range={range}
          onRangeChange={setRange}
          holdings={holdings}
          summary={summary}
          liveTicks={[]}
          inMarketHours={false}
          formatCurrency={formatCurrency}
          formatCompact={formatCompact}
        />
      </div>
      <ReportInsights
        entries={entries}
        salaries={salaries}
        bonuses={[]}
        sips={sips}
        cycleDate={1}
        user={{ currency: 'INR' }}
        stockSummary={{ totalInvested: 30880, totalCurrentValue: 29968, totalReturns: -912, totalReturnsPercentage: -2.95 }}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
