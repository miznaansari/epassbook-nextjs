'use client';

import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/context/AuthContext';

let initialized = false;
let listenersAdded = false;

export default function OneSignalProvider() {
  const { user } = useAuth();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = async () => {
      try {
        // =========================
        // INIT
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
          console.log('[OneSignal] Initialized');
        }

        // =========================
        // ADD LISTENERS ONCE
        // =========================
        if (!listenersAdded) {
          OneSignal.User.PushSubscription.addEventListener(
            'change',
            async () => {
              console.log(
                '[OneSignal] Subscription changed:',
                OneSignal.User.PushSubscription.id
              );
              await syncSubscription();
            }
          );

          listenersAdded = true;
        }

        // =========================
        // LOGOUT
        // =========================
        if (!user?.uid) {
          console.log('[OneSignal] Logout');
          await OneSignal.logout();
          return;
        }

        // =========================
        // LOGIN
        // =========================
        console.log('[OneSignal] User login:', user.uid);
        await OneSignal.login(user.uid);

        // =========================
        // TAGS
        // =========================
        await OneSignal.User.addTags({
          user_id: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          dailyReminderTime: user.dailyReminderTime || '23:00',
          notifDaily: user.notifDaily ? 'true' : 'false',
          notifCycle: user.notifCycle ? 'true' : 'false',
          currency: user.currency || 'USD'
        });

        // =========================
        // ASK PERMISSION
        // =========================
        const permission = OneSignal.Notifications.permission;
        console.log('[OneSignal] Permission:', permission);

        if (permission === 'default') {
          console.log('[OneSignal] Requesting permission...');
          await OneSignal.Notifications.requestPermission();
        }

        // =========================
        // OPT IN
        // =========================
        const pushSubscription = OneSignal.User.PushSubscription;

        if (
          OneSignal.Notifications.permission === 'granted' &&
          pushSubscription &&
          !pushSubscription.optedIn
        ) {
          console.log('[OneSignal] Opting in...');
          await pushSubscription.optIn();
        }

        // =========================
        // WAIT FOR SUBSCRIPTION
        // =========================
        let retry = 0;
        while (!OneSignal.User.PushSubscription.id && retry < 10) {
          console.log('[OneSignal] Waiting for subscription id...');
          await new Promise((r) => setTimeout(r, 1000));
          retry++;
        }

        console.log(
          '[OneSignal] Subscription ID:',
          OneSignal.User.PushSubscription.id
        );

        // =========================
        // SYNC DATABASE
        // =========================
        await syncSubscription();
      } catch (err) {
        console.error('[OneSignal] Init Error:', err);
      }
    };

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

        console.log('[OneSignal] Syncing:', {
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
            onesignalId: oneSignalId, // compatibility fallback for backend route
          }),
        });

        const data = await res.json();
        console.log('[OneSignal] Backend synced:', data);
        syncingRef.current = false;
      } catch (err) {
        syncingRef.current = false;
        console.error('[OneSignal] Sync error:', err);
      }
    };

    init();
  }, [user]);

  return null;
}
