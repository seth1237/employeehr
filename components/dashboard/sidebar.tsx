"use client"

import { usePathname } from "next/navigation"
import { getUser, logout } from "@/lib/auth"
import { navIcon } from "@/lib/nav-icons"
import {
  SidebarBrand,
  SidebarFooter,
  SidebarFrame,
  SidebarNavLink,
  isExactOrNestedPath,
} from "@/components/nav/sidebar-chrome"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const menuItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/team", label: "Team Members" },
  { href: "/dashboard/kpis", label: "Performance KPIs" },
  { href: "/dashboard/meetings", label: "Meetings" },
  { href: "/dashboard/organization", label: "Organization" },
]

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const user = getUser()

  return (
    <SidebarFrame isOpen={isOpen} isCollapsed={false} onToggle={onToggle}>
      <SidebarBrand href="/dashboard" title="Elevate" isCollapsed={false} onMobileClose={onToggle} />
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Dashboard pages">
        {menuItems.map((item) => (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={navIcon(item.href)}
            isActive={isExactOrNestedPath(pathname, item.href, ["/dashboard"])}
            isCollapsed={false}
            onClick={onToggle}
          />
        ))}
      </nav>
      <SidebarFooter
        isCollapsed={false}
        showCollapse={false}
        onLogout={() => logout()}
        userName={[user?.first_name, user?.last_name].filter(Boolean).join(" ")}
        userRole={user?.role}
      />
    </SidebarFrame>
  )
}
