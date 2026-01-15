import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { NotificationProvider } from "@/components/ui/Notifications";
import { ServiceWorkerRegistration, InstallPrompt } from "@/components/pwa";
import { NativeInit } from "@/components/native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#d4a574",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Chronicle",
  description: "Stories you didn't know you needed. Create personalized AI-generated books.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://chronicle.town"),
  openGraph: {
    title: "Chronicle",
    description: "Stories you didn't know you needed. Create personalized AI-generated books.",
    url: "https://chronicle.town",
    siteName: "Chronicle",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Chronicle - AI-generated stories",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chronicle",
    description: "Stories you didn't know you needed.",
    images: ["/og-image.jpg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chronicle",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <NotificationProvider>
            <AudioProvider>
              {children}
            </AudioProvider>
            <ServiceWorkerRegistration />
            <InstallPrompt />
            <NativeInit />
          </NotificationProvider>
        </ErrorBoundary>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
