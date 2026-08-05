"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { labelForPath, trackRecentPage } from "@/lib/admin-personalization"

export function RecentPagesTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname.startsWith("/admin")) return
    trackRecentPage(pathname, labelForPath(pathname))
  }, [pathname])

  return null
}
