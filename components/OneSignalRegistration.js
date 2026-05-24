'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function OneSignalRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: "722dd7e4-705a-4a0e-a0b8-b4e2a3c93057",
          allowLocalhostAsSecureOrigin: true, // Enables local testing easily
          notifyButton: {
            enable: false, // Don't show generic bell icon; we design our own controls
          },
        });

        // If user is authenticated, link their OneSignal push record with their unique Firebase user ID!
        // This is a premium architecture feature that allows target push notifications to this user!
        if (user?.uid) {
          await OneSignal.login(user.uid);
          
          // Store their preferred tags for automated push scheduling
          await OneSignal.User.addTags({
            userId: user.uid,
            email: user.email,
            name: user.displayName || '',
            dailyReminderTime: user.dailyReminderTime || '23:00',
            notifDaily: user.notifDaily ? 'true' : 'false',
            notifCycle: user.notifCycle ? 'true' : 'false',
            currency: user.currency || 'USD'
          });
        }
      });
    }
  }, [user]);

  return null;
}
