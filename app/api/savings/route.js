import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

// GET: Fetch all savings pots grouped by name, enriched with live stock valuations, balances, and linked SIPs
export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all SAVINGS entries for this user
    const savingEntries = await db.financialEntry.findMany({
      where: {
        userId: user.id,
        type: 'SAVINGS'
      },
      include: { deductions: true },
      orderBy: { date: 'desc' }
    });

    const savingIds = savingEntries.map(e => e.id);

    // 2. Fetch all linked withdrawals or withdrawal entries
    const withdrawalEntries = await db.financialEntry.findMany({
      where: {
        userId: user.id,
        OR: [
          ...(savingIds.length > 0 ? [{ parentEntryId: { in: savingIds } }] : []),
          { description: { contains: 'Withdrawal from savings pot' } },
          { title: { startsWith: 'Withdrawal: ' } }
        ]
      },
      orderBy: { date: 'desc' }
    });

    // 3. Fetch user's SIP configurations
    const userSips = await db.sip.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Fetch user's Stock Holdings & Cached Live Stock Prices
    const stockHoldings = await db.stockHolding.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const stockSymbols = Array.from(new Set(stockHoldings.map(h => h.symbol)));
    const cachedStockPrices = await db.stockPrice.findMany({
      where: { symbol: { in: stockSymbols } }
    });

    const stockPriceMap = {};
    cachedStockPrices.forEach(p => {
      stockPriceMap[p.symbol] = parseFloat(p.price);
    });

    // Group stock holdings by symbol
    const stockSummaryMap = {};
    stockHoldings.forEach(h => {
      if (!stockSummaryMap[h.symbol]) {
        stockSummaryMap[h.symbol] = {
          symbol: h.symbol,
          name: h.name,
          quantity: 0,
          totalInvested: 0,
          currentPrice: stockPriceMap[h.symbol] !== undefined ? stockPriceMap[h.symbol] : parseFloat(h.buyPrice),
          latestUpdatedAt: h.updatedAt,
        };
      }
      const qty = h.quantity;
      const bPrice = parseFloat(h.buyPrice);
      stockSummaryMap[h.symbol].quantity += qty;
      stockSummaryMap[h.symbol].totalInvested += (qty * bPrice);
      if (new Date(h.updatedAt) > new Date(stockSummaryMap[h.symbol].latestUpdatedAt)) {
        stockSummaryMap[h.symbol].latestUpdatedAt = h.updatedAt;
      }
    });

    Object.values(stockSummaryMap).forEach(s => {
      s.currentValue = s.quantity * s.currentPrice;
      s.totalReturns = s.currentValue - s.totalInvested;
      s.returnsPercentage = s.totalInvested > 0 ? (s.totalReturns / s.totalInvested) * 100 : 0;
      s.avgBuyPrice = s.quantity > 0 ? s.totalInvested / s.quantity : 0;
    });

    // 5. Group by pot name / title
    const potsMap = {};

    // Helper to get or create pot
    const getPot = (rawTitle) => {
      const title = (rawTitle || 'General Savings').trim();
      const key = title.toLowerCase();
      if (!potsMap[key]) {
        // Find if there's a matching SIP
        const matchedSip = userSips.find(s => s.title.trim().toLowerCase() === key);
        potsMap[key] = {
          key,
          title,
          totalDeposited: 0,
          totalWithdrawn: 0,
          currentBalance: 0,
          depositsCount: 0,
          withdrawalsCount: 0,
          lastActivityDate: null,
          linkedSip: matchedSip || null,
          isStock: false,
          stockInfo: null,
          deposits: [],
          withdrawals: [],
          history: []
        };
      }
      return potsMap[key];
    };

    // Populate deposits
    for (const entry of savingEntries) {
      const pot = getPot(entry.title);
      const amt = parseFloat(entry.amount) || 0;
      pot.totalDeposited += amt;
      pot.depositsCount += 1;

      const item = {
        id: entry.id,
        kind: 'DEPOSIT',
        title: entry.title,
        amount: amt,
        type: entry.type,
        date: entry.date,
        description: entry.description,
        useSalaryBalance: entry.useSalaryBalance,
        salaryMonth: entry.salaryMonth,
        salaryYear: entry.salaryYear,
        isAiGenerated: entry.isAiGenerated,
      };

      pot.deposits.push(item);
      pot.history.push(item);

      if (!pot.lastActivityDate || new Date(entry.date) > new Date(pot.lastActivityDate)) {
        pot.lastActivityDate = entry.date;
      }
    }

    // Populate withdrawals
    for (const w of withdrawalEntries) {
      let potTitle = '';
      if (w.parentEntryId) {
        const parent = savingEntries.find(s => s.id === w.parentEntryId);
        if (parent) potTitle = parent.title;
      }
      if (!potTitle && w.title.startsWith('Withdrawal: ')) {
        potTitle = w.title.replace('Withdrawal: ', '').trim();
      }
      if (!potTitle && w.description) {
        const match = w.description.match(/Withdrawal from savings pot "([^"]+)"/i);
        if (match && match[1]) potTitle = match[1].trim();
      }
      if (!potTitle) {
        potTitle = w.title;
      }

      const pot = getPot(potTitle);
      const amt = parseFloat(w.amount) || 0;
      pot.totalWithdrawn += amt;
      pot.withdrawalsCount += 1;

      const item = {
        id: w.id,
        kind: 'WITHDRAWAL',
        title: w.title,
        amount: amt,
        type: w.type,
        date: w.date,
        description: w.description,
        parentEntryId: w.parentEntryId,
        isAiGenerated: w.isAiGenerated,
      };

      pot.withdrawals.push(item);
      pot.history.push(item);

      if (!pot.lastActivityDate || new Date(w.date) > new Date(pot.lastActivityDate)) {
        pot.lastActivityDate = w.date;
      }
    }

    // Also include any active SIPs that might not have deposits yet
    for (const sip of userSips) {
      const key = sip.title.trim().toLowerCase();
      if (!potsMap[key]) {
        potsMap[key] = {
          key,
          title: sip.title.trim(),
          totalDeposited: 0,
          totalWithdrawn: 0,
          currentBalance: 0,
          depositsCount: 0,
          withdrawalsCount: 0,
          lastActivityDate: sip.createdAt,
          linkedSip: sip,
          isStock: false,
          stockInfo: null,
          deposits: [],
          withdrawals: [],
          history: []
        };
      }
    }

    // 6. Enrich stock pots with live market valuations
    const stockList = Object.values(stockSummaryMap);

    // First, check existing pots for stock matching
    Object.values(potsMap).forEach(pot => {
      // Find matching stock by symbol or name in title
      const matchedStock = stockList.find(s => {
        const sym = s.symbol.toLowerCase();
        const symWithoutSuffix = sym.replace('.ns', '').replace('.bo', '');
        const nameLower = s.name.toLowerCase();
        const titleLower = pot.title.toLowerCase();

        return (
          titleLower.includes(`(${sym})`) ||
          titleLower.includes(`(${symWithoutSuffix})`) ||
          titleLower.includes(sym) ||
          titleLower.includes(nameLower)
        );
      });

      if (matchedStock) {
        pot.isStock = true;
        pot.stockInfo = {
          symbol: matchedStock.symbol,
          name: matchedStock.name,
          quantity: matchedStock.quantity,
          avgBuyPrice: matchedStock.avgBuyPrice,
          currentPrice: matchedStock.currentPrice,
          currentValue: matchedStock.currentValue,
          investedValue: matchedStock.totalInvested,
          totalReturns: matchedStock.totalReturns,
          returnsPercentage: matchedStock.returnsPercentage,
        };
        // Available balance reflects live market valuation
        pot.currentBalance = matchedStock.currentValue;
        pot.currentValue = matchedStock.currentValue;
        pot.totalReturns = matchedStock.totalReturns;
        pot.returnsPercentage = matchedStock.returnsPercentage;
      }
    });

    // Also ensure every stock in stockHoldings has a pot
    stockList.forEach(s => {
      const alreadyHasPot = Object.values(potsMap).some(p => p.isStock && p.stockInfo?.symbol === s.symbol);
      if (!alreadyHasPot) {
        const title = `Invested in ${s.name} (${s.symbol})`;
        const key = title.toLowerCase();
        potsMap[key] = {
          key,
          title,
          totalDeposited: s.totalInvested,
          totalWithdrawn: 0,
          currentBalance: s.currentValue,
          currentValue: s.currentValue,
          totalReturns: s.totalReturns,
          returnsPercentage: s.returnsPercentage,
          depositsCount: 1,
          withdrawalsCount: 0,
          lastActivityDate: s.latestUpdatedAt,
          linkedSip: null,
          isStock: true,
          stockInfo: {
            symbol: s.symbol,
            name: s.name,
            quantity: s.quantity,
            avgBuyPrice: s.avgBuyPrice,
            currentPrice: s.currentPrice,
            currentValue: s.currentValue,
            investedValue: s.totalInvested,
            totalReturns: s.totalReturns,
            returnsPercentage: s.returnsPercentage,
          },
          deposits: [],
          withdrawals: [],
          history: []
        };
      }
    });

    // Compute non-stock current balances and sort histories
    const potsList = Object.values(potsMap).map(pot => {
      if (!pot.isStock) {
        pot.currentBalance = Math.max(0, pot.totalDeposited - pot.totalWithdrawn);
      }
      pot.history.sort((a, b) => new Date(b.date) - new Date(a.date));
      pot.deposits.sort((a, b) => new Date(b.date) - new Date(a.date));
      pot.withdrawals.sort((a, b) => new Date(b.date) - new Date(a.date));
      return pot;
    });

    // Sort pots by current balance desc, then lastActivityDate desc
    potsList.sort((a, b) => {
      if (b.currentBalance !== a.currentBalance) return b.currentBalance - a.currentBalance;
      return new Date(b.lastActivityDate || 0) - new Date(a.lastActivityDate || 0);
    });

    // Global summary
    const totalAllTimeSaved = potsList.reduce((sum, p) => sum + (p.isStock ? p.stockInfo.investedValue : p.totalDeposited), 0);
    const totalAllTimeWithdrawn = potsList.reduce((sum, p) => sum + p.totalWithdrawn, 0);
    const netSavingsBalance = potsList.reduce((sum, p) => sum + p.currentBalance, 0);
    const activePotsCount = potsList.filter(p => p.currentBalance > 0).length;
    const activeSipsCount = userSips.filter(s => s.isActive).length;

    // Stock portfolio totals
    const totalStockCurrentValue = stockList.reduce((sum, s) => sum + s.currentValue, 0);
    const totalStockInvested = stockList.reduce((sum, s) => sum + s.totalInvested, 0);
    const totalStockReturns = totalStockCurrentValue - totalStockInvested;
    const totalStockReturnsPercentage = totalStockInvested > 0 ? (totalStockReturns / totalStockInvested) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalAllTimeSaved,
        totalAllTimeWithdrawn,
        netSavingsBalance,
        activePotsCount,
        activeSipsCount,
        totalPotsCount: potsList.length,
        stockSummary: {
          totalStockCurrentValue,
          totalStockInvested,
          totalStockReturns,
          totalStockReturnsPercentage,
          stocksCount: stockList.length
        }
      },
      pots: potsList,
      sips: userSips,
      stocks: stockList
    });
  } catch (error) {
    console.error('Error in /api/savings GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
