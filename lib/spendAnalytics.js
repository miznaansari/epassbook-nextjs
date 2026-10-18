import { getLogicalCyclePeriod, getRangeForLogicalPeriod } from '@/lib/cycle';

/**
 * Spend analytics helpers for the Reports page.
 * Pure functions only — everything runs client-side over the /api/entries payload.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Spending categories. `match` runs against lowercased entry text.
// Order of CATEGORY_MATCH_ORDER decides priority when several patterns hit.
export const CATEGORIES = {
  groceries: { name: 'Groceries', match: /grocer|kirana|vegetable|\bveg(gie)?s?\b|sabzi|sabji|\bfruits?\b|\bmilk\b|doodh|dairy|ration|\batta\b|\brice\b|\bdal\b|\beggs?\b|\bbread\b|supermarket|\bmart\b|provision/ },
  food_delivery: { name: 'Food Delivery', match: /food delivery|order(ed)? food|online food/ },
  dining: { name: 'Dining & Cafés', match: /restaurant|\bcaf[eé]\b|coffee|\bchai\b|\btea\b|lunch|dinner|breakfast|snack|\bfood\b|biryani|pizza|burger|momo|juice|dhaba|canteen|\bmess\b|bakery|sweets|ice ?cream|eat(ing)? out|coca-?cola|\bcoke\b|pepsi|cold ?drink|\bmeal\b/ },
  shopping: { name: 'Shopping', match: /shopping|cloth|shirt|jeans|shoes|footwear|dress|kurta|electronics|gadget|headphone|earphone|earbuds|charger|\bbags?\b|decathlon|\bmall\b/ },
  transport: { name: 'Transport & Fuel', match: /\bcab\b|taxi|\bauto\b|rickshaw|metro|\bbus\b|\btrain\b|petrol|diesel|\bfuel\b|\bcng\b|parking|\btoll\b|fastag|bike service|car service|\bride\b|commute/ },
  bills: { name: 'Bills & Recharge', match: /\bbills?\b|electricity|recharge|wi-?fi|internet|broadband|postpaid|prepaid|\bdth\b|cylinder|\blpg\b|piped gas|water bill/ },
  housing: { name: 'Rent & Home', match: /\brent\b|\bflat\b|\bpg\b|hostel|maintenance|society|\bmaid\b|\bcook\b|house ?help|furniture|plumber|electrician|repair/ },
  subscriptions: { name: 'Subscriptions & OTT', match: /subscription|\bott\b|membership|premium|renewal|icloud|chatgpt|\bdomain\b|hosting/ },
  entertainment: { name: 'Entertainment', match: /movie|cinema|concert|\bgames?\b|gaming|party|outing|\bclub\b|bowling|amusement|\bdrinks\b|\bbar\b/ },
  health: { name: 'Health & Fitness', match: /doctor|medicine|medical|pharmacy|hospital|clinic|dental|dentist|\blab\b|checkup|\bgym\b|fitness|yoga|protein|supplement/ },
  education: { name: 'Education', match: /course|\bbooks?\b|udemy|coursera|tuition|coaching|\bexam\b|school|college|stationery/ },
  travel: { name: 'Travel', match: /flight|hotel|\btrip\b|travel|vacation|holiday|\boyo\b|airbnb|\btour\b|resort|\bvisa\b/ },
  personal: { name: 'Personal Care', match: /salon|hair ?cut|parlou?r|grooming|\bspa\b|cosmetic|skincare|shaving/ },
  family: { name: 'Gifts & Family', match: /gift|donation|charity|temple|mosque|church|family|parents|\bmom\b|\bdad\b|wedding|birthday/ },
  finance: { name: 'EMI & Fees', match: /\bemi\b|credit card|interest|loan repay|insurance|bank charge|penalty|late fee|\bfees?\b/ },
  other: { name: 'Other', match: null },
};

const CATEGORY_MATCH_ORDER = [
  'groceries', 'food_delivery', 'finance', 'health', 'bills', 'housing', 'transport', 'travel',
  'education', 'personal', 'family', 'shopping', 'entertainment', 'subscriptions', 'dining',
];

// Known apps / merchants. More specific patterns must come first (Instamart before Swiggy).
export const APPS = [
  { id: 'blinkit', name: 'Blinkit', color: '#F8CB46', category: 'groceries', match: /blinkit|grofers/ },
  { id: 'zepto', name: 'Zepto', color: '#7B2FF7', category: 'groceries', match: /zepto/ },
  { id: 'instamart', name: 'Instamart', color: '#FC8019', category: 'groceries', match: /instamart/ },
  { id: 'bigbasket', name: 'BigBasket', color: '#84C225', category: 'groceries', match: /big ?basket|\bbb ?now\b/ },
  { id: 'amazon_fresh', name: 'Amazon Fresh', color: '#5EA03E', category: 'groceries', match: /amazon ?fresh/ },
  { id: 'jiomart', name: 'JioMart', color: '#0078AD', category: 'groceries', match: /jio ?mart/ },
  { id: 'dmart', name: 'DMart', color: '#00A04A', category: 'groceries', match: /\bd-? ?mart\b/ },
  { id: 'swiggy', name: 'Swiggy', color: '#FC8019', category: 'food_delivery', match: /swiggy/ },
  { id: 'zomato', name: 'Zomato', color: '#E23744', category: 'food_delivery', match: /zomato/ },
  { id: 'eatsure', name: 'EatSure', color: '#E5243F', category: 'food_delivery', match: /eat ?sure/ },
  { id: 'dominos', name: "Domino's", color: '#006491', category: 'dining', match: /domino/ },
  { id: 'mcdonalds', name: "McDonald's", color: '#FFC72C', category: 'dining', match: /mc ?donald|\bmcd\b/ },
  { id: 'kfc', name: 'KFC', color: '#E4002B', category: 'dining', match: /\bkfc\b/ },
  { id: 'starbucks', name: 'Starbucks', color: '#00704A', category: 'dining', match: /starbucks/ },
  { id: 'burger_king', name: 'Burger King', color: '#D62300', category: 'dining', match: /burger ?king/ },
  { id: 'prime', name: 'Amazon Prime', color: '#00A8E1', category: 'subscriptions', match: /amazon ?prime|prime ?video/ },
  { id: 'amazon', name: 'Amazon', color: '#FF9900', category: 'shopping', match: /amazon|\bamzn\b/ },
  { id: 'flipkart', name: 'Flipkart', color: '#2874F0', category: 'shopping', match: /flipkart/ },
  { id: 'myntra', name: 'Myntra', color: '#FF3F6C', category: 'shopping', match: /myntra/ },
  { id: 'ajio', name: 'AJIO', color: '#2C4152', category: 'shopping', match: /\bajio\b/ },
  { id: 'meesho', name: 'Meesho', color: '#9F2089', category: 'shopping', match: /meesho/ },
  { id: 'nykaa', name: 'Nykaa', color: '#FC2779', category: 'personal', match: /nykaa/ },
  { id: 'uber', name: 'Uber', color: '#94A3B8', category: 'transport', match: /\buber\b/ },
  { id: 'ola', name: 'Ola', color: '#A3C93A', category: 'transport', match: /\bola\b(?! ?electric)/ },
  { id: 'rapido', name: 'Rapido', color: '#F9C933', category: 'transport', match: /rapido/ },
  { id: 'irctc', name: 'IRCTC', color: '#1F3C88', category: 'travel', match: /irctc/ },
  { id: 'makemytrip', name: 'MakeMyTrip', color: '#E7332A', category: 'travel', match: /make ?my ?trip|\bmmt\b/ },
  { id: 'goibibo', name: 'Goibibo', color: '#EC5B24', category: 'travel', match: /goibibo/ },
  { id: 'redbus', name: 'redBus', color: '#D84E55', category: 'travel', match: /red ?bus/ },
  { id: 'netflix', name: 'Netflix', color: '#E50914', category: 'subscriptions', match: /netflix/ },
  { id: 'hotstar', name: 'JioHotstar', color: '#1F80E0', category: 'subscriptions', match: /hotstar|disney/ },
  { id: 'spotify', name: 'Spotify', color: '#1DB954', category: 'subscriptions', match: /spotify/ },
  { id: 'youtube', name: 'YouTube Premium', color: '#FF0000', category: 'subscriptions', match: /youtube/ },
  { id: 'bookmyshow', name: 'BookMyShow', color: '#F84464', category: 'entertainment', match: /book ?my ?show|\bbms\b/ },
  { id: 'pvr', name: 'PVR INOX', color: '#C8A464', category: 'entertainment', match: /\bpvr\b|\binox\b/ },
  { id: 'airtel', name: 'Airtel', color: '#E40000', category: 'bills', match: /airtel/ },
  { id: 'jio', name: 'Jio', color: '#0F3CC9', category: 'bills', match: /\bjio\b/ },
  { id: 'vi', name: 'Vi', color: '#EE2737', category: 'bills', match: /vodafone|\bvi (recharge|postpaid|bill)/ },
  { id: 'pharmeasy', name: 'PharmEasy', color: '#10847E', category: 'health', match: /pharm ?easy/ },
  { id: 'tata1mg', name: 'Tata 1mg', color: '#FF6F61', category: 'health', match: /\b1 ?mg\b/ },
  { id: 'apollo', name: 'Apollo', color: '#0B6FA4', category: 'health', match: /apollo/ },
  { id: 'cultfit', name: 'Cult.fit', color: '#FF3278', category: 'health', match: /cult ?\.? ?fit/ },
  { id: 'urban_company', name: 'Urban Company', color: '#6E42E5', category: 'housing', match: /urban ?(company|clap)/ },
];

const APP_BY_ID = Object.fromEntries(APPS.map(a => [a.id, a]));

export function getApp(id) {
  return APP_BY_ID[id] || null;
}

const amountOf = (e) => parseFloat(e.amount) || 0;

/**
 * Classify a SPENDING entry: which app (if any), which category, and a merchant key
 * used to group untagged spends by their (normalized) title.
 */
export function classifySpend(entry) {
  const title = (entry.title || '').toLowerCase();
  const full = `${title} ${(entry.description || '').toLowerCase()}`;

  let app = APPS.find(a => a.match.test(title)) || APPS.find(a => a.match.test(full)) || null;

  let category = app?.category;
  if (!category) {
    category = CATEGORY_MATCH_ORDER.find(id => CATEGORIES[id].match.test(title))
      || CATEGORY_MATCH_ORDER.find(id => CATEGORIES[id].match.test(full))
      || 'other';
  }

  const normalizedTitle = (entry.title || 'Untitled')
    .replace(/(?:₹|\$|\brs\.?\s?|\binr\s?)?\b\d+(?:[.,]\d+)?\s?(?:rs|inr|\/-)?(?![a-z])/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled';

  return {
    appId: app?.id || null,
    category,
    merchantKey: app ? `app:${app.id}` : `t:${normalizedTitle.toLowerCase()}`,
    merchantName: app ? app.name : normalizedTitle,
  };
}

const WITHDRAWAL_PREFIX = 'withdrawal: ';

export function isSavingsWithdrawal(entry) {
  if (entry.type !== 'ADVANCE') return false;
  return (entry.title || '').toLowerCase().startsWith(WITHDRAWAL_PREFIX)
    || /withdrawal from savings pot/i.test(entry.description || '');
}

/**
 * Bucket a SAVINGS entry (or a savings withdrawal) into 'sip' | 'stocks' | 'other'.
 * Stock purchases are logged as "Invested in NAME (SYMBOL)" by /api/stocks/holdings,
 * SIP confirmations carry "SIP Payment:" in the description.
 */
export function classifySaving(entry, sipTitles) {
  let title = (entry.title || '').trim().toLowerCase();
  const desc = (entry.description || '').toLowerCase();

  if (entry.type === 'ADVANCE') {
    title = title.startsWith(WITHDRAWAL_PREFIX) ? title.slice(WITHDRAWAL_PREFIX.length).trim() : title;
    const potMatch = desc.match(/withdrawal from savings pot "([^"]+)"/);
    if (potMatch) title = potMatch[1].trim();
  }

  if (/^invested in .+\(.+\)$/.test(title) || /purchased \d+ shares/.test(desc)) return 'stocks';
  if (desc.startsWith('sip payment') || sipTitles.has(title) || /\bsip\b|mutual fund|\bmf\b|\belss\b|index fund/.test(title)) return 'sip';
  return 'other';
}

// --- Cycle helpers ---------------------------------------------------------

function shiftLogical({ month, year }, back) {
  let m = month - back;
  let y = year;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return { month: m, year: y };
}

export function cycleLabel({ month, year }) {
  return `${monthNames[month - 1]} ${String(year).slice(-2)}`;
}

/**
 * Returns the last `count` cycles (oldest first) with their date range.
 */
export function getRecentCycles(count, cycleDate, now = new Date()) {
  const current = getLogicalCyclePeriod(now, cycleDate);
  const cycles = [];
  for (let i = count - 1; i >= 0; i--) {
    const period = shiftLogical(current, i);
    const { startDate, endDate } = getRangeForLogicalPeriod(period.month, period.year, cycleDate);
    cycles.push({ ...period, startDate, endDate, label: cycleLabel(period) });
  }
  return cycles;
}

export const PERIODS = [
  { id: 'cycle', label: 'This cycle' },
  { id: 'last', label: 'Last cycle' },
  { id: '3c', label: '3 cycles' },
  { id: '6c', label: '6 cycles' },
  { id: '12c', label: '12 cycles' },
  { id: 'all', label: 'All time' },
];

/**
 * Builds the analysis window for a period id plus the equivalent previous window
 * used for "vs previous" deltas. "This cycle" is compared against the same number
 * of elapsed days in the previous cycle so partial cycles stay comparable.
 */
export function buildPeriodWindow(periodId, cycleDate, entries, now = new Date()) {
  const current = getLogicalCyclePeriod(now, cycleDate);
  const rangeOf = (back) => {
    const p = shiftLogical(current, back);
    return { ...p, ...getRangeForLogicalPeriod(p.month, p.year, cycleDate) };
  };

  if (periodId === 'last') {
    const last = rangeOf(1);
    const before = rangeOf(2);
    return {
      start: last.startDate,
      end: last.endDate,
      prevStart: before.startDate,
      prevEnd: before.endDate,
      cycles: [last],
      trendCycles: 6,
      compareLabel: 'vs previous cycle',
    };
  }

  if (periodId === 'all') {
    const earliest = entries.reduce((min, e) => {
      const d = new Date(e.date);
      return d < min ? d : min;
    }, now);
    const startPeriod = getLogicalCyclePeriod(earliest, cycleDate);
    const span = (current.year - startPeriod.year) * 12 + (current.month - startPeriod.month) + 1;
    const cycles = Array.from({ length: span }, (_, i) => rangeOf(span - 1 - i));
    return {
      start: cycles[0].startDate,
      end: now,
      prevStart: null,
      prevEnd: null,
      cycles,
      trendCycles: Math.min(Math.max(span, 6), 24),
      compareLabel: null,
    };
  }

  const count = periodId === '3c' ? 3 : periodId === '6c' ? 6 : periodId === '12c' ? 12 : 1;
  const cycles = Array.from({ length: count }, (_, i) => rangeOf(count - 1 - i));
  const start = cycles[0].startDate;
  const prevStart = rangeOf(count * 2 - 1).startDate;
  return {
    start,
    end: now,
    prevStart,
    prevEnd: new Date(prevStart.getTime() + (now - start)),
    cycles,
    trendCycles: Math.max(count, 6),
    compareLabel: count === 1 ? 'vs same day last cycle' : `vs previous ${count} cycles`,
  };
}

const inRange = (e, start, end) => {
  const d = new Date(e.date);
  return d >= start && d <= end;
};

export function pctChange(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

// --- Aggregations ----------------------------------------------------------

/**
 * Everything the Reports insights panel needs for one period, computed in a single pass.
 */
export function computeSpendInsights({ entries, salaries, bonuses, sips, cycleDate, periodId, now = new Date() }) {
  const sipTitles = new Set((sips || []).map(s => s.title.trim().toLowerCase()));
  const window = buildPeriodWindow(periodId, cycleDate, entries, now);
  const { start, end, prevStart, prevEnd } = window;

  const spends = entries
    .filter(e => e.type === 'SPENDING')
    .map(e => ({ ...e, amt: amountOf(e), d: new Date(e.date), ...classifySpend(e) }));

  const current = spends.filter(e => inRange(e, start, end));
  const previous = prevStart ? spends.filter(e => inRange(e, prevStart, prevEnd)) : [];

  const totalSpent = current.reduce((s, e) => s + e.amt, 0);
  const prevSpent = previous.reduce((s, e) => s + e.amt, 0);

  // Group helper: key -> { amount, count, prevAmount }
  const group = (keyFn, metaFn) => {
    const map = new Map();
    const touch = (e) => {
      const key = keyFn(e);
      if (!key) return null;
      if (!map.has(key)) map.set(key, { key, amount: 0, count: 0, prevAmount: 0, ...metaFn(e) });
      return map.get(key);
    };
    current.forEach(e => {
      const g = touch(e);
      if (g) {
        g.amount += e.amt;
        g.count += 1;
      }
    });
    previous.forEach(e => {
      const g = touch(e);
      if (g) g.prevAmount += e.amt;
    });
    return [...map.values()]
      .filter(g => g.amount > 0)
      .map(g => ({
        ...g,
        share: totalSpent > 0 ? (g.amount / totalSpent) * 100 : 0,
        avgTicket: g.count > 0 ? g.amount / g.count : 0,
        change: prevStart ? pctChange(g.amount, g.prevAmount) : null,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const apps = group(e => e.appId, e => {
    const app = getApp(e.appId);
    return { name: app.name, color: app.color, category: app.category };
  });
  const categories = group(e => e.category, e => ({ name: CATEGORIES[e.category].name }));
  const merchants = group(e => e.merchantKey, e => ({
    name: e.merchantName,
    color: e.appId ? getApp(e.appId).color : null,
  }));

  const appSpent = apps.reduce((s, a) => s + a.amount, 0);

  // Savings & investments in window
  const savingsBuckets = { sip: 0, stocks: 0, other: 0 };
  const prevSavingsBuckets = { sip: 0, stocks: 0, other: 0 };
  entries.filter(e => e.type === 'SAVINGS').forEach(e => {
    const bucket = classifySaving(e, sipTitles);
    if (inRange(e, start, end)) savingsBuckets[bucket] += amountOf(e);
    else if (prevStart && inRange(e, prevStart, prevEnd)) prevSavingsBuckets[bucket] += amountOf(e);
  });
  const totalInvested = savingsBuckets.sip + savingsBuckets.stocks + savingsBuckets.other;
  const prevInvested = prevSavingsBuckets.sip + prevSavingsBuckets.stocks + prevSavingsBuckets.other;

  // Income: salary + bonus for every logical cycle inside the window
  const incomeFor = (cycles) => cycles.reduce((sum, c) => {
    const sal = salaries.find(s => s.month === c.month && s.year === c.year);
    const bon = bonuses.find(b => b.month === c.month && b.year === c.year);
    return sum + (sal ? amountOf(sal) : 0) + (bon ? amountOf(bon) : 0);
  }, 0);
  const income = incomeFor(window.cycles);
  const savingsRate = income > 0 ? (totalInvested / income) * 100 : null;

  const daysElapsed = Math.max(1, Math.ceil((Math.min(end, now) - start) / DAY_MS));
  const dailyAvg = totalSpent / daysElapsed;
  const prevDays = prevStart ? Math.max(1, Math.ceil((prevEnd - prevStart) / DAY_MS)) : 0;
  const prevDailyAvg = prevDays ? prevSpent / prevDays : 0;

  let projected = null;
  if (periodId === 'cycle') {
    const c = window.cycles[0];
    const cycleDays = Math.round((c.endDate - c.startDate) / DAY_MS);
    projected = dailyAvg * cycleDays;
  }

  // Day-of-week pattern (Mon..Sun)
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const byWeekday = weekdayNames.map(name => ({ name, amount: 0, count: 0 }));
  current.forEach(e => {
    const idx = (e.d.getDay() + 6) % 7;
    byWeekday[idx].amount += e.amt;
    byWeekday[idx].count += 1;
  });
  // Count how many of each weekday the window covers, to get a fair per-day average
  const weekdayOccurrences = Array(7).fill(0);
  for (let t = new Date(start); t <= end && t <= now; t = new Date(t.getTime() + DAY_MS)) {
    weekdayOccurrences[(t.getDay() + 6) % 7] += 1;
  }
  byWeekday.forEach((w, i) => {
    w.avg = weekdayOccurrences[i] > 0 ? w.amount / weekdayOccurrences[i] : 0;
  });
  const weekendDays = weekdayOccurrences[5] + weekdayOccurrences[6];
  const weekDays = weekdayOccurrences.slice(0, 5).reduce((a, b) => a + b, 0);
  const weekendAvg = weekendDays ? (byWeekday[5].amount + byWeekday[6].amount) / weekendDays : 0;
  const weekdayAvg = weekDays ? byWeekday.slice(0, 5).reduce((s, w) => s + w.amount, 0) / weekDays : 0;

  const topExpenses = [...current].sort((a, b) => b.amt - a.amt).slice(0, 5);

  const unpaidLent = entries
    .filter(e => e.type === 'LENDING')
    .reduce((s, e) => s + (e.unpaidAmount !== undefined ? parseFloat(e.unpaidAmount) : amountOf(e)), 0);

  return {
    window,
    totalSpent,
    prevSpent,
    spentChange: prevStart ? pctChange(totalSpent, prevSpent) : null,
    txCount: current.length,
    apps,
    appSpent,
    appShare: totalSpent > 0 ? (appSpent / totalSpent) * 100 : 0,
    categories,
    merchants,
    savingsBuckets,
    totalInvested,
    investedChange: prevStart ? pctChange(totalInvested, prevInvested) : null,
    income,
    savingsRate,
    dailyAvg,
    dailyAvgChange: prevStart ? pctChange(dailyAvg, prevDailyAvg) : null,
    projected,
    byWeekday,
    weekendAvg,
    weekdayAvg,
    topExpenses,
    unpaidLent,
    spends,
  };
}

/**
 * Per-cycle spend totals for one explorer selection over the last `count` cycles.
 * selection: { kind: 'all' | 'app' | 'category' | 'merchant', key }
 */
export function computeSpendTrend(spends, selection, cycleDate, count, now = new Date()) {
  const matches = (e) => {
    if (selection.kind === 'app') return e.appId === selection.key;
    if (selection.kind === 'category') return e.category === selection.key;
    if (selection.kind === 'merchant') return e.merchantKey === selection.key;
    return true;
  };
  return getRecentCycles(count, cycleDate, now).map(c => {
    const items = spends.filter(e => e.d >= c.startDate && e.d <= c.endDate && matches(e));
    return {
      name: c.label,
      amount: items.reduce((s, e) => s + e.amt, 0),
      count: items.length,
      isCurrent: c.endDate >= now,
    };
  });
}

/**
 * Cumulative spend by day-of-cycle: current cycle vs previous cycle.
 */
export function computeCycleRace(entries, cycleDate, now = new Date()) {
  const [prev, curr] = getRecentCycles(2, cycleDate, now);
  const lengthOf = (c) => Math.round((c.endDate - c.startDate) / DAY_MS);
  const totalDays = Math.max(lengthOf(prev), lengthOf(curr));
  const todayIdx = Math.floor((now - curr.startDate) / DAY_MS) + 1;

  const dailyFor = (c) => {
    const days = Array(totalDays + 1).fill(0);
    entries.forEach(e => {
      if (e.type !== 'SPENDING') return;
      const d = new Date(e.date);
      if (d < c.startDate || d > c.endDate) return;
      const idx = Math.min(totalDays, Math.floor((d - c.startDate) / DAY_MS) + 1);
      days[idx] += amountOf(e);
    });
    return days;
  };

  const currDaily = dailyFor(curr);
  const prevDaily = dailyFor(prev);
  let currRun = 0;
  let prevRun = 0;
  const points = [];
  for (let day = 1; day <= totalDays; day++) {
    currRun += currDaily[day];
    prevRun += prevDaily[day];
    const date = new Date(curr.startDate.getTime() + (day - 1) * DAY_MS);
    points.push({
      day,
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      current: day <= todayIdx ? Math.round(currRun) : null,
      previous: Math.round(prevRun),
    });
  }

  const spentSoFar = points[Math.min(todayIdx, totalDays) - 1]?.current || 0;
  const prevAtSameDay = points[Math.min(todayIdx, totalDays) - 1]?.previous || 0;

  return {
    points,
    todayIdx,
    totalDays,
    spentSoFar,
    prevAtSameDay,
    prevTotal: Math.round(prevRun),
    change: pctChange(spentSoFar, prevAtSameDay),
    currentLabel: curr.label,
    previousLabel: prev.label,
  };
}

/**
 * Cumulative net invested balance (deposits − withdrawals) split by SIP / Stocks / Other,
 * sampled at each activity day inside [start, end]. The first point carries the balance
 * accumulated before the window so the curve shows true growth, not a reset to zero.
 */
export function computeInvestmentGrowth(entries, sips, start, end) {
  const sipTitles = new Set((sips || []).map(s => s.title.trim().toLowerCase()));
  const events = entries
    .filter(e => e.type === 'SAVINGS' || isSavingsWithdrawal(e))
    .map(e => ({
      d: new Date(e.date),
      bucket: classifySaving(e, sipTitles),
      delta: e.type === 'SAVINGS' ? amountOf(e) : -amountOf(e),
    }))
    .sort((a, b) => a.d - b.d);

  if (events.length === 0) return [];

  const run = { sip: 0, stocks: 0, other: 0 };
  const apply = (evt) => {
    run[evt.bucket] = Math.max(0, run[evt.bucket] + evt.delta);
  };
  const snapshot = (d) => ({
    t: d.getTime(),
    name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    sip: Math.round(run.sip),
    stocks: Math.round(run.stocks),
    other: Math.round(run.other),
    total: Math.round(run.sip + run.stocks + run.other),
  });

  const windowStart = start || events[0].d;
  let i = 0;
  while (i < events.length && events[i].d < windowStart) apply(events[i++]);

  const points = [snapshot(i > 0 ? windowStart : new Date(events[0].d.getTime() - DAY_MS))];
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  for (; i < events.length && events[i].d <= end; i++) {
    apply(events[i]);
    const next = events[i + 1];
    // Collapse same-day events into one point
    if (!next || next.d > end || dayKey(next.d) !== dayKey(events[i].d)) {
      points.push(snapshot(events[i].d));
    }
  }

  const last = points[points.length - 1];
  const endPoint = end < new Date() ? end : new Date();
  if (endPoint.getTime() - last.t > DAY_MS) points.push(snapshot(endPoint));
  return points;
}

/**
 * Monthly-equivalent SIP commitment and lifetime contribution per SIP.
 */
export function summarizeSips(sips, entries, start, end) {
  const savings = entries.filter(e => e.type === 'SAVINGS');
  const rows = (sips || []).map(sip => {
    const key = sip.title.trim().toLowerCase();
    const paid = savings.filter(e => (e.title || '').trim().toLowerCase() === key);
    const amount = parseFloat(sip.amount) || 0;
    return {
      id: sip.id,
      title: sip.title,
      amount,
      frequency: sip.frequency,
      isActive: sip.isActive,
      monthly: sip.frequency === 'WEEKLY' ? (amount * 52) / 12 : amount,
      lifetime: paid.reduce((s, e) => s + amountOf(e), 0),
      inWindow: paid.filter(e => inRange(e, start, end)).reduce((s, e) => s + amountOf(e), 0),
      installments: paid.length,
      periods: sip.periods || [],
    };
  });
  return {
    rows: rows.sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.monthly - a.monthly),
    monthlyCommitment: rows.filter(r => r.isActive).reduce((s, r) => s + r.monthly, 0),
    lifetime: rows.reduce((s, r) => s + r.lifetime, 0),
  };
}
