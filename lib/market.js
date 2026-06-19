/**
 * Checks if the current time is within Indian Stock Market hours.
 * Market hours: Monday to Friday, 9:15 AM to 3:30 PM IST.
 */
export function isMarketHours() {
  const now = new Date();
  try {
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    
    const day = istDate.getDay();
    if (day === 0 || day === 6) {
      return false; // Weekends
    }
    
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    const startTime = 9 * 60 + 15; // 9:15 AM
    const endTime = 15 * 60 + 30;  // 3:30 PM
    
    return timeInMinutes >= startTime && timeInMinutes <= endTime;
  } catch (err) {
    console.error('Error checking market hours:', err);
    // Fallback to local time
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    return timeInMinutes >= (9 * 60 + 15) && timeInMinutes <= (15 * 60 + 30);
  }
}
