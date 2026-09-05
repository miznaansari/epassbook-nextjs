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
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: "Manage Monthly Money | Precision Financial Ledger",
  description: "A precision-engineered, AI-assisted personal finance ledger for tracking salary cycles, active lending, debt management, and spending analytics.",
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
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#050506] text-[#EDEDEF] relative selection:bg-[#5E6AD2]/30 selection:text-white">
        {/* Layer 1: Base Depth Gradient */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,#0e0e14_0%,#050506_50%,#020203_100%)] pointer-events-none z-0" />

        {/* Layer 2: Subtle Technical Grid Overlay */}
        <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none z-0" />

        {/* Layer 3: Layered Ambient Light Blobs (Linear Signature) */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Primary Top-Center Ambient Light Pool */}
          <div 
            className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-[#5E6AD2]/12 rounded-full blur-[150px] animate-float pointer-events-none"
          />
          {/* Secondary Ambient Light Accent - Left */}
          <div 
            className="absolute top-[25%] -left-[10%] w-[600px] h-[600px] bg-[#7056E0]/8 rounded-full blur-[140px] animate-float-slow pointer-events-none"
          />
          {/* Tertiary Subtle Ambient Glow - Right */}
          <div 
            className="absolute top-[45%] -right-[10%] w-[550px] h-[550px] bg-[#3B82F6]/6 rounded-full blur-[140px] animate-float pointer-events-none"
          />
          {/* Lower Ambient Accent */}
          <div 
            className="absolute -bottom-[10%] left-[25%] w-[600px] h-[400px] bg-[#5E6AD2]/6 rounded-full blur-[160px] animate-float-slow pointer-events-none"
          />
        </div>

        {/* Layer 4: Application Shell & Context */}
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
