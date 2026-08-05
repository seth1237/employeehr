"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"
import ManagerSidebar from "@/components/manager/sidebar"
import TopNav from "@/components/admin/top-nav"
import { AiAssistantChat } from "@/components/ai/ai-assistant-chat"
import { getManagerSectionForPath } from "@/lib/manager-access"

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("admin_sidebar_collapsed") : null
    if (saved === "1") setSidebarCollapsed(true)
  }, [])

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0")
      }
      return next
    })
  }

  useEffect(() => {
    const user = getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    if (user.role === "company_admin" || user.role === "hr") {
      router.push("/admin")
      return
    }

    if (user.role === "employee") {
      router.push("/employee")
      return
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    const user = getUser()
    if (!user || user.role === "company_admin" || user.role === "hr" || user.role === "employee") return

    let cancelled = false
    const enforcePermissions = async () => {
      const { getManagerAllowedSections } = await import("@/lib/manager-access")
      const allowedSections = await getManagerAllowedSections()
      const currentSection = getManagerSectionForPath(pathname)

      if (cancelled || !currentSection || !allowedSections) return

      if (!allowedSections.has(currentSection)) {
        router.replace("/manager")
      }
    }

    enforcePermissions()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <ManagerSidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onCollapseToggle={toggleSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onSidebarCollapseToggle={toggleSidebarCollapsed}
          isSidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <AiAssistantChat />
    </div>
  )
}
