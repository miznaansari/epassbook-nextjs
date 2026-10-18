import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { isMarketHours } from '@/lib/market';

const DAY_SEC = 24 * 60 * 60;

// Yahoo chart parameters per UI range. `step` (seconds) buckets intraday candles so
// symbols from different exchanges line up on a shared timeline.
const RANGES = {
  '1D': { range: '1d', interval: '5m', step: 300, revalidate: 30 },
  '1W': { range: '5d', interval: '30m', step: 1800, revalidate: 300 },
  '1M': { range: '1mo', interval: '1d', revalidate: 1800 },
  '6M': { range: '6mo', interval: '1d', revalidate: 3600 },
  '1Y': { range: '1y', interval: '1d', revalidate: 3600 },
};

// ALL = since the first logged purchase (at least one month). Pick the smallest Yahoo
// range that covers it so the URL stays cacheable, then trim server-side.
function resolveAllRange(earliest) {
  const days = (Date.now() - earliest.getTime()) / (DAY_SEC * 1000);
  const fromSec = Math.floor(earliest.getTime() / 1000) - DAY_SEC;
  if (days <= 30) return { range: '1mo', interval: '1d', revalidate: 1800 };
  if (days <= 90) return { range: '3mo', interval: '1d', revalidate: 3600, fromSec };
  if (days <= 180) return { range: '6mo', interval: '1d', revalidate: 3600, fromSec };
  if (days <= 365) return { range: '1y', interval: '1d', revalidate: 3600, fromSec };
  if (days <= 730) return { range: '2y', interval: '1d', revalidate: 3600, fromSec };
  if (days <= 1825) return { range: '5y', interval: '1wk', revalidate: 3600, fromSec };
  return { range: 'max', interval: '1wk', revalidate: 3600, fromSec };
}

async function fetchChart(symbol, cfg) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: cfg.revalidate },
      }
    );
    if (!res.ok) {
      console.error(`Failed to fetch history for ${symbol}:`, res.statusText);
      return null;
    }
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const series = [];
    timestamps.forEach((t, i) => {
      if (closes[i] !== null && closes[i] !== undefined) series.push([t, closes[i]]);
    });
    return { meta: result.meta || {}, series };
  } catch (err) {
    console.error(`Error fetching history for ${symbol}:`, err);
    return null;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;

// GET: Portfolio value timeline for the user's current holdings over a range
export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rangeKey = (searchParams.get('range') || '1D').toUpperCase();
    if (!RANGES[rangeKey] && rangeKey !== 'ALL') {
      return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
    }

    const holdings = await db.stockHolding.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (holdings.length === 0) {
      return NextResponse.json({ range: rangeKey, intraday: rangeKey === '1D' || rangeKey === '1W', points: [], symbols: {}, baseline: null, invested: 0, marketOpen: isMarketHours() });
    }

    const cfg = rangeKey === 'ALL' ? resolveAllRange(holdings[0].createdAt) : RANGES[rangeKey];
    const intraday = Boolean(cfg.step);

    // Group lots by symbol
    const symbols = {};
    holdings.forEach(h => {
      if (!symbols[h.symbol]) {
        symbols[h.symbol] = { name: h.name, quantity: 0, invested: 0, purchases: [] };
      }
      const price = parseFloat(h.buyPrice);
      symbols[h.symbol].quantity += h.quantity;
      symbols[h.symbol].invested += h.quantity * price;
      symbols[h.symbol].purchases.push({ t: h.createdAt.getTime(), quantity: h.quantity, price });
    });
    const symbolList = Object.keys(symbols);

    const cachedPrices = await db.stockPrice.findMany({ where: { symbol: { in: symbolList } } });
    const cachedMap = Object.fromEntries(cachedPrices.map(p => [p.symbol, parseFloat(p.price)]));

    const charts = await Promise.all(symbolList.map(s => fetchChart(s, cfg)));

    // Bucket each symbol's closes onto a shared key: intraday by candle step,
    // daily/weekly by exchange-local calendar date.
    const bucketMaps = {};
    const preWindowClose = {};
    const allKeys = new Set();
    symbolList.forEach((s, i) => {
      const chart = charts[i];
      const map = new Map();
      if (chart) {
        const offset = chart.meta.gmtoffset || 0;
        chart.series.forEach(([t, close]) => {
          const key = intraday
            ? Math.floor(t / cfg.step) * cfg.step
            : Math.floor((t + offset) / DAY_SEC) * DAY_SEC;
          if (cfg.fromSec && key < cfg.fromSec) {
            preWindowClose[s] = close;
            return;
          }
          map.set(key, close);
          allKeys.add(key);
        });
      }
      bucketMaps[s] = map;
    });

    // Walk the shared timeline, forward-filling each symbol's last known close
    const lastPrice = {};
    symbolList.forEach((s, i) => {
      const chart = charts[i];
      const fallback = cachedMap[s] ?? symbols[s].invested / symbols[s].quantity;
      const firstClose = bucketMaps[s].size > 0 ? bucketMaps[s].values().next().value : null;
      const rangeStartClose = cfg.fromSec ? preWindowClose[s] : chart?.meta?.chartPreviousClose;
      lastPrice[s] = rangeStartClose ?? firstClose ?? fallback;
    });

    const points = [...allKeys].sort((a, b) => a - b).map(key => {
      let value = 0;
      const prices = {};
      symbolList.forEach(s => {
        const close = bucketMaps[s].get(key);
        if (close !== undefined) lastPrice[s] = close;
        prices[s] = round2(lastPrice[s]);
        value += symbols[s].quantity * lastPrice[s];
      });
      return { t: key * 1000, v: round2(value), p: prices };
    });

    let previousCloseValue = 0;
    let hasAllPreviousCloses = true;
    symbolList.forEach((s, i) => {
      const meta = charts[i]?.meta || {};
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
      const latest = meta.regularMarketPrice ?? cachedMap[s] ?? null;
      symbols[s].previousClose = prevClose;
      symbols[s].lastPrice = latest;
      symbols[s].avgBuy = symbols[s].invested / symbols[s].quantity;
      symbols[s].stale = !charts[i] || bucketMaps[s].size === 0;
      if (prevClose === null) hasAllPreviousCloses = false;
      else previousCloseValue += symbols[s].quantity * prevClose;
    });

    // The 1D call carries live quotes — keep the shared price cache in sync so
    // holdings/summary numbers match the chart without spending a manual refresh.
    if (rangeKey === '1D') {
      const freshQuotes = symbolList.filter(s => typeof symbols[s].lastPrice === 'number' && !symbols[s].stale);
      await Promise.all(freshQuotes.map(s => db.stockPrice.upsert({
        where: { symbol: s },
        update: { price: symbols[s].lastPrice },
        create: { symbol: s, price: symbols[s].lastPrice },
      })));
    }

    const invested = symbolList.reduce((sum, s) => sum + symbols[s].invested, 0);
    const baseline = rangeKey === '1D' && hasAllPreviousCloses
      ? round2(previousCloseValue)
      : (points[0]?.v ?? null);

    return NextResponse.json({
      range: rangeKey,
      intraday,
      points,
      symbols,
      baseline,
      invested: round2(invested),
      marketOpen: isMarketHours(),
    });
  } catch (error) {
    console.error('Error in /api/stocks/history GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
