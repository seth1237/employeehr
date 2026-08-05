"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, LogOut } from "lucide-react"
import { logout } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { getManagerAllowedSections, MANAGER_MENU_ITEMS } from "@/lib/manager-access"

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onToggle: () => void
  onCollapseToggle: () => void
}

export default function ManagerSidebar({ isOpen, isCollapsed, onToggle, onCollapseToggle }: SidebarProps) {
  const pathname = usePathname()
  const [allowedSections, setAllowedSections] = useState<Set<string> | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)

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

    // If allowedSections is null, show all items. Otherwise, filter based on allowed sections.
    const hasAccess = (section: string) => 
      allowedSections === null || allowedSections.has(section)

    MANAGER_MENU_ITEMS.forEach((item) => {
      const section = item.section || "OTHER"
      if (hasAccess(section)) {
        if (!grouped[section]) grouped[section] = []
        grouped[section].push(item)
      }
    })

    return Object.entries(grouped)
  }, [allowedSections])

  const showLoadingPlaceholder = loadingAccess

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onToggle} />}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-card transition-all duration-300 lg:static",
          isCollapsed ? "lg:w-20" : "lg:w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("flex items-center border-b border-border p-4", isCollapsed ? "justify-center" : "justify-between")}> 
          <Link href="/manager" className={cn("flex items-center font-bold text-lg", isCollapsed ? "justify-center" : "gap-3") }>
            <div className="h-8 w-8 rounded-md bg-[var(--company-logo-url)] bg-contain bg-center bg-no-repeat" />
            {!isCollapsed && <span style={{ color: "var(--brand-primary)" }}>Manager Portal</span>}
          </Link>
          {!isCollapsed && (
            <button onClick={onToggle} className="rounded p-1 hover:bg-secondary lg:hidden">
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {showLoadingPlaceholder ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Loading menu…</div>
          ) : sectionEntries.map(([sectionName, items]) => (
            <div key={sectionName}>
              {!isCollapsed && (
                <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {sectionName}
                </h3>
              )}
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center rounded-lg text-sm transition",
                        isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5",
                        isActive
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-foreground hover:bg-secondary",
                      )}
                    >
                      <Icon size={18} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-4">
          <button
            onClick={onCollapseToggle}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground",
              isCollapsed ? "justify-center" : "gap-3",
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={18} className={isCollapsed ? "rotate-180" : ""} />
            {!isCollapsed && <span className="font-medium">Collapse</span>}
          </button>
          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center rounded-lg px-4 py-3 text-muted-foreground transition hover:bg-destructive/10 hover:text-foreground",
              isCollapsed ? "justify-center" : "gap-3",
            )}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="font-medium">Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
