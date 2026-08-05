import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AppInitializer } from "@/components/app-initializer";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  // <CHANGE> Updated metadata for HR Performance SaaS
  title: "Elevate - Employee Performance & Development Platform",
  description:
    "Automate performance management, drive employee growth, and recognize top talent with our integrated HR platform.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/ELEVATEERPLOGO.png",
        type: "image/png",
      },
      {
        url: "/ELEVATEERPLOGO.png",
        type: "image/png",
        sizes: "32x32",
      },
    ],
    apple: "/ELEVATEERPLOGO.png",
    shortcut: "/ELEVATEERPLOGO.png",
  },
};

import { UserActivityTracker } from "@/components/UserActivityTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AppInitializer />
          <UserActivityTracker />
          <Toaster />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
