import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCycleRange, getLogicalCyclePeriod } from '@/lib/cycle';

export async function GET(req) {
  try {
    // 1. Verify CRON_SECRET from query parameters
    const url = new URL(req.url);
    const secretQuery = url.searchParams.get('CRON_SECRET');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (secretQuery !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Fetch all active users from database (no oneSignalSubId filters as requested)
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        dailyReminderTime: true,
        dailySpendReminderTime: true,
        timezone: true,
        currency: true,
        salaryCycleDate: true,
        notifDaily: true,
        notifDailySpend: true,
        notifSalary: true,
        notifCycle: true,
        lastDailyReminderSentAt: true,
        lastDailySpendReminderSentAt: true,
        lastSalaryReminderSentAt: true,
        lastCycleReminderSentAt: true
      }
    });

    const now = new Date();
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    const oneSignalAppId = "722dd7e4-705a-4a0e-a0b8-b4e2a3c93057";

    const report = {
      processedCount: users.length,
      dispatches: [],
      errors: []
    };

    // Helper to send OneSignal push notification using Firebase UID as external_id
    const sendPush = async (userId, title, body) => {
      if (!restApiKey) {
        console.warn("[Cron Engine] ONESIGNAL_REST_API_KEY is not defined.");
        return { success: false, reason: 'ONESIGNAL_REST_API_KEY not configured' };
      }

      const payload = {
        app_id: oneSignalAppId,
        headings: { en: title },
        contents: { en: body },
        target_channel: "push",
        include_aliases: {
          external_id: [userId]
        }
      };

      try {
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
          return { success: true, respData };
        } else {
          const errText = await response.text();
          return { success: false, reason: `OneSignal rejected: ${errText}` };
        }
      } catch (err) {
        return { success: false, reason: err.message };
      }
    };

    // 3. Process each user timezone-aware
    for (const user of users) {
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
        console.error(`[Cron Engine] Invalid timezone '${tzString}' for user ${user.id}, fallback to UTC.`);
        localYear = now.getUTCFullYear();
        localMonth = now.getUTCMonth();
        localDay = now.getUTCDate();
        localHour = now.getUTCHours();
        localMinute = now.getUTCMinutes();
      }

      const userLocalDate = new Date(localYear, localMonth, localDay, localHour, localMinute, 0);
      const userLocalTimeStr = `${localHour.toString().padStart(2, '0')}:${localMinute.toString().padStart(2, '0')}`;
      const userLocalDateStr = `${localYear}-${localMonth + 1}-${localDay}`;
      const currentMonthYearStr = `${localMonth + 1}-${localYear}`;

      // ==========================================
      // TRIGGER 1: DAILY SPEND REMINDER
      // ==========================================
      if (user.notifDaily !== false) {
        const targetTime = user.dailyReminderTime || '23:00';
        const [targetHour, targetMinute] = targetTime.split(':').map(Number);

        const localTotalMinutes = localHour * 60 + localMinute;
        const targetTotalMinutes = targetHour * 60 + targetMinute;

        // Check if we already sent daily reminder today in local timezone
        let lastDailySentStr = null;
        if (user.lastDailyReminderSentAt) {
          try {
            const sentParts = new Intl.DateTimeFormat('en-US', {
              timeZone: tzString,
              year: 'numeric',
              month: 'numeric',
              day: 'numeric'
            }).formatToParts(new Date(user.lastDailyReminderSentAt));
            const sentYear = sentParts.find(p => p.type === 'year')?.value;
            const sentMonth = sentParts.find(p => p.type === 'month')?.value;
            const sentDay = sentParts.find(p => p.type === 'day')?.value;
            lastDailySentStr = `${sentYear}-${sentMonth}-${sentDay}`;
          } catch (e) { }
        }

        const alreadySentDailyToday = (lastDailySentStr === userLocalDateStr);

        if (localTotalMinutes >= targetTotalMinutes && !alreadySentDailyToday) {
          const title = "Daily Spend Reminder 🔔";
          const body = `Hey ${user.name || 'there'}! How did you spend your money today? Log your transactions now to keep your passbook accurate!`;

          // Optimistically update database checkpoint first to prevent concurrent cron triggers!
          await db.user.update({
            where: { id: user.id },
            data: { lastDailyReminderSentAt: now }
          });

          const pushResult = await sendPush(user.id, title, body);
          if (pushResult.success) {
            report.dispatches.push({
              userId: user.id,
              type: 'DAILY_SPEND_REMINDER',
              localTime: userLocalTimeStr,
              targetTime
            });
          } else {
            // Rollback optimistic update if push failed
            await db.user.update({
              where: { id: user.id },
              data: { lastDailyReminderSentAt: null }
            });
            report.errors.push({ userId: user.id, type: 'DAILY_SPEND_REMINDER', error: pushResult.reason });
          }
        }
      }

      // ==========================================
      // TRIGGER 4: DAILY SPENDING SUMMARY
      // ==========================================
      if (user.notifDailySpend !== false) {
        const targetTime = user.dailySpendReminderTime || '22:00';
        const [targetHour, targetMinute] = targetTime.split(':').map(Number);

        const localTotalMinutes = localHour * 60 + localMinute;
        const targetTotalMinutes = targetHour * 60 + targetMinute;

        // Check if we already sent daily spend summary today in local timezone
        let lastDailySpendSentStr = null;
        if (user.lastDailySpendReminderSentAt) {
          try {
            const sentParts = new Intl.DateTimeFormat('en-US', {
              timeZone: tzString,
              year: 'numeric',
              month: 'numeric',
              day: 'numeric'
            }).formatToParts(new Date(user.lastDailySpendReminderSentAt));
            const sentYear = sentParts.find(p => p.type === 'year')?.value;
            const sentMonth = sentParts.find(p => p.type === 'month')?.value;
            const sentDay = sentParts.find(p => p.type === 'day')?.value;
            lastDailySpendSentStr = `${sentYear}-${sentMonth}-${sentDay}`;
          } catch (e) { }
        }

        const alreadySentDailySpendToday = (lastDailySpendSentStr === userLocalDateStr);

        if (localTotalMinutes >= targetTotalMinutes && !alreadySentDailySpendToday) {
          // Calculate the spending amount for the user on this local day!
          const startRange = new Date(now.getTime() - 48 * 60 * 60 * 1000);
          const entries = await db.financialEntry.findMany({
            where: {
              userId: user.id,
              type: 'SPENDING',
              date: {
                gte: startRange
              }
            }
          });

          // Filter entries to only include those that fall on this local day
          let totalSpent = 0;
          for (const entry of entries) {
            try {
              const entryParts = new Intl.DateTimeFormat('en-US', {
                timeZone: tzString,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
              }).formatToParts(new Date(entry.date));
              const entryYear = entryParts.find(p => p.type === 'year')?.value;
              const entryMonth = entryParts.find(p => p.type === 'month')?.value;
              const entryDay = entryParts.find(p => p.type === 'day')?.value;
              const entryLocalDateStr = `${entryYear}-${entryMonth}-${entryDay}`;

              if (entryLocalDateStr === userLocalDateStr) {
                totalSpent += parseFloat(entry.amount);
              }
            } catch (e) { }
          }

          // Format pretty date string (e.g. 23 May 2026)
          let prettyDateStr = '';
          try {
            const prettyParts = new Intl.DateTimeFormat('en-US', {
              timeZone: tzString,
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).formatToParts(now);
            const prettyDay = prettyParts.find(p => p.type === 'day')?.value;
            const prettyMonth = prettyParts.find(p => p.type === 'month')?.value;
            const prettyYear = prettyParts.find(p => p.type === 'year')?.value;
            prettyDateStr = `${prettyDay} ${prettyMonth} ${prettyYear}`;
          } catch (e) {
            prettyDateStr = userLocalDateStr;
          }

          const currencySuffix = user.currency === 'INR' ? 'rs' : (user.currency || 'USD');
          const title = "Daily Spending Summary 💰";
          const body = `On ${prettyDateStr} you spent ${totalSpent} ${currencySuffix}`;

          // Optimistically update database checkpoint first to prevent concurrent cron triggers!
          await db.user.update({
            where: { id: user.id },
            data: { lastDailySpendReminderSentAt: now }
          });

          const pushResult = await sendPush(user.id, title, body);
          if (pushResult.success) {
            report.dispatches.push({
              userId: user.id,
              type: 'DAILY_SPEND_SUMMARY',
              localTime: userLocalTimeStr,
              targetTime,
              totalSpent,
              message: body
            });
          } else {
            // Rollback optimistic update if push failed
            await db.user.update({
              where: { id: user.id },
              data: { lastDailySpendReminderSentAt: null }
            });
            report.errors.push({ userId: user.id, type: 'DAILY_SPEND_SUMMARY', error: pushResult.reason });
          }
        }
      }

      // ==========================================
      // TRIGGER 2: SALARY FOLLOW-UP CELEBRATION
      // ==========================================
      if (user.notifSalary !== false) {
        // Query the latest Salary entry for this user
        const latestSalary = await db.salary.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' }
        });

        if (latestSalary) {
          const salaryAgeMs = now.getTime() - new Date(latestSalary.createdAt).getTime();
          const salaryAgeHours = salaryAgeMs / (1000 * 60 * 60);

          // Salary added after a day (24-72 hours ago)
          const isSalaryAddedAfterADay = salaryAgeHours >= 24 && salaryAgeHours <= 72;

          // Has a reminder been sent for this salary?
          const alreadySentSalaryReminder = user.lastSalaryReminderSentAt &&
            new Date(user.lastSalaryReminderSentAt).getTime() >= new Date(latestSalary.createdAt).getTime();

          if (isSalaryAddedAfterADay && !alreadySentSalaryReminder) {
            const title = "Salary Follow-up 💰";
            const body = `Hey ${user.name || 'there'}! You added your salary yesterday. What are you doing with your money? Let's check with Gemini AI or budget it!`;

            // Optimistically update database checkpoint first to prevent concurrent cron triggers!
            await db.user.update({
              where: { id: user.id },
              data: { lastSalaryReminderSentAt: now }
            });

            const pushResult = await sendPush(user.id, title, body);
            if (pushResult.success) {
              report.dispatches.push({
                userId: user.id,
                type: 'SALARY_CELEBRATION_FOLLOWUP',
                salaryCreatedAt: latestSalary.createdAt
              });
            } else {
              // Rollback optimistic update if push failed
              await db.user.update({
                where: { id: user.id },
                data: { lastSalaryReminderSentAt: null }
              });
              report.errors.push({ userId: user.id, type: 'SALARY_CELEBRATION_FOLLOWUP', error: pushResult.reason });
            }
          }
        }
      }

      // ==========================================
      // TRIGGER 3: END-OF-CYCLE BUDGET REVIEW
      // ==========================================
      if (user.notifCycle !== false && user.salaryCycleDate) {
        // Get tomorrow local day
        const tomorrow = new Date(localYear, localMonth, localDay + 1);
        const tomorrowDay = tomorrow.getDate();

        // Tomorrow is cycle date means today is the final day of the cycle boundary
        const isCycleEndToday = (tomorrowDay === user.salaryCycleDate);

        // Check if cycle end reminder already dispatched this cycle period
        let lastCycleSentMonthYear = null;
        if (user.lastCycleReminderSentAt) {
          try {
            const cycleParts = new Intl.DateTimeFormat('en-US', {
              timeZone: tzString,
              year: 'numeric',
              month: 'numeric'
            }).formatToParts(new Date(user.lastCycleReminderSentAt));
            const sentYear = cycleParts.find(p => p.type === 'year')?.value;
            const sentMonth = cycleParts.find(p => p.type === 'month')?.value;
            lastCycleSentMonthYear = `${sentMonth}-${sentYear}`;
          } catch (e) { }
        }

        const alreadySentCycleThisMonth = (lastCycleSentMonthYear === currentMonthYearStr);

        if (isCycleEndToday && !alreadySentCycleThisMonth) {
          // Calculate budget spent vs remaining balance
          try {
            const { startDate, endDate } = getCycleRange(userLocalDate, user.salaryCycleDate);

            // Period spending (SPENDING entries in cycle range)
            const periodEntries = await db.financialEntry.findMany({
              where: {
                userId: user.id,
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            });

            let periodSpending = 0;
            periodEntries.forEach(e => {
              if (e.type === 'SPENDING') periodSpending += parseFloat(e.amount);
            });

            // Period salaries & deductions to compute salaryBalance
            const startPeriod = getLogicalCyclePeriod(startDate, user.salaryCycleDate);
            const endPeriod = getLogicalCyclePeriod(endDate, user.salaryCycleDate);

            let periodSalaries = [];
            if (startPeriod.year === endPeriod.year) {
              periodSalaries = await db.salary.findMany({
                where: {
                  userId: user.id,
                  year: startPeriod.year,
                  month: {
                    gte: startPeriod.month,
                    lte: endPeriod.month,
                  },
                },
              });
            } else {
              periodSalaries = await db.salary.findMany({
                where: {
                  userId: user.id,
                  OR: [
                    { year: startPeriod.year, month: { gte: startPeriod.month } },
                    { year: endPeriod.year, month: { lte: endPeriod.month } },
                    { year: { gt: startPeriod.year, lt: endPeriod.year } },
                  ],
                },
              });
            }

            let periodSalaryTotal = 0;
            periodSalaries.forEach(s => periodSalaryTotal += parseFloat(s.amount));

            let periodDeductions = 0;
            if (periodSalaries.length > 0) {
              const deductionsQuery = await db.financialEntry.findMany({
                where: {
                  userId: user.id,
                  useSalaryBalance: true,
                  OR: periodSalaries.map(s => ({
                    salaryMonth: s.month,
                    salaryYear: s.year,
                  })),
                },
              });
              deductionsQuery.forEach(d => periodDeductions += parseFloat(d.amount));
            }
            const periodSalaryBalance = periodSalaryTotal - periodDeductions;

            const symbol = user.currency === 'INR' ? '₹' : '$';
            const savedVal = Math.round(periodSalaryBalance);
            const spentVal = Math.round(periodSpending);

            const title = "MonthlyMoney Cycle Outlook 📊";
            const body = `📊 Cycle End Insight: You saved ${symbol}${savedVal} but spent ${symbol}${spentVal} this cycle. Check with Gemini AI for a quick audit!`;

            // Optimistically update database checkpoint first to prevent concurrent cron triggers!
            await db.user.update({
              where: { id: user.id },
              data: { lastCycleReminderSentAt: now }
            });

            const pushResult = await sendPush(user.id, title, body);
            if (pushResult.success) {
              report.dispatches.push({
                userId: user.id,
                type: 'CYCLE_END_OUTLOOK',
                saved: savedVal,
                spent: spentVal
              });
            } else {
              // Rollback optimistic update if push failed
              await db.user.update({
                where: { id: user.id },
                data: { lastCycleReminderSentAt: null }
              });
              report.errors.push({ userId: user.id, type: 'CYCLE_END_OUTLOOK', error: pushResult.reason });
            }
          } catch (statErr) {
            console.error(`[Cron Engine] Error computing cycle stats for user ${user.id}:`, statErr);
            report.errors.push({ userId: user.id, type: 'CYCLE_END_OUTLOOK', error: statErr.message });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('[Cron Engine] Critical Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
