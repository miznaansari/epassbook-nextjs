'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

let isOneSignalInitialized = false;

export default function OneSignalRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        if (!isOneSignalInitialized) {
          await OneSignal.init({
            appId: "722dd7e4-705a-4a0e-a0b8-b4e2a3c93057",
            allowLocalhostAsSecureOrigin: true, // Enables local testing easily
            notifyButton: {
              enable: false, // Don't show generic bell icon; we design our own controls
            },
          });
          isOneSignalInitialized = true;
          console.log("[OneSignal] Web SDK Initialized successfully.");
        }

        // If user is authenticated, link their OneSignal push record with their unique Firebase user ID!
        // This is a premium architecture feature that allows target push notifications to this user!
        if (user?.uid) {
          console.log(`[OneSignal] Logging in user with external ID: ${user.uid}`);
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

          // Fetch onesignalId and push subscription ID to sync to backend MySQL DB
          const onesignalId = OneSignal.User.onesignalId;
          const subscriptionId = OneSignal.User.pushSubscription.id;

          if (onesignalId || subscriptionId) {
            try {
              await fetch('/api/user/onesignal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  onesignalId,
                  subscriptionId,
                }),
              });
            } catch (err) {
              console.error('[OneSignal] Error syncing IDs to MySQL:', err);
            }
          }
        }
      });
    }
  }, [user]);

  return null;
}
