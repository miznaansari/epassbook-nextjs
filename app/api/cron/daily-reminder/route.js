import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateStreaks } from '@/lib/streaks';

function getIstParts(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date(date));
  const getPartVal = (type) => parseInt(parts.find(p => p.type === type)?.value, 10);
  return {
    year: getPartVal('year'),
    month: getPartVal('month') - 1, // 0-indexed month
    day: getPartVal('day'),
    hour: getPartVal('hour'),
    minute: getPartVal('minute'),
    second: getPartVal('second')
  };
}

function getUtcDateFromIst(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  const utcMs = Date.UTC(year, month, day, hour, minute, second, millisecond);
  // Subtract 5.5 hours to convert IST to UTC
  return new Date(utcMs - (5.5 * 60 * 60 * 1000));
}

function getCycleRangeIst(dateRef, cycleDate = 1) {
  const { year, month, day } = getIstParts(dateRef);

  let startYear = year;
  let startMonth = month;

  if (day >= cycleDate) {
    startMonth = month;
  } else {
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  const startDate = getUtcDateFromIst(startYear, startMonth, cycleDate, 0, 0, 0, 0);

  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }

  const endDate = getUtcDateFromIst(endYear, endMonth, cycleDate - 1, 23, 59, 59, 999);

  return { startDate, endDate };
}

function getLogicalCyclePeriodIst(dateRef, cycleDate = 1) {
  const { year, month, day } = getIstParts(dateRef);

  if (day >= cycleDate) {
    return { month: month + 1, year };
  } else {
    let logicalMonth = month; // which is month - 1 + 1
    let logicalYear = year;
    if (logicalMonth === 0) {
      logicalMonth = 12;
      logicalYear = year - 1;
    }
    return { month: logicalMonth, year: logicalYear };
  }
}

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
        lastCycleReminderSentAt: true,
        notifStreakLevel1: true,
        notifStreakLevel2: true,
        streakLevel2Limit: true,
        lastStreakLevel1SentAt: true,
        lastStreakLevel2SentAt: true,
        createdAt: true
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
      const tzString = 'Asia/Kolkata';
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
            const { startDate, endDate } = getCycleRangeIst(userLocalDate, user.salaryCycleDate);

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
            const startPeriod = getLogicalCyclePeriodIst(startDate, user.salaryCycleDate);
            const endPeriod = getLogicalCyclePeriodIst(endDate, user.salaryCycleDate);

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

      // ==========================================
      // TRIGGER 5: STREAK LEVEL 1 & LEVEL 2 NOTIFICATIONS
      // ==========================================
      const localTotalMinutes = localHour * 60 + localMinute;
      const targetTimeStreak = user.dailySpendReminderTime || '22:00';
      const [targetHourStreak, targetMinuteStreak] = targetTimeStreak.split(':').map(Number);
      const targetTotalMinutesStreak = targetHourStreak * 60 + targetMinuteStreak;

      if (user.notifStreakLevel1 !== false) {
        let lastStreakL1SentStr = null;
        if (user.lastStreakLevel1SentAt) {
          try {
            const sentParts = new Intl.DateTimeFormat('en-US', {
              timeZone: tzString,
              year: 'numeric',
              month: 'numeric',
              day: 'numeric'
            }).formatToParts(new Date(user.lastStreakLevel1SentAt));
            const sentYear = sentParts.find(p => p.type === 'year')?.value;
            const sentMonth = sentParts.find(p => p.type === 'month')?.value;
            const sentDay = sentParts.find(p => p.type === 'day')?.value;
            lastStreakL1SentStr = `${sentYear}-${sentMonth}-${sentDay}`;
          } catch (e) { }
        }

        const alreadySentL1Today = (lastStreakL1SentStr === userLocalDateStr);

        if (localTotalMinutes >= targetTotalMinutesStreak && !alreadySentL1Today) {
          const { streakLevel1 } = await calculateStreaks(user.id);

          if (streakLevel1 >= 1) {
            const title = "Zero Spending Streak! 🔥";
            const body = `Awesome! You've logged 0 spending for ${streakLevel1} consecutive day${streakLevel1 > 1 ? 's' : ''}! Keep it up!`;

            await db.user.update({
              where: { id: user.id },
              data: {
                lastStreakLevel1SentAt: now,
                streakLevel1
              }
            });

            const pushResult = await sendPush(user.id, title, body);
            if (pushResult.success) {
              report.dispatches.push({
                userId: user.id,
                type: 'STREAK_LEVEL_1',
                streakLevel1,
                message: body
              });
            } else {
              await db.user.update({
                where: { id: user.id },
                data: { lastStreakLevel1SentAt: null }
              });
              report.errors.push({ userId: user.id, type: 'STREAK_LEVEL_1', error: pushResult.reason });
            }
          }
        }
      }

      if (user.notifStreakLevel2 !== false) {
        let lastStreakL2SentStr = null;
        if (user.lastStreakLevel2SentAt) {
          try {
            const sentParts = new Intl.DateTimeFormat('en-US', {
              timeZone: tzString,
              year: 'numeric',
              month: 'numeric',
              day: 'numeric'
            }).formatToParts(new Date(user.lastStreakLevel2SentAt));
            const sentYear = sentParts.find(p => p.type === 'year')?.value;
            const sentMonth = sentParts.find(p => p.type === 'month')?.value;
            const sentDay = sentParts.find(p => p.type === 'day')?.value;
            lastStreakL2SentStr = `${sentYear}-${sentMonth}-${sentDay}`;
          } catch (e) { }
        }

        const alreadySentL2Today = (lastStreakL2SentStr === userLocalDateStr);

        if (localTotalMinutes >= targetTotalMinutesStreak && !alreadySentL2Today) {
          const { streakLevel2, limit: currentLimit } = await calculateStreaks(user.id);

          if (streakLevel2 >= 1) {
            const currencySuffix = user.currency === 'INR' ? 'rs' : (user.currency || 'USD');
            const title = "Smart Spending Streak! ⚡";
            const body = `Great job! You've kept your spending under ${currentLimit} ${currencySuffix} for ${streakLevel2} consecutive day${streakLevel2 > 1 ? 's' : ''}!`;

            await db.user.update({
              where: { id: user.id },
              data: {
                lastStreakLevel2SentAt: now,
                streakLevel2
              }
            });

            const pushResult = await sendPush(user.id, title, body);
            if (pushResult.success) {
              report.dispatches.push({
                userId: user.id,
                type: 'STREAK_LEVEL_2',
                streakLevel2,
                message: body
              });
            } else {
              await db.user.update({
                where: { id: user.id },
                data: { lastStreakLevel2SentAt: null }
              });
              report.errors.push({ userId: user.id, type: 'STREAK_LEVEL_2', error: pushResult.reason });
            }
          }
        }
      }

      // ==========================================
      // TRIGGER 4: CUSTOM ONE SIGNAL CAMPAIGNS
      // ==========================================
      try {
        const campaigns = await db.notificationCampaign.findMany({
          where: {
            userId: user.id,
            isActive: true,
            isDeleted: false
          }
        });

        for (const campaign of campaigns) {
          // Check target time of day (HH:MM)
          const campaignTime = campaign.time || '12:00';
          const [targetHour, targetMinute] = campaignTime.split(':').map(Number);

          const localTotalMinutes = localHour * 60 + localMinute;
          const targetTotalMinutes = targetHour * 60 + targetMinute;

          // Only trigger if local time is at or after scheduled time
          if (localTotalMinutes < targetTotalMinutes) {
            continue;
          }

          let shouldSend = false;
          const lastSent = campaign.lastSentAt ? new Date(campaign.lastSentAt) : null;

          if (!lastSent) {
            shouldSend = true;
          } else {
            // Get lastSent date in user's timezone
            let lastSentDateStr = null;
            try {
              const sentParts = new Intl.DateTimeFormat('en-US', {
                timeZone: tzString,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
              }).formatToParts(lastSent);
              const sentYear = sentParts.find(p => p.type === 'year')?.value;
              const sentMonth = sentParts.find(p => p.type === 'month')?.value;
              const sentDay = sentParts.find(p => p.type === 'day')?.value;
              lastSentDateStr = `${sentYear}-${sentMonth}-${sentDay}`;
            } catch (e) { }

            // If already sent today, skip
            if (lastSentDateStr === userLocalDateStr) {
              shouldSend = false;
            } else {
              const diffTime = now.getTime() - lastSent.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);

              if (campaign.frequency === 'DAILY') {
                shouldSend = true;
              } else if (campaign.frequency === 'WEEKLY') {
                shouldSend = diffDays >= 6.8;
              } else if (campaign.frequency === 'MONTHLY') {
                shouldSend = diffDays >= 29.8;
              } else if (campaign.frequency === 'SIX_MONTHS') {
                shouldSend = diffDays >= 179.8;
              }
            }
          }

          if (shouldSend) {
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

            // Calculate current period logical dates in IST
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

            // Savings tracked in cycle range (IST boundary)
            const { startDate, endDate } = getCycleRangeIst(userLocalDate, user.salaryCycleDate || 1);
            const periodOutflows = userEntries.filter(e => {
              const d = new Date(e.date);
              return d >= startDate && d <= endDate && e.type === 'SAVINGS';
            });
            const generalSavingsAmt = periodOutflows.filter(e => !e.useSalaryBalance).reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const totalSavingsThisMonth = savingsDeductions + generalSavingsAmt;

            // Calculate spending variables timezone-aware in IST
            const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
            const userSpends = userEntries.filter(e => e.type === 'SPENDING' && new Date(e.date) >= fortyDaysAgo);

            let todaySpend = 0;
            let thisWeekSpend = 0;
            let thisMonthSpend = 0;

            // Day of week in IST (0 = Sunday, 1 = Monday, etc.)
            const currentDayOfWeek = new Date(Date.UTC(localYear, localMonth, localDay)).getUTCDay();
            const startOfWeekDateUtc = new Date(Date.UTC(localYear, localMonth, localDay) - currentDayOfWeek * 24 * 60 * 60 * 1000);

            for (const entry of userSpends) {
              try {
                const entryIstParts = getIstParts(entry.date);
                const entryDateUtc = new Date(Date.UTC(entryIstParts.year, entryIstParts.month, entryIstParts.day));

                if (entryIstParts.year === localYear && entryIstParts.month === localMonth && entryIstParts.day === localDay) {
                  todaySpend += parseFloat(entry.amount);
                }
                if (entryDateUtc.getTime() >= startOfWeekDateUtc.getTime()) {
                  thisWeekSpend += parseFloat(entry.amount);
                }
                if (entryIstParts.year === localYear && entryIstParts.month === localMonth) {
                  thisMonthSpend += parseFloat(entry.amount);
                }
              } catch (e) { }
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

            // Calculate streaks for replacements
            const { streakLevel1: campStreakL1, streakLevel2: campStreakL2 } = await calculateStreaks(user.id);

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
              '{{current_year}}': currentYearNum.toString(),
              '{{streak_level_1}}': String(campStreakL1),
              '{{streak_level_2}}': String(campStreakL2)
            };

            let replacedTitle = campaign.title;
            let replacedMessage = campaign.message;

            Object.entries(replacements).forEach(([key, val]) => {
              replacedTitle = replacedTitle.replaceAll(key, val);
              replacedMessage = replacedMessage.replaceAll(key, val);
            });

            // Send push
            const pushResult = await sendPush(user.id, replacedTitle, replacedMessage);
            if (pushResult.success) {
              await db.notificationCampaign.update({
                where: { id: campaign.id },
                data: { lastSentAt: now }
              });
              report.dispatches.push({
                userId: user.id,
                type: 'CUSTOM_CAMPAIGN',
                campaignId: campaign.id,
                title: replacedTitle
              });
            } else {
              report.errors.push({
                userId: user.id,
                type: 'CUSTOM_CAMPAIGN',
                campaignId: campaign.id,
                error: pushResult.reason
              });
            }
          }
        }
      } catch (campaignErr) {
        console.error(`[Cron Engine] Error processing custom campaigns for user ${user.id}:`, campaignErr);
        report.errors.push({
          userId: user.id,
          type: 'CUSTOM_CAMPAIGN',
          error: campaignErr.message
        });
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
