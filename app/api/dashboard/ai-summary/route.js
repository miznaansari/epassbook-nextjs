import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';
import { getCycleRange, getLogicalCyclePeriod } from '@/lib/cycle';
import { categorizeTransaction } from '@/app/api/dashboard/route';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const filter = body.filter || 'current';
    const userId = user.id;
    const cycleDate = user.salaryCycleDate || 1;
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

    // Query active cycle data
    const periodEntries = await db.financialEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
    });

    const startPeriod = getLogicalCyclePeriod(startDate, cycleDate);
    const periodSalaries = await db.salary.findMany({
      where: { userId, month: startPeriod.month, year: startPeriod.year },
    });
    const periodBonuses = await db.bonus.findMany({
      where: { userId, month: startPeriod.month, year: startPeriod.year },
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

    const allTransactionsList = periodEntries.map(e => ({
      id: e.id,
      title: e.title,
      amount: parseFloat(e.amount),
      type: e.type,
      date: new Date(e.date).toISOString().split('T')[0],
      description: e.description || '',
      category: categorizeTransaction(e.title, e.description, e.type)
    }));

    // Prepared context summary for Gemini
    const financialContext = {
      currency,
      cycleDays: { total: totalCycleDays, elapsed: daysElapsed, remaining: daysRemaining },
      inflow: { salaryAndBonus: salaryTotal },
      outflow: { totalSpending: spendingTotal, totalSavings: savingsTotal, totalLending: lendingTotal },
      activeBalance: currentBalance,
      burnRate: { dailyAverage: dailyBurnRate, safeDailyAllowance: safeDailyBudget },
      categories: categoryBreakdown,
      transactions: allTransactionsList.slice(0, 30)
    };

    // If API key is present, try Gemini models
    if (apiKey) {
      const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.1-flash-lite'];
      const ai = new GoogleGenerativeAI(apiKey);

      for (const modelName of candidateModels) {
        try {
          const model = ai.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            }
          });

          const prompt = `You are the Gemini 2050 Autonomous Financial Intelligence Engine for Passbook.
Analyze the user's current salary cycle transactions, classify every item into the 50/30/20 Budget Discipline (Needs 50%, Wants 30%, Savings 20%), and return a rich structured JSON response.

FINANCIAL CONTEXT:
${JSON.stringify(financialContext, null, 2)}

REQUIRED JSON OUTPUT FORMAT:
{
  "executiveSummary": "2 to 3 crisp, highly insightful sentences assessing spending velocity, largest expense clusters, and savings discipline.",
  "financialHealthScore": 88, // integer from 0 to 100
  "healthGrade": "A+", // "A+", "A", "B", "C", or "D"
  "healthStatus": "Hyper-Optimal", // "Hyper-Optimal", "Disciplined", "Balanced", "Cautionary", "Critical Burn"
  "needsWantsSavingsAI": {
    "needs": {
      "amount": 450.00,
      "percentage": 45, // percentage of total income
      "status": "Optimal", // "Optimal", "Over Target", "Under Target"
      "advice": "Essential expenses like rent and groceries are well under 50%.",
      "items": [
        { "title": "Rent", "amount": 300.00, "category": "Housing & Utilities", "reason": "Essential accommodation need" }
      ]
    },
    "wants": {
      "amount": 250.00,
      "percentage": 25, // percentage of total income
      "status": "Optimal", // "Optimal", "Over Target", "Caution"
      "advice": "Dining and leisure spending are in safe balance.",
      "items": [
        { "title": "Dinner Out", "amount": 45.00, "category": "Food & Dining", "reason": "Discretionary restaurant order" }
      ]
    },
    "savings": {
      "amount": 300.00,
      "percentage": 30, // percentage of total income
      "status": "Supercharged", // "Supercharged", "On Track", "Needs Boost"
      "advice": "Excellent! You are allocating more than the 20% minimum target.",
      "items": [
        { "title": "SIP Index Fund", "amount": 200.00, "category": "Investments & Savings", "reason": "Compounding equity wealth" }
      ]
    },
    "aiVerdict": "Concise 1-2 sentence overall guidance on keeping the 50/30/20 balance optimal."
  },
  "burnRateAnalysis": {
    "dailyAverageSpend": ${dailyBurnRate},
    "dailySafeBudget": ${safeDailyBudget},
    "burnStatus": "Safe",
    "burnCommentary": "Short observation on daily burn velocity."
  },
  "smartCategories": [
    {
      "category": "Food & Dining",
      "spent": 120.50,
      "idealBudget": 150.00,
      "status": "Within Budget",
      "advice": "Short advice for this category."
    }
  ],
  "spendingAnomalies": [
    {
      "title": "Dining out spike",
      "amount": 45.00,
      "date": "2026-09-14",
      "reason": "Sudden deviation from median weekday spending",
      "severity": "LOW"
    }
  ],
  "savingsOpportunities": [
    {
      "title": "Subscription Pruning",
      "potentialMonthlySavings": 35.00,
      "impact": "HIGH",
      "description": "Consolidate unused digital subscriptions.",
      "actionableStep": "Audit recurring cloud / streaming renewals."
    }
  ],
  "projectedRunway": {
    "daysRemainingInCycle": ${daysRemaining},
    "projectedEndOfCycleBalance": ${Math.max(0, currentBalance - (dailyBurnRate * daysRemaining))},
    "willRunOutOfMoney": ${currentBalance < (dailyBurnRate * daysRemaining)},
    "runwayConfidence": "High"
  },
  "predictiveAdvice2050": "A futuristic personal wealth acceleration tip for 2050."
}

Ensure all numbers are mathematically accurate and aligned with the provided context. Only return valid JSON.`;

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          const parsed = JSON.parse(responseText);

          return NextResponse.json({
            success: true,
            modelUsed: modelName,
            generatedAt: new Date().toISOString(),
            intelligence: parsed
          });
        } catch (modelErr) {
          console.warn(`Gemini model ${modelName} failed, trying fallback...`, modelErr?.message || modelErr);
        }
      }
    }

    // Heuristic algorithmic fallback if API key fails or rate limits
    const incomeBase = salaryTotal > 0 ? salaryTotal : (spendingTotal + savingsTotal) || 1;
    let needsSum = 0;
    let wantsSum = 0;
    const needsItems = [];
    const wantsItems = [];
    const savingsItems = [];

    periodEntries.forEach(e => {
      const amt = parseFloat(e.amount);
      const cat = categorizeTransaction(e.title, e.description, e.type);
      if (e.type === 'SAVINGS') {
        savingsItems.push({ title: e.title, amount: amt, category: cat, reason: 'Invested in savings' });
      } else if (['Housing & Utilities', 'Health & Wellness', 'Education & Learning'].includes(cat) || /(groceries|grocery|rent|electricity|water|wifi|medical|medicine)/i.test(e.title)) {
        needsSum += amt;
        needsItems.push({ title: e.title, amount: amt, category: cat, reason: 'Essential living requirement' });
      } else {
        wantsSum += amt;
        wantsItems.push({ title: e.title, amount: amt, category: cat, reason: 'Discretionary lifestyle spend' });
      }
    });

    const needsPct = Math.round((needsSum / incomeBase) * 100);
    const wantsPct = Math.round((wantsSum / incomeBase) * 100);
    const savingsPct = Math.round((savingsTotal / incomeBase) * 100);

    const healthScore = Math.max(20, Math.min(98, Math.round(
      (salaryTotal > 0 ? (currentBalance / salaryTotal) * 60 : 50) +
      (savingsTotal > 0 ? 25 : 5) -
      (dailyBurnRate > safeDailyBudget ? 15 : 0)
    )));

    const fallbackJson = {
      executiveSummary: spendingTotal > 0 
        ? `You have expended ${currency} ${spendingTotal.toLocaleString()} out of ${currency} ${salaryTotal.toLocaleString()} available. Your liquid reserve is steady with an estimated burn rate of ${currency} ${dailyBurnRate}/day.`
        : `No significant outflow logged this cycle. Your salary capital of ${currency} ${salaryTotal.toLocaleString()} is fully intact and primed for strategic savings.`,
      financialHealthScore: healthScore,
      healthGrade: healthScore >= 90 ? 'A+' : healthScore >= 80 ? 'A' : healthScore >= 70 ? 'B' : 'C',
      healthStatus: healthScore >= 85 ? 'Hyper-Optimal' : healthScore >= 75 ? 'Disciplined' : 'Balanced',
      needsWantsSavingsAI: {
        needs: {
          amount: needsSum,
          percentage: needsPct,
          status: needsPct <= 50 ? 'Optimal' : 'Over Target',
          advice: needsPct <= 50 ? 'Needs are well controlled under 50% target.' : 'Essential needs exceed 50% of your income baseline.',
          items: needsItems.slice(0, 10)
        },
        wants: {
          amount: wantsSum,
          percentage: wantsPct,
          status: wantsPct <= 30 ? 'Optimal' : 'Caution',
          advice: wantsPct <= 30 ? 'Discretionary lifestyle spending is safely under 30%.' : 'Wants spending is higher than recommended 30%.',
          items: wantsItems.slice(0, 10)
        },
        savings: {
          amount: savingsTotal,
          percentage: savingsPct,
          status: savingsPct >= 20 ? 'Supercharged' : 'Needs Boost',
          advice: savingsPct >= 20 ? 'Excellent wealth building! Over 20% saved.' : 'Aim to channel at least 20% into investments.',
          items: savingsItems.slice(0, 10)
        },
        aiVerdict: `Your current distribution is ${needsPct}% Needs / ${wantsPct}% Wants / ${savingsPct}% Savings.`
      },
      burnRateAnalysis: {
        dailyAverageSpend: dailyBurnRate,
        dailySafeBudget: safeDailyBudget,
        burnStatus: dailyBurnRate > safeDailyBudget * 1.2 ? 'High' : 'Safe',
        burnCommentary: dailyBurnRate <= safeDailyBudget ? 'Spending is well within safe velocity limits.' : 'Daily spending slightly outpaces optimal run rate.'
      },
      smartCategories: Object.entries(categoryBreakdown).map(([cat, amt]) => ({
        category: cat,
        spent: amt,
        idealBudget: Math.round(amt * 0.9),
        status: amt > (salaryTotal * 0.3) ? 'Over Budget' : 'Within Budget',
        advice: `Keep ${cat} allocations monitored towards the cycle close.`
      })),
      spendingAnomalies: periodEntries.slice(0, 2).filter(e => parseFloat(e.amount) > (spendingTotal * 0.35)).map(e => ({
        title: e.title,
        amount: parseFloat(e.amount),
        date: new Date(e.date).toISOString().split('T')[0],
        reason: 'Large single outflow relative to total cycle expenses',
        severity: 'MEDIUM'
      })),
      savingsOpportunities: [
        {
          title: 'Automated Micro-SIP Allocation',
          potentialMonthlySavings: Math.round(salaryTotal * 0.1),
          impact: 'HIGH',
          description: 'Channel 10% of liquid salary balance into index SIPs at cycle start.',
          actionableStep: 'Create an automatic recurring SIP pot in Passbook.'
        }
      ],
      projectedRunway: {
        daysRemainingInCycle: daysRemaining,
        projectedEndOfCycleBalance: Math.max(0, Math.round(currentBalance - (dailyBurnRate * daysRemaining))),
        willRunOutOfMoney: currentBalance < (dailyBurnRate * daysRemaining),
        runwayConfidence: 'High'
      },
      predictiveAdvice2050: 'Automate 20% savings before discretionary spending to guarantee compounding exponential runway.'
    };

    return NextResponse.json({
      success: true,
      modelUsed: 'heuristic-engine',
      generatedAt: new Date().toISOString(),
      intelligence: fallbackJson
    });

  } catch (error) {
    console.error('Error in /api/dashboard/ai-summary:', error);
    return NextResponse.json({ error: 'Failed to generate AI intelligence' }, { status: 500 });
  }
}
