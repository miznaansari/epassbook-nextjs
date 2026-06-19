import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getMonthlyBalances } from '@/lib/balances';

// GET: Fetch user's stock holdings and return calculated portfolio totals
export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch holdings
    const holdings = await db.stockHolding.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch cached prices
    const symbols = Array.from(new Set(holdings.map(h => h.symbol)));
    const cachedPrices = await db.stockPrice.findMany({
      where: { symbol: { in: symbols } },
    });

    const priceMap = {};
    cachedPrices.forEach(p => {
      priceMap[p.symbol] = parseFloat(p.price);
    });

    // 3. Process holdings by grouping them by symbol
    const groupedMap = {};

    holdings.forEach(h => {
      if (!groupedMap[h.symbol]) {
        groupedMap[h.symbol] = {
          symbol: h.symbol,
          name: h.name,
          totalQuantity: 0,
          totalInvested: 0,
          purchases: [],
          latestUpdatedAt: h.updatedAt,
        };
      }
      
      const quantity = h.quantity;
      const buyPrice = parseFloat(h.buyPrice);
      const investedValue = quantity * buyPrice;

      groupedMap[h.symbol].totalQuantity += quantity;
      groupedMap[h.symbol].totalInvested += investedValue;
      groupedMap[h.symbol].purchases.push({
        id: h.id,
        quantity,
        buyPrice,
        createdAt: h.createdAt,
      });

      if (new Date(h.updatedAt) > new Date(groupedMap[h.symbol].latestUpdatedAt)) {
        groupedMap[h.symbol].latestUpdatedAt = h.updatedAt;
      }
    });

    let totalInvested = 0;
    let totalCurrentValue = 0;

    const enrichedHoldings = Object.values(groupedMap).map(group => {
      const currentPrice = priceMap[group.symbol] !== undefined ? priceMap[group.symbol] : (group.totalInvested / group.totalQuantity);
      
      const currentValue = group.totalQuantity * currentPrice;
      const totalReturns = currentValue - group.totalInvested;
      const returnsPercentage = group.totalInvested > 0 ? (totalReturns / group.totalInvested) * 100 : 0;

      totalInvested += group.totalInvested;
      totalCurrentValue += currentValue;

      // Sort purchases by date desc
      group.purchases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        id: group.symbol, // Use symbol as unique key identifier
        symbol: group.symbol,
        name: group.name,
        quantity: group.totalQuantity,
        buyPrice: group.totalInvested / group.totalQuantity, // average buying price
        currentPrice,
        investedValue: group.totalInvested,
        currentValue,
        totalReturns,
        returnsPercentage,
        updatedAt: group.latestUpdatedAt,
        purchases: group.purchases,
      };
    });

    const totalReturns = totalCurrentValue - totalInvested;
    const totalReturnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    // 4. Get remaining API refreshes for today (local date based on server timezone)
    const todayStr = new Date().toISOString().split('T')[0];
    const apiUsage = await db.stockApiUsage.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: todayStr,
        },
      },
    });

    const refreshCount = apiUsage ? apiUsage.count : 0;
    const limitRemaining = Math.max(0, 10 - refreshCount);

    return NextResponse.json({
      holdings: enrichedHoldings,
      summary: {
        totalInvested,
        totalCurrentValue,
        totalReturns,
        totalReturnsPercentage,
      },
      apiLimitRemaining: limitRemaining,
    });
  } catch (error) {
    console.error('Error in /api/stocks/holdings GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add a new stock holding
export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      symbol, 
      name, 
      quantity, 
      buyPrice,
      recordTransaction,
      useSalaryBalance,
      transactionType,
      salaryMonth,
      salaryYear
    } = await req.json();

    if (!symbol || !name || !quantity || !buyPrice) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const parsedQty = parseInt(quantity);
    const parsedPrice = parseFloat(buyPrice);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 });
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: 'Buy price must be a positive number' }, { status: 400 });
    }

    let deductionsToCreate = [];
    let entrySalaryMonth = null;
    let entrySalaryYear = null;

    if (recordTransaction && useSalaryBalance) {
      if (!salaryMonth || !salaryYear) {
        return NextResponse.json({ error: 'Salary month and year are required when Use Salary Balance is checked' }, { status: 400 });
      }
      entrySalaryMonth = parseInt(salaryMonth);
      entrySalaryYear = parseInt(salaryYear);

      const totalAmount = parsedQty * parsedPrice;

      // Fetch current balances
      const balances = await getMonthlyBalances(user.id);
      const mBal = balances.find(b => b.month === entrySalaryMonth && b.year === entrySalaryYear);
      const salRem = mBal ? parseFloat(mBal.salary.remaining) : 0;
      const bonRem = mBal ? parseFloat(mBal.bonus.remaining) : 0;

      if (salRem + bonRem < totalAmount) {
        return NextResponse.json({
          error: 'INSUFFICIENT_BALANCE',
          message: `Insufficient salary cycle balance. Required: ${totalAmount.toFixed(2)}, Available: ${(salRem + bonRem).toFixed(2)}.`,
        }, { status: 400 });
      }

      let rem = totalAmount;
      if (salRem > 0) {
        const deductSal = Math.min(rem, salRem);
        deductionsToCreate.push({
          month: entrySalaryMonth,
          year: entrySalaryYear,
          amount: deductSal,
          type: 'SALARY'
        });
        rem -= deductSal;
      }
      if (rem > 0 && bonRem > 0) {
        const deductBon = Math.min(rem, bonRem);
        deductionsToCreate.push({
          month: entrySalaryMonth,
          year: entrySalaryYear,
          amount: deductBon,
          type: 'BONUS'
        });
        rem -= deductBon;
      }
    }

    // Execute in transaction: create holding, ensure price cache, and create financial entry if requested
    const holding = await db.$transaction(async (tx) => {
      const createdHolding = await tx.stockHolding.create({
        data: {
          userId: user.id,
          symbol,
          name,
          quantity: parsedQty,
          buyPrice: parsedPrice,
        },
      });

      // Ensure price is cached initially (using buy price as fallback)
      await tx.stockPrice.upsert({
        where: { symbol },
        update: {},
        create: { symbol, price: parsedPrice },
      });

      if (recordTransaction) {
        const totalAmount = parsedQty * parsedPrice;
        await tx.financialEntry.create({
          data: {
            userId: user.id,
            amount: totalAmount,
            title: `Invested in ${name} (${symbol})`,
            description: `Purchased ${parsedQty} shares at ${parsedPrice} per share.`,
            type: transactionType || 'SAVINGS',
            useSalaryBalance: !!useSalaryBalance,
            salaryMonth: entrySalaryMonth,
            salaryYear: entrySalaryYear,
            date: new Date(),
            deductions: {
              create: deductionsToCreate.map(d => ({
                month: d.month,
                year: d.year,
                amount: d.amount,
                type: d.type
              }))
            }
          }
        });
      }

      return createdHolding;
    });

    return NextResponse.json(holding);
  } catch (error) {
    console.error('Error in /api/stocks/holdings POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a stock holding
export async function DELETE(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing holding ID' }, { status: 400 });
    }

    const holdingId = parseInt(id);
    if (isNaN(holdingId)) {
      return NextResponse.json({ error: 'Invalid holding ID' }, { status: 400 });
    }

    const existingHolding = await db.stockHolding.findUnique({
      where: { id: holdingId },
    });

    if (!existingHolding) {
      return NextResponse.json({ error: 'Stock holding not found' }, { status: 404 });
    }

    if (existingHolding.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.stockHolding.delete({
      where: { id: holdingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/stocks/holdings DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
