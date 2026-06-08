import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getCycleRange } from '@/lib/cycle';

export async function POST(req, { params }) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await db.notificationCampaign.findUnique({
      where: { id },
    });

    if (!campaign || campaign.userId !== user.id) {
      return NextResponse.json({ error: 'Campaign Not Found' }, { status: 404 });
    }

    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    const oneSignalAppId = "722dd7e4-705a-4a0e-a0b8-b4e2a3c93057";

    if (!restApiKey) {
      return NextResponse.json({ error: 'ONESIGNAL_REST_API_KEY is not configured on the server.' }, { status: 500 });
    }

    // Fetch necessary data to evaluate variables
    const userSalaries = await db.salary.findMany({
      where: { userId: user.id }
    });
    const userBonuses = await db.bonus.findMany({
      where: { userId: user.id }
    });
    const userEntries = await db.financialEntry.findMany({
      where: { userId: user.id },
      include: { deductions: true }
    });

    // Calculate current period logical dates
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();

    // Find salary & bonus for this month
    const matchingSalary = userSalaries.find(s => s.month === currentMonthNum && s.year === currentYearNum);
    const salaryAmt = matchingSalary ? parseFloat(matchingSalary.amount) : 0;

    const matchingBonus = userBonuses.find(b => b.month === currentMonthNum && b.year === currentYearNum);
    const bonusAmt = matchingBonus ? parseFloat(matchingBonus.amount) : 0;

    // Deductions
    let periodDeductions = 0;
    let savingsDeductions = 0;

    userEntries.forEach(entry => {
      if (entry.deductions) {
        entry.deductions.forEach(d => {
          if (d.month === currentMonthNum && d.year === currentYearNum) {
            const amt = parseFloat(d.amount);
            periodDeductions += amt;
            if (entry.type === 'SAVINGS') {
              savingsDeductions += amt;
            }
          }
        });
      }
    });

    const leftSalary = Math.max(0, (salaryAmt + bonusAmt) - periodDeductions);

    // Savings tracked in cycle range
    const { startDate, endDate } = getCycleRange(now, user.salaryCycleDate || 1);
    const periodOutflows = userEntries.filter(e => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate && e.type === 'SAVINGS';
    });
    const generalSavingsAmt = periodOutflows.filter(e => !e.useSalaryBalance).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalSavingsThisMonth = savingsDeductions + generalSavingsAmt;

    // Stock Holdings value
    const userHoldings = await db.stockHolding.findMany({
      where: { userId: user.id }
    });
    const symbols = userHoldings.map(h => h.symbol);
    const stockPrices = await db.stockPrice.findMany({
      where: { symbol: { in: symbols } }
    });

    let totalInvested = 0;
    let totalCurrentValue = 0;
    userHoldings.forEach(h => {
      const qty = h.quantity;
      const buyVal = parseFloat(h.buyPrice) * qty;
      totalInvested += buyVal;

      const sp = stockPrices.find(p => p.symbol === h.symbol);
      const currentPrice = sp ? parseFloat(sp.price) : parseFloat(h.buyPrice);
      totalCurrentValue += currentPrice * qty;
    });
    const totalReturns = totalCurrentValue - totalInvested;
    const totalReturnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    // Substitutions
    const currencyCode = user.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    const formatVal = (val) => new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0
    }).format(val || 0);

    const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = fullMonthNames[currentMonthNum - 1];

    const replacements = {
      '{{user_name}}': user.name || 'User',
      '{{left_salary}}': formatVal(leftSalary),
      '{{savings}}': formatVal(totalSavingsThisMonth),
      '{{stock_portfolio_value}}': formatVal(totalCurrentValue),
      '{{stock_returns}}': formatVal(totalReturns),
      '{{stock_returns_pct}}': `${totalReturnsPercentage.toFixed(1)}%`,
      '{{current_month}}': monthName,
      '{{current_year}}': currentYearNum.toString()
    };

    let replacedTitle = campaign.title;
    let replacedMessage = campaign.message;

    Object.entries(replacements).forEach(([key, val]) => {
      replacedTitle = replacedTitle.replaceAll(key, val);
      replacedMessage = replacedMessage.replaceAll(key, val);
    });

    // Send push
    const payload = {
      app_id: oneSignalAppId,
      headings: { en: `[TEST] ${replacedTitle}` },
      contents: { en: replacedMessage },
      target_channel: "push",
      include_aliases: {
        external_id: [user.id]
      }
    };

    const response = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const respData = await response.json();
      return NextResponse.json({ success: true, respData });
    } else {
      const errText = await response.text();
      return NextResponse.json({ error: `OneSignal error: ${errText}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in /api/notifications/campaigns/[id]/test:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
