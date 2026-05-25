import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PWARegistration from "@/components/PWARegistration";
import OneSignalRegistration from "@/components/OneSignalRegistration";
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
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <Script 
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" 
          strategy="afterInteractive" 
        />
        <AuthProvider>
          <PWARegistration />
          <OneSignalRegistration />
          <NotificationScheduler />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
