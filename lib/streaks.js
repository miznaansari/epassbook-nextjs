import { db } from './db';

/**
 * Returns the date string in the user's local timezone (YYYY-MM-DD)
 * @param {Date|string} date 
 * @param {string} tzString 
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateString(date, tzString) {
  try {
    const dObj = new Date(date);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzString || 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(dObj);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value.padStart(2, '0');
    const d = parts.find(p => p.type === 'day').value.padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (e) {
    // Fallback to UTC
    const dObj = new Date(date);
    const y = dObj.getUTCFullYear();
    const m = String(dObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Subtracts n days from a YYYY-MM-DD date string without timezone shifting
 * @param {string} dateStr 
 * @param {number} numDays 
 * @returns {string} YYYY-MM-DD
 */
export function subtractDays(dateStr, numDays) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() - numDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates current Level 1 and Level 2 spending streaks for a user
 * @param {string} userId 
 * @returns {Promise<{ streakLevel1: number, streakLevel2: number, limit: number }>}
 */
export async function calculateStreaks(userId) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      timezone: true,
      streakLevel2Limit: true
    }
  });

  if (!user) {
    return { streakLevel1: 0, streakLevel2: 0, limit: 100 };
  }

  const tzString = user.timezone || 'UTC';
  const joinDateStr = getLocalDateString(user.createdAt, tzString);
  const now = new Date();
  const todayStr = getLocalDateString(now, tzString);
  const limit = parseFloat(user.streakLevel2Limit || 100);

  // Fetch all SPENDING financial entries for the user
  const entries = await db.financialEntry.findMany({
    where: {
      userId,
      type: 'SPENDING'
    },
    select: {
      amount: true,
      date: true
    }
  });

  // Group total spending by local date
  const spendByDate = {};
  entries.forEach(entry => {
    const dateStr = getLocalDateString(entry.date, tzString);
    spendByDate[dateStr] = (spendByDate[dateStr] || 0) + parseFloat(entry.amount);
  });

  // Calculate Level 1 Streak (Daily spend is exactly 0)
  let streakLevel1 = 0;
  let currDateStr1 = todayStr;
  while (currDateStr1 >= joinDateStr) {
    const spend = spendByDate[currDateStr1] || 0;
    if (spend === 0) {
      streakLevel1++;
      currDateStr1 = subtractDays(currDateStr1, 1);
    } else {
      break;
    }
  }

  // Calculate Level 2 Streak (Daily spend <= limit)
  let streakLevel2 = 0;
  let currDateStr2 = todayStr;
  while (currDateStr2 >= joinDateStr) {
    const spend = spendByDate[currDateStr2] || 0;
    if (spend <= limit) {
      streakLevel2++;
      currDateStr2 = subtractDays(currDateStr2, 1);
    } else {
      break;
    }
  }

  return { streakLevel1, streakLevel2, limit };
}
