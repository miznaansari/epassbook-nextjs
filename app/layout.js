import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { KeyboardProvider } from "@/context/KeyboardContext";
import PWARegistration from "@/components/PWARegistration";
import OneSignalProvider from "@/components/providers/OneSignalProvider";
import IOSOnboardingBanner from "@/components/IOSOnboardingBanner";
import NotificationScheduler from "@/components/NotificationScheduler";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F7FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0D14" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: "MonthlyMoney — know where your salary goes",
  description: "AI groups every rupee you spend by merchant, compares salary cycles, reads receipts and answers questions about your money.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MonthlyMoney",
  },
  icons: {
    icon: "/icon-192x192.png",
    shortcut: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('passbook_theme') || 'dark';
                  var root = document.documentElement;
                  if (theme === 'system') {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    theme = prefersDark ? 'dark' : 'light';
                  }
                  if (theme === 'light') {
                    root.classList.add('light');
                    root.classList.remove('dark');
                    root.setAttribute('data-theme', 'light');
                    root.style.colorScheme = 'light';
                  } else {
                    root.classList.add('dark');
                    root.classList.remove('light');
                    root.setAttribute('data-theme', 'dark');
                    root.style.colorScheme = 'dark';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-canvas text-ink relative selection:bg-primary/25 transition-colors duration-200">
        {/* Ambient brand glow (theme-aware, static for mobile performance) */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(55% 38% at 50% -6%, color-mix(in srgb, var(--color-primary) 11%, transparent) 0%, transparent 70%), radial-gradient(35% 30% at 100% 0%, color-mix(in srgb, var(--color-secondary) 7%, transparent) 0%, transparent 70%)',
          }}
        />

        {/* Layer 4: Application Shell & Context */}
        <div className="relative z-10 flex-1 flex flex-col">
          <NextTopLoader
            color="#6366F1"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="cubic-bezier(0.16, 1, 0.3, 1)"
            speed={250}
            shadow="0 0 12px #6366F1, 0 0 6px #F59E0B"
            zIndex={99999}
            showAtBottom={false}
          />
          <Script 
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" 
            strategy="afterInteractive" 
          />
          <ThemeProvider>
            <AuthProvider>
              <SidebarProvider>
                <KeyboardProvider>
                  <PWARegistration />
                  <OneSignalProvider />
                  <IOSOnboardingBanner />
                  <NotificationScheduler />
                  {children}
                </KeyboardProvider>
              </SidebarProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
