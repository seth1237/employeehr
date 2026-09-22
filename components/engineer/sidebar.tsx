"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  Wrench,
  CalendarDays,
  FileText,
  LogOut,
  X,
} from "lucide-react"
import { logout } from "@/lib/auth"
import { useEngineerBranding } from "@/components/engineer/branding"

const navigation = [
  { name: "Dashboard", href: "/engineer", icon: LayoutDashboard },
  { name: "Work orders", href: "/engineer/work-orders", icon: ClipboardList },
  { name: "Requests", href: "/engineer/requests", icon: Inbox },
  { name: "Machines", href: "/engineer/machines", icon: Wrench },
  { name: "Calendar", href: "/engineer/calendar", icon: CalendarDays },
  { name: "Expenses", href: "/engineer/expenses", icon: FileText },
]

export function EngineerSidebar({ isOpen = false, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const branding = useEngineerBranding()

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={onToggle}
        />
      ) : null}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: branding.primaryColor }}
            >
              Technical service
            </p>
            <p className="text-base font-semibold text-slate-900">Engineer</p>
          </div>
          <button type="button" className="rounded-md p-2 lg:hidden" onClick={onToggle} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Engineer pages">
          {navigation.map((item) => {
            const active = item.href === "/engineer" ? pathname === "/engineer" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                  active ? "" : "text-slate-600 hover:bg-slate-50",
                )}
                style={
                  active
                    ? { backgroundColor: branding.primarySoft, color: branding.primaryColor }
                    : undefined
                }
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => logout()}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
