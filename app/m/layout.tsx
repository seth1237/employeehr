import type { ReactNode } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Request service",
  description: "Scan a machine QR to request service, report a breakdown, or order a product.",
  robots: { index: false, follow: false },
}

export default function PublicMachineLayout({ children }: { children: ReactNode }) {
  return children
}
