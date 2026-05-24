'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

let isOneSignalInitialized = false;

export default function OneSignalRegistration() {
  const { user } = useAuth();
  const userRef = useRef(user);

  // 1. OneSignal SDK Initialization and Event Listeners (Registered exactly once on mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      if (!isOneSignalInitialized) {
        await OneSignal.init({
          appId: "722dd7e4-705a-4a0e-a0b8-b4e2a3c93057",
          allowLocalhostAsSecureOrigin: true, // Enables local testing easily
          serviceWorkerPath: "/sw.js", // Directs OneSignal to use our root-relative service worker
          serviceWorkerParam: { scope: "/" },
          notifyButton: {
            enable: false, // Don't show generic bell icon; we design our own controls
          },
        });
        isOneSignalInitialized = true;
        console.log("[OneSignal] Web SDK Initialized successfully with root-relative Service Worker path.");

        // Define a stable, event-driven sync helper that always uses the latest user context ref
        const syncOnEvent = async () => {
          const latestUser = userRef.current;
          const onesignalId = OneSignal.User.onesignalId;
          const subscriptionId = OneSignal.User.PushSubscription.id;

          if (latestUser?.uid && (onesignalId || subscriptionId)) {
            try {
              const res = await fetch('/api/user/onesignal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  onesignalId: onesignalId || null,
                  subscriptionId: subscriptionId || null,
                }),
              });
              if (res.ok) {
                console.log(`[OneSignal Event Sync] Synced IDs successfully: ID=${onesignalId}, Sub=${subscriptionId}`);
              }
            } catch (err) {
              console.error('[OneSignal Event Sync] Error syncing IDs to MySQL:', err);
            }
          }
        };

        // Register observer event listeners exactly once to capture asynchronous updates cleanly
        OneSignal.User.addEventListener("change", syncOnEvent);
        OneSignal.User.PushSubscription.addEventListener("change", syncOnEvent);
      }
    });
  }, []);

  // 2. React to dynamic user session changes (Login, logout, updates, and permission prompts)
  useEffect(() => {
    // Keep userRef updated with the absolute latest user context
    userRef.current = user;

    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      if (!isOneSignalInitialized) return; // Wait for initial mount setup to complete

      if (user?.uid) {
        console.log(`[OneSignal] Session active. Logging in external ID: ${user.uid}`);
        await OneSignal.login(user.uid);

        // Store preferred tags for automated push reminders and localization
        await OneSignal.User.addTags({
          userId: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          dailyReminderTime: user.dailyReminderTime || '23:00',
          notifDaily: user.notifDaily ? 'true' : 'false',
          notifCycle: user.notifCycle ? 'true' : 'false',
          currency: user.currency || 'USD'
        });

        // Resolve push subscription opt-in status if browser permission is already granted
        const pushSubscription = OneSignal.User.PushSubscription;
        if (OneSignal.Notifications && OneSignal.Notifications.permission === 'granted' && pushSubscription) {
          if (!pushSubscription.optedIn) {
            console.log("[OneSignal] Native permission is granted but subscription is not opted-in. Opting in programmatically...");
            try {
              await pushSubscription.optIn();
            } catch (optErr) {
              console.error("[OneSignal] Error calling optIn programmatically:", optErr);
            }
          }
        }

        // Trigger an initial sync of IDs immediately
        const onesignalId = OneSignal.User.onesignalId;
        const subscriptionId = OneSignal.User.PushSubscription.id;
        if (onesignalId || subscriptionId) {
          try {
            const res = await fetch('/api/user/onesignal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                onesignalId: onesignalId || null,
                subscriptionId: subscriptionId || null,
              }),
            });
            if (res.ok) {
              console.log(`[OneSignal Initial Sync] Synced IDs successfully: ID=${onesignalId}, Sub=${subscriptionId}`);
            }
          } catch (err) {
            console.error('[OneSignal Initial Sync] Error syncing IDs:', err);
          }
        }

        // Trigger permission prompt if the status is still default (not yet prompted)
        if (OneSignal.Notifications && OneSignal.Notifications.permission === 'default') {
          console.log("[OneSignal] Permission is default; prompting user for notifications...");
          try {
            await OneSignal.Notifications.requestPermission();
          } catch (permErr) {
            console.error("[OneSignal] Error prompting for notification permission:", permErr);
          }
        }
      } else {
        // Disconnect external ID context when user is explicitly logged out
        console.log("[OneSignal] No active session. Disconnecting external ID context.");
        await OneSignal.logout();
      }
    });
  }, [user]);

  return null;
}

