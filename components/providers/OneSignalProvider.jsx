'use client';

import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/context/AuthContext';

let initialized = false;
let listenersAdded = false;

export default function OneSignalProvider() {
  const { user, loading } = useAuth();
  const syncingRef = useRef(false);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading) return; // Do not execute SDK actions while auth state is resolving

    const syncSubscription = async () => {
      try {
        if (syncingRef.current) return;
        syncingRef.current = true;

        const subscriptionId = OneSignal.User.PushSubscription.id;
        const oneSignalId = OneSignal.User.onesignalId;

        if (!subscriptionId) {
          console.log('[OneSignal] No subscription ID yet');
          syncingRef.current = false;
          return;
        }

        console.log('[OneSignal] Syncing subscription to backend:', {
          subscriptionId,
          oneSignalId,
        });

        const res = await fetch('/api/user/onesignal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscriptionId,
            oneSignalId,
            onesignalId: oneSignalId, // compatibility fallback
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        const data = await res.json();
        console.log('[OneSignal] Backend synced response:', data);
        syncingRef.current = false;
      } catch (err) {
        syncingRef.current = false;
        console.error('[OneSignal] Sync error:', err);
      }
    };

    const syncAndLogin = async () => {
      const currentUser = userRef.current;
      if (!currentUser?.uid) return;

      try {
        console.log('[OneSignal] Re-authenticating / login user on app open:', currentUser.uid);
        await OneSignal.login(currentUser.uid);

        // Update user tags for targeting & notifications
        await OneSignal.User.addTags({
          user_id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || '',
          dailyReminderTime: currentUser.dailyReminderTime || '23:00',
          notifDaily: currentUser.notifDaily !== false ? 'true' : 'false',
          notifCycle: currentUser.notifCycle !== false ? 'true' : 'false',
          dailySpendReminderTime: currentUser.dailySpendReminderTime || '22:00',
          notifDailySpend: currentUser.notifDailySpend !== false ? 'true' : 'false',
          currency: currentUser.currency || 'USD',
        });

        // Request permission if not yet decided
        const permission = OneSignal.Notifications.permission;
        console.log('[OneSignal] Notification permission status:', permission);

        if (permission === 'default') {
          console.log('[OneSignal] Requesting notification permission...');
          await OneSignal.Notifications.requestPermission();
        }

        // Re-enforce optIn if native permission is granted
        const pushSubscription = OneSignal.User.PushSubscription;
        if (
          OneSignal.Notifications.permission === 'granted' &&
          pushSubscription &&
          !pushSubscription.optedIn
        ) {
          console.log('[OneSignal] Re-opting in push subscription...');
          await pushSubscription.optIn();
        }

        // Poll for subscription id if needed
        let retry = 0;
        while (!OneSignal.User.PushSubscription.id && retry < 5) {
          await new Promise((r) => setTimeout(r, 800));
          retry++;
        }

        console.log('[OneSignal] Active Subscription ID:', OneSignal.User.PushSubscription.id);

        // Always sync backend database on app open / focus
        await syncSubscription();
      } catch (err) {
        console.error('[OneSignal] syncAndLogin error:', err);
      }
    };

    const init = async () => {
      try {
        // =========================
        // 1. INITIALIZE SDK
        // =========================
        if (!initialized) {
          await OneSignal.init({
            appId: '722dd7e4-705a-4a0e-a0b8-b4e2a3c93057',
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            notifyButton: {
              enable: false,
            },
            autoRegister: false,
          });

          initialized = true;
          console.log('[OneSignal] SDK Initialized');
        }

        // =========================
        // 2. LISTENERS
        // =========================
        if (!listenersAdded) {
          OneSignal.User.PushSubscription.addEventListener(
            'change',
            async () => {
              console.log(
                '[OneSignal] Subscription changed:',
                OneSignal.User.PushSubscription.id
              );
              await syncAndLogin();
            }
          );

          listenersAdded = true;
        }

        // =========================
        // 3. EXECUTE LOGIN & SYNC IF AUTHENTICATED
        // =========================
        if (user?.uid) {
          await syncAndLogin();
        }
      } catch (err) {
        console.error('[OneSignal] Init Error:', err);
      }
    };

    init();

    // =========================
    // 4. APP OPEN / FOCUS LISTENERS
    // =========================
    const handleAppOpenOrFocus = async () => {
      if (document.visibilityState === 'visible' && userRef.current?.uid) {
        console.log('[OneSignal] App focused/opened - triggering login & sync API...');
        await syncAndLogin();
      }
    };

    document.addEventListener('visibilitychange', handleAppOpenOrFocus);
    window.addEventListener('focus', handleAppOpenOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleAppOpenOrFocus);
      window.removeEventListener('focus', handleAppOpenOrFocus);
    };
  }, [user, loading]);

  return null;
}

