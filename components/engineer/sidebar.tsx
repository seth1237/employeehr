"use client"

import { usePathname } from "next/navigation"
import { getUser, logout } from "@/lib/auth"
import { isTechnicalServiceLead, technicalServiceRoleLabel } from "@/lib/engineer-roles"
import { navIcon } from "@/lib/nav-icons"
import {
  SidebarBrand,
  SidebarFooter,
  SidebarFrame,
  SidebarNavLink,
  isExactOrNestedPath,
} from "@/components/nav/sidebar-chrome"

const navigation = [
  { name: "Dashboard", href: "/engineer" },
  { name: "Work orders", href: "/engineer/work-orders" },
  { name: "Requests", href: "/engineer/requests" },
  { name: "Machines", href: "/engineer/machines" },
  { name: "Reports", href: "/engineer/reports" },
  { name: "Team", href: "/engineer/team", leadOnly: true },
  { name: "Calendar", href: "/engineer/calendar" },
  { name: "Leave", href: "/engineer/leave" },
  { name: "Payroll", href: "/engineer/payroll" },
  { name: "Expenses", href: "/engineer/expenses" },
  { name: "Tools of work", href: "/engineer/tools" },
]

export function EngineerSidebar({ isOpen = false, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const user = getUser()
  const lead = isTechnicalServiceLead(user?.role)
  const items = navigation.filter((item) => !item.leadOnly || lead)

  return (
    <SidebarFrame isOpen={isOpen} isCollapsed={false} onToggle={onToggle || (() => {})}>
      <SidebarBrand
        href="/engineer"
        title="Technical service"
        subtitle={lead ? "Lead" : "Engineer"}
        isCollapsed={false}
        onMobileClose={onToggle}
      />
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Engineer pages">
        {items.map((item) => (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            label={item.name}
            icon={navIcon(item.href)}
            isActive={isExactOrNestedPath(pathname, item.href, ["/engineer"])}
            isCollapsed={false}
            dataTour={item.href === "/engineer/work-orders" ? "wt-section-engineering" : undefined}
            onClick={onToggle}
          />
        ))}
      </nav>
      <SidebarFooter
        isCollapsed={false}
        showCollapse={false}
        onLogout={() => logout()}
        userName={[user?.first_name, user?.last_name].filter(Boolean).join(" ")}
        userRole={technicalServiceRoleLabel(user?.role) || user?.role}
      />
    </SidebarFrame>
  )
}
