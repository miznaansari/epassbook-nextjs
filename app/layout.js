import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
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

export const viewport = {
  themeColor: "#8b5cf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: "Manage Monthly Money | AI-Powered E-Passbook",
  description: "A Gen-Z styled, AI-powered smart E-Passbook for tracking month-wise salary, lending, loans, advance balance, and spending with streaming Gemini intelligence.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#030712] text-foreground relative">
        {/* Ambient Glowing Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-gradient-to-br from-violet-600/12 via-fuchsia-500/6 to-transparent rounded-full blur-[140px] animate-pulse" />
          <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] bg-gradient-to-br from-cyan-500/10 via-violet-500/6 to-transparent rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-gradient-to-br from-fuchsia-500/6 via-violet-600/10 to-transparent rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
        </div>
        <div className="relative z-10 flex-1 flex flex-col">
          <Script 
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" 
            strategy="afterInteractive" 
          />
          <AuthProvider>
            <PWARegistration />
            <OneSignalProvider />
            <IOSOnboardingBanner />
            <NotificationScheduler />
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
