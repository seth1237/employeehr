import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AppInitializer } from "@/components/app-initializer";
import { SafeJsonGuard } from "@/components/safe-json-guard";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elevate — Turn Manual Tasks into Automations",
  description:
    "Elevate ERP: inventory, payroll, procurement, and manufacturing workflows flowing into one automation hub. Signup or login to your company system.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/pwa-icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/pwa-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/pwa-icon-192.png",
  },
};

import { UserActivityTracker } from "@/components/UserActivityTracker";
import { DownloadFxProvider } from "@/components/download/download-fx";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SafeJsonGuard />
          <AppInitializer />
          <UserActivityTracker />
          <Toaster />
          <DownloadFxProvider>{children}</DownloadFxProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
