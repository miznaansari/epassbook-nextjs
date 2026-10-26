import { db } from './db';

/**
 * Fetches live prices from Yahoo Finance and syncs them into the shared stockPrice cache.
 * Symbols whose live fetch fails fall back to their last cached price.
 * @param {string[]} symbols
 * @param {Map<string, number|null>} [memo] reuse across calls (e.g. one cron run) so shared symbols are fetched once
 * @returns {Promise<Map<string, number>>} symbol -> price for every symbol that could be resolved
 */
export async function getLivePrices(symbols, memo = new Map()) {
  const uniqueSymbols = Array.from(new Set(symbols));
  const freshQuotes = [];

  await Promise.all(uniqueSymbols.filter(s => !memo.has(s)).map(async (symbol) => {
    let price = null;
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const quote = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof quote === 'number') price = quote;
      } else {
        console.error(`Failed to fetch live price for ${symbol}:`, res.statusText);
      }
    } catch (err) {
      console.error(`Error fetching live price for ${symbol}:`, err);
    }
    // Remember failures too, so a broken symbol isn't retried for every user
    memo.set(symbol, price);
    if (price !== null) freshQuotes.push({ symbol, price });
  }));

  await Promise.all(freshQuotes.map(q => db.stockPrice.upsert({
    where: { symbol: q.symbol },
    update: { price: q.price },
    create: { symbol: q.symbol, price: q.price },
  })));

  const prices = new Map();
  const missing = uniqueSymbols.filter(s => memo.get(s) == null);
  if (missing.length > 0) {
    const cached = await db.stockPrice.findMany({ where: { symbol: { in: missing } } });
    cached.forEach(p => prices.set(p.symbol, parseFloat(p.price)));
  }
  uniqueSymbols.forEach(s => {
    if (memo.get(s) != null) prices.set(s, memo.get(s));
  });

  return prices;
}
