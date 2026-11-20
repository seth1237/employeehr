import type { Metadata, Viewport } from "next"
import SalesLayoutClient from "./layout-client"

export const metadata: Metadata = {
  title: "Field Sales",
  applicationName: "Field Sales",
  manifest: "/manifest-sales.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Field Sales",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#0f766e",
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <SalesLayoutClient>{children}</SalesLayoutClient>
}
