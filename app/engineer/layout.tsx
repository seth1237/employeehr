import type { Metadata, Viewport } from "next"
import EngineerLayoutClient from "./layout-client"

export const metadata: Metadata = {
  title: "Technical Service",
  applicationName: "Technical Service",
  manifest: "/manifest-engineer.webmanifest",
  icons: {
    icon: "/pwa-icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Technical Service",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#0f766e",
}

export default function EngineerLayout({ children }: { children: React.ReactNode }) {
  return <EngineerLayoutClient>{children}</EngineerLayoutClient>
}
