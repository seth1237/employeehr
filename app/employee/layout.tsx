"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"
import { companyApi } from "@/lib/api"
import { EmployeeSidebar } from "@/components/employee/sidebar"
import { EmployeeTopNav } from "@/components/employee/top-nav"
import { AiAssistantChat } from "@/components/ai/ai-assistant-chat"

const EMPLOYEE_SECTION_PATHS: Array<{ section: string; match: (path: string) => boolean }> = [
  { section: "CORE", match: (path) => ["/employee", "/employee/profile", "/employee/tasks", "/employee/messages"].some((prefix) => path === prefix || path.startsWith(prefix + "/")) },
  { section: "EMPLOYEE MANAGEMENT", match: (path) => ["/employee/meetings", "/employee/attendance", "/employee/bookings", "/employee/suggestions"].some((prefix) => path.startsWith(prefix)) },
  { section: "INVENTORY MANAGER", match: (path) => ["/employee/stock", "/employee/dispatch"].some((prefix) => path.startsWith(prefix)) },
  { section: "PERFORMANCE", match: (path) => ["/employee/feedback", "/employee/pdp", "/employee/awards", "/employee/badges", "/employee/polls", "/employee/reports"].some((prefix) => path.startsWith(prefix)) },
  { section: "ACCOUNTS", match: (path) => path.startsWith("/employee/payslip") },
  { section: "SYSTEM", match: (path) => ["/employee/contracts", "/employee/alerts", "/employee/company", "/employee/notifications", "/employee/settings"].some((prefix) => path.startsWith(prefix)) },
]

const getSectionForPath = (path: string): string | null => EMPLOYEE_SECTION_PATHS.find((entry) => entry.match(path))?.section || null

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    
    if (!user) {
      router.push("/auth/login")
      return
    }

    // Redirect non-employees to their appropriate dashboards
    if (user.role === "company_admin" || user.role === "admin" || user.role === "hr") {
      router.push("/admin")
      return
    }

    if (user.role === "manager") {
      router.push("/manager")
      return
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    const enforcePageAccess = async () => {
      const user = getUser()
      if (!user || user.role === "company_admin" || user.role === "hr" || user.role === "manager") return

      const currentSection = getSectionForPath(pathname)
      if (!currentSection) return

      try {
        const response = await companyApi.getPageAccess()
        if (!response.success) return

        const userId = user._id || user.userId
        const userSections: string[] | undefined = userId ? response.data?.adminSectionsByUser?.[userId] : undefined
        const roleSections: string[] = response.data?.adminSectionsByRole?.[user.role] || []
        const allowedSections: string[] = response.data?.effectiveSections?.length
          ? response.data.effectiveSections
          : Array.from(new Set([...(roleSections || []), ...(userSections || [])]))

        if (!allowedSections.includes(currentSection)) {
          const fallbackPath =
            allowedSections.includes("CORE") ? "/employee" :
            allowedSections.includes("INVENTORY MANAGER") ? "/employee/stock" :
            allowedSections.includes("EMPLOYEE MANAGEMENT") ? "/employee/tasks" :
            allowedSections.includes("PERFORMANCE") ? "/employee/feedback" :
            allowedSections.includes("ACCOUNTS") ? "/employee/payslip" :
            allowedSections.includes("SYSTEM") ? "/employee/settings" :
            "/employee"

          router.replace(fallbackPath)
        }
      } catch {
        // fail open to avoid blocking the employee area when access settings are unavailable
      }
    }

    enforcePageAccess()
  }, [pathname, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <EmployeeSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <EmployeeTopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
      <AiAssistantChat />
    </div>
  )
}
