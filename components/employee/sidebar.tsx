"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { companyApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { ADMIN_SECTION_LABELS, navIcon } from "@/lib/nav-icons"
import {
  SidebarBrand,
  SidebarFooter,
  SidebarFrame,
  SidebarNavLink,
  SidebarSectionLabel,
  isExactOrNestedPath,
} from "@/components/nav/sidebar-chrome"

interface EmployeeSidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

type SectionKey = "CORE" | "EMPLOYEE MANAGEMENT" | "INVENTORY MANAGER" | "ACCOUNTS" | "PERFORMANCE" | "SYSTEM"

const EMPLOYEE_NAV: Array<{ name: string; href: string; section: SectionKey }> = [
  { name: "Dashboard", href: "/employee", section: "CORE" },
  { name: "My Profile", href: "/employee/profile", section: "CORE" },
  { name: "My Tasks", href: "/employee/tasks", section: "CORE" },
  { name: "Meetings", href: "/employee/meetings", section: "EMPLOYEE MANAGEMENT" },
  { name: "Messages", href: "/employee/messages", section: "CORE" },
  { name: "My Feedback", href: "/employee/feedback", section: "PERFORMANCE" },
  { name: "My PDP", href: "/employee/pdp", section: "PERFORMANCE" },
  { name: "My Attendance", href: "/employee/attendance", section: "EMPLOYEE MANAGEMENT" },
  { name: "My Leave", href: "/employee/leave", section: "EMPLOYEE MANAGEMENT" },
  { name: "My Payslips", href: "/employee/payslip", section: "ACCOUNTS" },
  { name: "Stock Sales", href: "/employee/stock", section: "INVENTORY MANAGER" },
  { name: "My Quotations", href: "/employee/stock/quotations", section: "INVENTORY MANAGER" },
  { name: "My Invoices", href: "/employee/stock#my-invoices", section: "INVENTORY MANAGER" },
  { name: "My Dispatch", href: "/employee/dispatch", section: "INVENTORY MANAGER" },
  { name: "My Awards", href: "/employee/awards", section: "PERFORMANCE" },
  { name: "Badges", href: "/employee/badges", section: "PERFORMANCE" },
  { name: "Resource Booking", href: "/employee/bookings", section: "EMPLOYEE MANAGEMENT" },
  { name: "Suggestions Box", href: "/employee/suggestions", section: "EMPLOYEE MANAGEMENT" },
  { name: "Voting & Polls", href: "/employee/polls", section: "EMPLOYEE MANAGEMENT" },
  { name: "Contract Alerts", href: "/employee/contracts", section: "SYSTEM" },
  { name: "Alerts & Notifications", href: "/employee/alerts", section: "SYSTEM" },
  { name: "Reports", href: "/employee/reports", section: "PERFORMANCE" },
  { name: "Company Info", href: "/employee/company", section: "SYSTEM" },
  { name: "Notifications", href: "/employee/notifications", section: "SYSTEM" },
  { name: "Settings", href: "/employee/settings", section: "SYSTEM" },
]

const SECTION_ORDER: SectionKey[] = [
  "CORE",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "PERFORMANCE",
  "ACCOUNTS",
  "SYSTEM",
]

export function EmployeeSidebar({ isOpen = false, onToggle }: EmployeeSidebarProps) {
  const pathname = usePathname()
  const [allowedSections, setAllowedSections] = useState<Set<string> | null>(null)
  const user = getUser()

  useEffect(() => {
    const loadSectionAccess = async () => {
      const current = getUser()
      const role = current?.role
      if (!role || role === "company_admin") {
        setAllowedSections(null)
        return
      }
      try {
        const response = await companyApi.getPageAccess()
        if (response?.success) {
          const userId = current?._id || (current as { userId?: string })?.userId
          const userSections = userId ? response.data?.adminSectionsByUser?.[userId] : undefined
          const roleSections = response.data?.adminSectionsByRole?.[role] || []
          setAllowedSections(new Set([...(roleSections || []), ...(userSections || [])]))
        }
      } catch {
        setAllowedSections(null)
      }
    }
    loadSectionAccess()
  }, [])

  const visible = allowedSections
    ? EMPLOYEE_NAV.filter((item) => allowedSections.has(item.section))
    : EMPLOYEE_NAV

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: visible.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0)

  return (
    <SidebarFrame isOpen={isOpen} isCollapsed={false} onToggle={onToggle || (() => {})}>
      <SidebarBrand
        href="/employee"
        title="Employee"
        subtitle="Portal"
        isCollapsed={false}
        onMobileClose={onToggle}
      />
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Employee pages">
        {grouped.map(({ section, items }) => (
          <div key={section}>
            <SidebarSectionLabel label={ADMIN_SECTION_LABELS[section] || section} isCollapsed={false} />
            <div className="space-y-0.5">
              {items.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  href={item.href}
                  label={item.name}
                  icon={navIcon(item.href)}
                  isActive={isExactOrNestedPath(pathname, item.href.split("#")[0], ["/employee", "/employee/stock"])}
                  isCollapsed={false}
                  onClick={onToggle}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <SidebarFooter
        isCollapsed={false}
        showCollapse={false}
        onLogout={() => {
          localStorage.clear()
          window.location.href = "/employee-login"
        }}
        userName={[user?.first_name, user?.last_name].filter(Boolean).join(" ")}
        userRole={user?.role}
      />
    </SidebarFrame>
  )
}
