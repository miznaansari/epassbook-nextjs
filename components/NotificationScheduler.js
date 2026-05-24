'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function NotificationScheduler() {
  const { user } = useAuth();
  const checkInterval = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Prompt user for desktop notifications standard API
    const requestNotificationPermission = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
    };

    requestNotificationPermission();

    const checkAndTriggerNotifications = async () => {
      if (
        typeof window === 'undefined' || 
        !('Notification' in window) || 
        Notification.permission !== 'granted'
      ) {
        return;
      }

      const now = new Date();
      const currentHourMin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayDateStr = now.toDateString(); // e.g. "Mon May 25 2026"

      // 1. Daily Spend Reminder Alert
      if (user.notifDaily !== false) {
        const targetTime = user.dailyReminderTime || '23:00';
        if (currentHourMin === targetTime) {
          const lastTriggered = localStorage.getItem('last_daily_reminder_trigger');
          if (lastTriggered !== todayDateStr) {
            localStorage.setItem('last_daily_reminder_trigger', todayDateStr);
            new Notification('MonthlyMoney Daily Reminder', {
              body: '🔔 How did you spend your money today? Log your transactions now to keep your passbook accurate!',
              icon: '/icon-192x192.png',
              tag: 'daily-reminder',
            });
          }
        }
      }

      // 2. End of Financial Period Cycle Insight
      // Fires on the final day of the cycle boundary
      if (user.notifCycle !== false && user.salaryCycleDate) {
        const cycleDate = parseInt(user.salaryCycleDate);
        
        // Check if tomorrow represents the salary cycle trigger date
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        if (tomorrow.getDate() === cycleDate) {
          const cycleKey = `${now.getMonth()}-${now.getFullYear()}`;
          const lastCycleTriggered = localStorage.getItem('last_cycle_end_trigger');
          
          if (lastCycleTriggered !== cycleKey) {
            localStorage.setItem('last_cycle_end_trigger', cycleKey);
            
            // Retrieve dynamic spend & salary balances
            try {
              const res = await fetch(`/api/dashboard?userId=${user.uid}&filter=current`);
              if (res.ok) {
                const data = await res.json();
                const spent = data?.kpis?.spending || 0;
                const saved = data?.kpis?.salaryBalance || 0;
                
                const symbol = user.currency === 'INR' ? '₹' : '$';
                const bodyText = `📊 Cycle End Insight: You saved ${symbol}${Math.round(saved)} but spent ${symbol}${Math.round(spent)} this cycle. Check with Gemini AI for a quick audit!`;
                
                new Notification('MonthlyMoney Cycle Outlook', {
                  body: bodyText,
                  icon: '/icon-192x192.png',
                  tag: 'cycle-outlook',
                });
              }
            } catch (err) {
              console.error('Error fetching dynamic balance insights for notifications:', err);
            }
          }
        }
      }
    };

    // Run scheduler checks instantly on boot
    checkAndTriggerNotifications();

    // Check clock alignment every 30 seconds
    checkInterval.current = setInterval(checkAndTriggerNotifications, 30000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [user]);

  return null;
}
