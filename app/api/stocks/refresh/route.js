import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch unique symbols held by user
    const holdings = await db.stockHolding.findMany({
      where: { userId: user.id },
      select: { symbol: true },
    });

    const uniqueSymbols = Array.from(new Set(holdings.map(h => h.symbol)));

    // If no holdings, no need to refresh or consume quota
    if (uniqueSymbols.length === 0) {
      return NextResponse.json({ success: true, message: 'No holdings to refresh.' });
    }

    // 2. Check daily limit
    const todayStr = new Date().toISOString().split('T')[0];
    const apiUsage = await db.stockApiUsage.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: todayStr,
        },
      },
    });

    const currentCount = apiUsage ? apiUsage.count : 0;
    if (currentCount >= 10) {
      return NextResponse.json(
        { 
          error: 'LIMIT_EXCEEDED', 
          message: 'You have reached the limit of 10 stock refreshes per day.' 
        }, 
        { status: 429 }
      );
    }

    // 3. Fetch latest prices from Yahoo Finance Chart API in parallel
    const priceUpdates = [];
    const fetchPromises = uniqueSymbols.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
        );
        if (!res.ok) {
          console.error(`Failed to fetch price for ${symbol}:`, res.statusText);
          return;
        }

        const data = await res.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

        if (price !== undefined && price !== null) {
          priceUpdates.push({ symbol, price });
        }
      } catch (err) {
        console.error(`Error fetching price for ${symbol}:`, err);
      }
    });

    await Promise.all(fetchPromises);

    // 4. Update the cached prices in the database and increment usage counter
    const updatedCount = await db.$transaction(async (tx) => {
      // Upsert all fetched prices
      for (const update of priceUpdates) {
        await tx.stockPrice.upsert({
          where: { symbol: update.symbol },
          update: { price: update.price },
          create: { symbol: update.symbol, price: update.price },
        });
      }

      // Increment usage count
      const usage = await tx.stockApiUsage.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: todayStr,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          userId: user.id,
          date: todayStr,
          count: 1,
        },
      });

      return usage.count;
    });

    return NextResponse.json({
      success: true,
      refreshedCount: priceUpdates.length,
      limitRemaining: Math.max(0, 10 - updatedCount),
    });
  } catch (error) {
    console.error('Error in /api/stocks/refresh POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
