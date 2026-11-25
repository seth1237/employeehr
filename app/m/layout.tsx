import type { ReactNode } from "react"
import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Machine service",
  description: "Machine status, service history, and requests from a QR scan.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f9",
}

export default function PublicMachineLayout({ children }: { children: ReactNode }) {
  return children
}
