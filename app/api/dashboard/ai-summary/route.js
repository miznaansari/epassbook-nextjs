import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getCycleRange, getLogicalCyclePeriod } from '@/lib/cycle';
import { categorizeTransaction } from '@/app/api/dashboard/route';

const apiKey = process.env.GEMINI_API_KEY || '';
const MAX_DAILY_REFRESHES = 5;

// Helper to compute user's today date string in YYYY-MM-DD
function getTodayDateString(timezone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

async function handleAiSummary(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
    } else {
      const { searchParams } = new URL(req.url);
      body = {
        filter: searchParams.get('filter') || 'current',
        forceRefresh: searchParams.get('forceRefresh') === 'true',
        userPrompt: searchParams.get('userPrompt') || ''
      };
    }

    const filter = body.filter || 'current';
    const forceRefresh = body.forceRefresh === true;
    const rawUserPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';
    const isReset = rawUserPrompt === 'RESET_TO_DEFAULT';
    const userPrompt = isReset ? '' : rawUserPrompt;
    const userId = user.id;
    const cycleDate = user.salaryCycleDate || 1;
    const userTimezone = user.timezone || 'UTC';
    const todayStr = getTodayDateString(userTimezone);
    const now = new Date();

    let startDate;
    let endDate;

    if (filter === 'current') {
      const range = getCycleRange(now, cycleDate);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filter === 'last') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const range = getCycleRange(prevMonthDate, cycleDate);
      startDate = range.startDate;
      endDate = range.endDate;
    } else {
      const range = getCycleRange(now, cycleDate);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const startPeriod = getLogicalCyclePeriod(startDate, cycleDate);
    const cycleMonth = startPeriod.month;
    const cycleYear = startPeriod.year;

    // Check DB for existing saved AI classification
    let savedRecord = null;
    try {
      savedRecord = await db.aiBudgetClassification.findUnique({
        where: {
          userId_filter_cycleMonth_cycleYear: {
            userId,
            filter,
            cycleMonth,
            cycleYear
          }
        }
      });
    } catch (dbErr) {
      console.warn('Could not read saved AiBudgetClassification:', dbErr.message);
    }

    // Calculate current daily refresh count & remaining quota
    const refreshCountToday = (savedRecord && savedRecord.lastRefreshedDate === todayStr)
      ? savedRecord.refreshCount
      : 0;
    const remainingRefreshes = Math.max(0, MAX_DAILY_REFRESHES - refreshCountToday);

    // If NOT force refreshing, and NO user prompt override, and we have cached data -> Return cached immediately!
    if (!forceRefresh && !userPrompt && savedRecord && savedRecord.summaryData) {
      try {
        const cachedIntelligence = JSON.parse(savedRecord.summaryData);
        return NextResponse.json({
          success: true,
          cached: true,
          remainingRefreshes,
          maxDailyRefreshes: MAX_DAILY_REFRESHES,
          lastRefreshedAt: savedRecord.updatedAt,
          customPromptNotes: savedRecord.customPromptNotes,
          intelligence: cachedIntelligence
        });
      } catch (parseErr) {
        console.warn('Corrupted cached AI summary JSON, regenerating...');
      }
    }

    // If user wants to refresh / re-classify, enforce daily 5-refresh cap!
    if ((forceRefresh || userPrompt) && remainingRefreshes <= 0) {
      return NextResponse.json({
        error: `Daily AI 50/30/20 refresh limit (${MAX_DAILY_REFRESHES}/${MAX_DAILY_REFRESHES}) reached for today. Your quota resets tomorrow.`,
        remainingRefreshes: 0,
        maxDailyRefreshes: MAX_DAILY_REFRESHES,
      }, { status: 429 });
    }

    // Query active cycle entries
    const periodEntries = await db.financialEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
    });

    const periodSalaries = await db.salary.findMany({
      where: { userId, month: cycleMonth, year: cycleYear },
    });
    const periodBonuses = await db.bonus.findMany({
      where: { userId, month: cycleMonth, year: cycleYear },
    });

    let salaryTotal = 0;
    periodSalaries.forEach(s => salaryTotal += parseFloat(s.amount));
    periodBonuses.forEach(b => salaryTotal += parseFloat(b.amount));

    let spendingTotal = 0;
    let savingsTotal = 0;
    let lendingTotal = 0;
    const categoryBreakdown = {};

    periodEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      const cat = categorizeTransaction(e.title, e.description, e.type);
      if (e.type === 'SPENDING') {
        spendingTotal += amt;
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;
      } else if (e.type === 'SAVINGS') {
        savingsTotal += amt;
      } else if (e.type === 'LENDING') {
        lendingTotal += amt;
      }
    });

    const currentBalance = Math.max(0, salaryTotal - spendingTotal - savingsTotal);
    const currency = user.currency || 'USD';
    const totalCycleDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(1, Math.min(totalCycleDays, Math.round((now - startDate) / (1000 * 60 * 60 * 24))));
    const daysRemaining = Math.max(0, totalCycleDays - daysElapsed);
    const dailyBurnRate = Math.round((spendingTotal / daysElapsed) * 100) / 100;
    const safeDailyBudget = daysRemaining > 0 ? Math.round((currentBalance / daysRemaining) * 100) / 100 : 0;
    const incomeBase = salaryTotal > 0 ? salaryTotal : (spendingTotal + savingsTotal) || 1;

    // Build exhaustive list of all transactions to classify
    const allTransactionsList = periodEntries.map(e => ({
      id: e.id,
      title: e.title,
      amount: parseFloat(e.amount),
      type: e.type,
      date: new Date(e.date).toISOString().split('T')[0],
      description: e.description || '',
    }));

    const financialContext = {
      currency,
      incomeBaseline: incomeBase,
      cycleDays: { total: totalCycleDays, elapsed: daysElapsed, remaining: daysRemaining },
      inflow: { salaryAndBonus: salaryTotal },
      outflow: { totalSpending: spendingTotal, totalSavings: savingsTotal, totalLending: lendingTotal },
      activeBalance: currentBalance,
      burnRate: { dailyAverage: dailyBurnRate, safeDailyAllowance: safeDailyBudget },
      transactionsCount: allTransactionsList.length,
      transactions: allTransactionsList
    };

    let generatedIntelligence = null;
    let modelUsed = 'none';

    // Dispatch to Gemini Generative AI
    if (apiKey) {
      const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.1-flash-lite'];
      const ai = new GoogleGenerativeAI(apiKey);

      for (const candidate of candidateModels) {
        try {
          const model = ai.getGenerativeModel({
            model: candidate,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.15,
            }
          });

          const prompt = `You are the Gemini 2050 Autonomous Financial Intelligence & 50/30/20 Budgeting Engine for Passbook.
Your job is to strictly classify ALL transactions into the 50/30/20 Budget Framework:
1. NEEDS (50% Target): Essential non-negotiable living costs (Rent, Home Utilities, Groceries, Medicine/Doctor, Essential Commute/Fuel, Tuition/Education).
2. WANTS (30% Target): Discretionary lifestyle and comfort (Dining out, Cafe, Shopping, Clothes, Electronics, Entertainment, Movies, Subscriptions, Leisure).
3. SAVINGS (20% Target): Wealth building and capital allocation (SIPs, Mutual Funds, Stocks, Gold, Emergency Pot deposits, Debt payoffs).

${userPrompt ? `CRITICAL USER OVERRIDE INSTRUCTIONS (MANDATORY TO APPLY):
"${userPrompt}"
Strictly incorporate and respect all the user's specific classification overrides above!
` : ''}

FINANCIAL DATA CONTEXT:
${JSON.stringify(financialContext, null, 2)}

REQUIRED JSON OUTPUT FORMAT (Strict JSON only, no markdown wrapping):
{
  "executiveSummary": "2 to 3 crisp, insightful sentences assessing spending velocity, largest clusters, and savings discipline.",
  "financialHealthScore": 88,
  "healthGrade": "A+",
  "healthStatus": "Hyper-Optimal",
  "needsWantsSavingsAI": {
    "needs": {
      "amount": 0.00,
      "percentage": 0,
      "status": "Optimal",
      "advice": "Concise advice for essential needs.",
      "items": [
        { "id": 1, "title": "Rent", "amount": 300.00, "date": "2026-09-01", "category": "Housing & Utilities", "reason": "Essential accommodation need" }
      ]
    },
    "wants": {
      "amount": 0.00,
      "percentage": 0,
      "status": "Optimal",
      "advice": "Concise advice for discretionary spending.",
      "items": [
        { "id": 2, "title": "Dinner Out", "amount": 45.00, "date": "2026-09-12", "category": "Food & Dining", "reason": "Discretionary restaurant order" }
      ]
    },
    "savings": {
      "amount": 0.00,
      "percentage": 0,
      "status": "Supercharged",
      "advice": "Concise advice for wealth building.",
      "items": [
        { "id": 3, "title": "SIP Index Fund", "amount": 200.00, "date": "2026-09-05", "category": "Investments & Savings", "reason": "Compounding equity wealth" }
      ]
    },
    "aiVerdict": "Concise 1-2 sentence overall guidance on keeping the 50/30/20 balance optimal."
  },
  "burnRateAnalysis": {
    "dailyAverageSpend": ${dailyBurnRate},
    "dailySafeBudget": ${safeDailyBudget},
    "burnStatus": "${dailyBurnRate > safeDailyBudget ? 'High' : 'Safe'}",
    "burnCommentary": "Short observation on daily burn velocity."
  },
  "smartCategories": [
    {
      "category": "Food & Dining",
      "spent": 0.00,
      "idealBudget": 0.00,
      "status": "Within Budget",
      "advice": "Advice for this category."
    }
  ],
  "spendingAnomalies": [
    {
      "title": "Large expense spike",
      "amount": 0.00,
      "date": "2026-09-14",
      "reason": "Sudden deviation from median weekday spending",
      "severity": "LOW"
    }
  ],
  "savingsOpportunities": [
    {
      "title": "Automated Micro-SIP Allocation",
      "potentialMonthlySavings": 0,
      "impact": "HIGH",
      "description": "Channel 10% of liquid salary balance into index SIPs.",
      "actionableStep": "Create an automatic recurring SIP pot in Passbook."
    }
  ],
  "projectedRunway": {
    "daysRemainingInCycle": ${daysRemaining},
    "projectedEndOfCycleBalance": ${Math.max(0, currentBalance - (dailyBurnRate * daysRemaining))},
    "willRunOutOfMoney": ${currentBalance < (dailyBurnRate * daysRemaining)},
    "runwayConfidence": "High"
  },
  "predictiveAdvice2050": "A futuristic personal wealth acceleration tip."
}

Ensure all transactions from the context are accounted for in either needs, wants, or savings. Sums and percentages must be mathematically accurate.`;

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          generatedIntelligence = JSON.parse(responseText);
          modelUsed = candidate;
          break;
        } catch (modelErr) {
          console.warn(`Gemini model ${candidate} failed:`, modelErr?.message || modelErr);
        }
      }
    }

    // If Gemini failed or no API key, return structured error requiring AI
    if (!generatedIntelligence) {
      if (!savedRecord) {
        return NextResponse.json({
          error: 'AI Intelligence engine is temporarily unavailable. Please verify your GEMINI_API_KEY in backend.',
        }, { status: 503 });
      }
      // Return previously saved record if available
      return NextResponse.json({
        success: true,
        cached: true,
        remainingRefreshes,
        maxDailyRefreshes: MAX_DAILY_REFRESHES,
        lastRefreshedAt: savedRecord.updatedAt,
        intelligence: JSON.parse(savedRecord.summaryData)
      });
    }

    // Compute new daily refresh count
    const updatedDailyCount = (savedRecord && savedRecord.lastRefreshedDate === todayStr)
      ? savedRecord.refreshCount + 1
      : 1;

    // Persist AI response to DB
    try {
      await db.aiBudgetClassification.upsert({
        where: {
          userId_filter_cycleMonth_cycleYear: {
            userId,
            filter,
            cycleMonth,
            cycleYear
          }
        },
        create: {
          userId,
          filter,
          cycleMonth,
          cycleYear,
          summaryData: JSON.stringify(generatedIntelligence),
          customPromptNotes: isReset ? null : (userPrompt || savedRecord?.customPromptNotes || null),
          refreshCount: updatedDailyCount,
          lastRefreshedDate: todayStr
        },
        update: {
          summaryData: JSON.stringify(generatedIntelligence),
          customPromptNotes: isReset ? null : (userPrompt ? userPrompt : savedRecord?.customPromptNotes),
          refreshCount: updatedDailyCount,
          lastRefreshedDate: todayStr
        }
      });
    } catch (saveErr) {
      console.warn('Could not save AiBudgetClassification to DB:', saveErr.message);
    }

    const newRemaining = Math.max(0, MAX_DAILY_REFRESHES - updatedDailyCount);
    const finalPromptNotes = isReset ? null : (userPrompt || savedRecord?.customPromptNotes || null);

    return NextResponse.json({
      success: true,
      cached: false,
      modelUsed,
      remainingRefreshes: newRemaining,
      maxDailyRefreshes: MAX_DAILY_REFRESHES,
      lastRefreshedAt: new Date().toISOString(),
      customPromptNotes: finalPromptNotes,
      intelligence: generatedIntelligence
    });

  } catch (error) {
    console.error('Error in /api/dashboard/ai-summary:', error);
    return NextResponse.json({ error: 'Failed to process AI 50/30/20 summary.' }, { status: 500 });
  }
}

export async function GET(req) {
  return handleAiSummary(req);
}

export async function POST(req) {
  return handleAiSummary(req);
}
