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
            serviceWorkerPath: "sw.js", // Directs OneSignal to use our existing custom service worker
            serviceWorkerParam: { scope: "/" },
            notifyButton: {
              enable: false, // Don't show generic bell icon; we design our own controls
            },
          });
          isOneSignalInitialized = true;
          console.log("[OneSignal] Web SDK Initialized successfully with custom Service Worker path.");
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

          // Define helper to sync IDs to our database
          const syncIdsToBackend = async (onesignalId, subscriptionId) => {
            if (onesignalId || subscriptionId) {
              try {
                const res = await fetch('/api/user/onesignal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    onesignalId,
                    subscriptionId,
                  }),
                });
                if (res.ok) {
                  console.log(`[OneSignal] Synced IDs successfully: ID=${onesignalId}, Sub=${subscriptionId}`);
                }
              } catch (err) {
                console.error('[OneSignal] Error syncing IDs to MySQL:', err);
              }
            }
          };

          // Fetch onesignalId and push subscription ID to sync to backend MySQL DB
          const onesignalId = OneSignal.User.onesignalId;
          const pushSub = OneSignal.User.pushSubscription || OneSignal.User.PushSubscription;
          const subscriptionId = pushSub?.id;

          // Initial sync
          await syncIdsToBackend(onesignalId, subscriptionId);

          // Listen to future changes to capture active/new subscriptions dynamically
          if (pushSub && typeof pushSub.addEventListener === 'function') {
            pushSub.addEventListener("change", async (event) => {
              console.log("[OneSignal] Subscription changed event:", event.current);
              const latestOnesignalId = OneSignal.User.onesignalId;
              const latestSubId = event.current?.id;
              await syncIdsToBackend(latestOnesignalId, latestSubId);
            });
          }

          // Trigger prompt if the permission status is still default (not yet prompted)
          if (OneSignal.Notifications && OneSignal.Notifications.permission === 'default') {
            console.log("[OneSignal] Permission is default; prompting user for notifications...");
            await OneSignal.Notifications.requestPermission();
          }
        }
      });
    }
  }, [user]);

  return null;
}
