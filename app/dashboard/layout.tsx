"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "@/components/dashboard/sidebar"
import TopNav from "@/components/dashboard/top-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }, [pathname])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
