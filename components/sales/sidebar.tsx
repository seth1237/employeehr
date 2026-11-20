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

const navigation = [
  { name: "Today", href: "/sales" },
  { name: "Planner", href: "/sales/planner" },
  { name: "Calendar", href: "/sales/calendar" },
  { name: "Visit reports", href: "/sales/report" },
  { name: "Meetings", href: "/sales/meetings" },
  { name: "Clients", href: "/sales/clients" },
  { name: "Quotes", href: "/sales/quotes" },
  { name: "Exhibitions", href: "/sales/exhibitions" },
  { name: "Leave", href: "/sales/leave" },
  { name: "History", href: "/sales/history" },
]

export function SalesSidebar({ isOpen = false, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const user = getUser()

  return (
    <SidebarFrame isOpen={isOpen} isCollapsed={false} onToggle={onToggle || (() => {})}>
      <SidebarBrand
        href="/sales"
        title="Field sales"
        subtitle="Desk"
        isCollapsed={false}
        onMobileClose={onToggle}
      />
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Sales pages">
        {navigation.map((item) => (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            label={item.name}
            icon={navIcon(item.href)}
            isActive={isExactOrNestedPath(pathname, item.href, ["/sales"])}
            isCollapsed={false}
            dataTour={item.href === "/sales/quotes" ? "wt-section-sales-quotes" : undefined}
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
