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
    // Calculate current period logical dates using user's timezone
    const now = new Date();
    const tzString = user.timezone || 'UTC';
    let localYear, localMonth, localDay, localHour, localMinute;
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tzString,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const getPartVal = (type) => parseInt(parts.find(p => p.type === type)?.value, 10);
      localYear = getPartVal('year');
      localMonth = getPartVal('month') - 1; // 0-indexed month
      localDay = getPartVal('day');
      localHour = getPartVal('hour');
      localMinute = getPartVal('minute');
    } catch (tzErr) {
      localYear = now.getUTCFullYear();
      localMonth = now.getUTCMonth();
      localDay = now.getUTCDate();
      localHour = now.getUTCHours();
      localMinute = now.getUTCMinutes();
    }

    const userLocalDate = new Date(localYear, localMonth, localDay, localHour, localMinute, 0);
    const userLocalDateStr = `${localYear}-${localMonth + 1}-${localDay}`;
    const currentMonthNum = localMonth + 1;
    const currentYearNum = localYear;

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
    const { startDate, endDate } = getCycleRange(userLocalDate, user.salaryCycleDate || 1);
    const periodOutflows = userEntries.filter(e => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate && e.type === 'SAVINGS';
    });
    const generalSavingsAmt = periodOutflows.filter(e => !e.useSalaryBalance).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalSavingsThisMonth = savingsDeductions + generalSavingsAmt;

    // Calculate spending variables timezone-aware
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const userSpends = userEntries.filter(e => e.type === 'SPENDING' && new Date(e.date) >= fortyDaysAgo);

    let todaySpend = 0;
    let thisWeekSpend = 0;
    let thisMonthSpend = 0;
    const startOfWeekDate = new Date(userLocalDate.getFullYear(), userLocalDate.getMonth(), userLocalDate.getDate() - userLocalDate.getDay());

    for (const entry of userSpends) {
      try {
        const entryParts = new Intl.DateTimeFormat('en-US', {
          timeZone: tzString,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        }).formatToParts(new Date(entry.date));
        const entryYear = parseInt(entryParts.find(p => p.type === 'year')?.value, 10);
        const entryMonth = parseInt(entryParts.find(p => p.type === 'month')?.value, 10) - 1;
        const entryDay = parseInt(entryParts.find(p => p.type === 'day')?.value, 10);
        
        const entryLocalDate = new Date(entryYear, entryMonth, entryDay, 0, 0, 0);
        const entryLocalDateStr = `${entryYear}-${entryMonth + 1}-${entryDay}`;

        if (entryLocalDateStr === userLocalDateStr) {
          todaySpend += parseFloat(entry.amount);
        }
        if (entryLocalDate >= startOfWeekDate) {
          thisWeekSpend += parseFloat(entry.amount);
        }
        if (entryYear === userLocalDate.getFullYear() && entryMonth === userLocalDate.getMonth()) {
          thisMonthSpend += parseFloat(entry.amount);
        }
      } catch (e) {}
    }

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
      '{{today_spend}}': formatVal(todaySpend),
      '{{this_week_spend}}': formatVal(thisWeekSpend),
      '{{this_month_spend}}': formatVal(thisMonthSpend),
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
