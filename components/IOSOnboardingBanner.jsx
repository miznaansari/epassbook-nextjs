'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpFromLine, PlusSquare, Sparkles } from 'lucide-react';

export default function IOSOnboardingBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect if the device is iOS (iPhone/iPad/iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // 2. Detect if the app is already running in standalone mode (installed A2HS)
    const isStandalone = 
      window.navigator.standalone || 
      window.matchMedia('(display-mode: standalone)').matches;

    // 3. Detect if the user previously dismissed the onboarding banner
    const isDismissed = localStorage.getItem('ios-pwa-banner-dismissed') === 'true';

    // Show banner only on iOS devices in browser mode that haven't dismissed it
    if (isIOS && !isStandalone && !isDismissed) {
      // Delay showing slightly for better entry experience
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ios-pwa-banner-dismissed', 'true');
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96"
        >
          {/* Glassmorphic Container */}
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-background/80 p-5 shadow-2xl backdrop-blur-xl">
            {/* Background Accent Gradients */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-600/15 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-fuchsia-600/10 blur-2xl" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm tracking-tight">
                  Enable iOS Notifications
                </h3>
              </div>
              <button
                onClick={handleDismiss}
                className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Description */}
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Apple requires this app to be added to your Home Screen before you can receive push notifications. Follow these simple steps:
            </p>

            {/* Step Guides */}
            <div className="mt-4 space-y-3.5">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/5 text-violet-400 text-xs font-semibold">
                  1
                </div>
                <div className="text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                  Tap the <span className="inline-flex items-center justify-center p-1 rounded bg-white/5 border border-white/10 text-violet-400"><ArrowUpFromLine className="h-3.5 w-3.5" /></span> **Share** button in Safari.
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/5 text-violet-400 text-xs font-semibold">
                  2
                </div>
                <div className="text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                  Scroll down and tap <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-violet-400"><PlusSquare className="h-3.5 w-3.5" /> **Add to Home Screen**</span>.
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/5 text-violet-400 text-xs font-semibold">
                  3
                </div>
                <p className="text-xs text-foreground">
                  Open the app from your **Home Screen** and log in to get push updates!
                </p>
              </div>
            </div>

            {/* Button Got It */}
            <button
              onClick={handleDismiss}
              className="mt-5 w-full rounded-xl bg-violet-600 py-2.5 text-center text-xs font-medium text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-colors"
            >
              Got it, let's do it!
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
