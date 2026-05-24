/**
 * Helper to get the boundaries of a salary cycle for a given date
 * @param {Date|string} dateRef - The reference date
 * @param {number} cycleDate - Day of the month the salary is received (1-31)
 * @returns {{ startDate: Date, endDate: Date }}
 */
export function getCycleRange(dateRef, cycleDate = 1) {
  const d = new Date(dateRef);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed
  const day = d.getDate();

  let startYear = year;
  let startMonth = month;

  if (day >= cycleDate) {
    // Current cycle started in the current calendar month
    startMonth = month;
  } else {
    // Current cycle started in the previous calendar month
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  // Start Date: startYear-startMonth-cycleDate 00:00:00.000
  const startDate = new Date(startYear, startMonth, cycleDate, 0, 0, 0, 0);

  // End Date: Start Date + 1 month - 1 day
  // Calculate next month's starting point
  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }

  // End date is 23:59:59.999 of the day before the next cycle starts
  const endDate = new Date(endYear, endMonth, cycleDate - 1, 23, 59, 59, 999);
  
  // Guard case: if cycleDate - 1 is 0 (i.e. cycleDate = 1), then standard javascript Date constructor 
  // will automatically roll back to the last day of the startMonth, which is exactly correct!

  return { startDate, endDate };
}

/**
 * Maps a specific calendar date to its logical salary cycle Month and Year
 * @param {Date|string} dateRef 
 * @param {number} cycleDate 
 * @returns {{ month: number, year: number }} month is 1-indexed (1-12)
 */
export function getLogicalCyclePeriod(dateRef, cycleDate = 1) {
  const d = new Date(dateRef);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed
  const day = d.getDate();

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

/**
 * Get range boundaries for a requested logical month and year under a cycle configuration
 * @param {number} month - 1-indexed (1-12)
 * @param {number} year - Four-digit year
 * @param {number} cycleDate 
 * @returns {{ startDate: Date, endDate: Date }}
 */
export function getRangeForLogicalPeriod(month, year, cycleDate = 1) {
  // A logical period (month, year) starts at cycleDate of calendar month (month - 1)
  const startMonth = month - 1; // 0-indexed calendar month
  const startDate = new Date(year, startMonth, cycleDate, 0, 0, 0, 0);

  // Next cycle starts:
  let endMonth = startMonth + 1;
  let endYear = year;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = year + 1;
  }
  
  const endDate = new Date(endYear, endMonth, cycleDate - 1, 23, 59, 59, 999);
  return { startDate, endDate };
}
