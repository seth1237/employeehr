"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { getUser, logout } from "@/lib/auth"
import { getManagerAllowedSections, MANAGER_MENU_ITEMS } from "@/lib/manager-access"
import { isInterBranchNavHref, useCompanyBranches } from "@/lib/company-branches"
import { ADMIN_SECTION_LABELS, navIcon } from "@/lib/nav-icons"
import {
  SidebarBrand,
  SidebarFooter,
  SidebarFrame,
  SidebarNavLink,
  SidebarSectionLabel,
  isExactOrNestedPath,
} from "@/components/nav/sidebar-chrome"

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onToggle: () => void
  onCollapseToggle: () => void
}

const MANAGER_SECTION_LABELS: Record<string, string> = {
  ...ADMIN_SECTION_LABELS,
  FINANCE: "Finance",
  COMMUNICATIONS: "Communications",
}

export default function ManagerSidebar({ isOpen, isCollapsed, onToggle, onCollapseToggle }: SidebarProps) {
  const pathname = usePathname()
  const { hasBranches } = useCompanyBranches()
  const [allowedSections, setAllowedSections] = useState<Set<string> | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const user = getUser()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const sections = await getManagerAllowedSections()
      if (mounted) {
        setAllowedSections(sections)
        setLoadingAccess(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const sectionEntries = useMemo(() => {
    const grouped: Record<string, typeof MANAGER_MENU_ITEMS> = {}
    const hasAccess = (section: string) => allowedSections === null || allowedSections.has(section)

    MANAGER_MENU_ITEMS.forEach((item) => {
      if (isInterBranchNavHref(item.href) && !hasBranches) return
      const section = item.section || "OTHER"
      if (hasAccess(section)) {
        if (!grouped[section]) grouped[section] = []
        grouped[section].push(item)
      }
    })

    return Object.entries(grouped)
  }, [allowedSections, hasBranches])

  return (
    <SidebarFrame isOpen={isOpen} isCollapsed={isCollapsed} onToggle={onToggle}>
      <SidebarBrand
        href="/manager"
        title="Manager"
        subtitle="Portal"
        isCollapsed={isCollapsed}
        onMobileClose={onToggle}
      />
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Manager pages">
        {loadingAccess ? (
          <p className="px-2.5 py-3 text-[13px] text-slate-500">Loading menu…</p>
        ) : (
          sectionEntries.map(([sectionName, items]) => (
            <div key={sectionName}>
              <SidebarSectionLabel
                label={MANAGER_SECTION_LABELS[sectionName] || sectionName}
                isCollapsed={isCollapsed}
              />
              <div className="space-y-0.5">
                {items.map((item) => (
                  <SidebarNavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={navIcon(item.href, item.icon)}
                    isActive={isExactOrNestedPath(pathname, item.href, ["/manager"])}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </nav>
      <SidebarFooter
        isCollapsed={isCollapsed}
        onCollapseToggle={onCollapseToggle}
        onLogout={() => logout()}
        userName={[user?.first_name, user?.last_name].filter(Boolean).join(" ")}
        userRole={user?.role}
      />
    </SidebarFrame>
  )
}
