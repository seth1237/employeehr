"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  History,
  BookUser,
  LogOut,
  X,
} from "lucide-react"
import { logout } from "@/lib/auth"

const navigation = [
  { name: "Today", href: "/sales", icon: LayoutDashboard },
  { name: "Clients book", href: "/sales/clients", icon: BookUser },
  { name: "Reports", href: "/sales/report", icon: ClipboardList },
  { name: "Quotes", href: "/sales/quotes", icon: FileText },
  { name: "Planner", href: "/sales/planner", icon: ClipboardList },
  { name: "My history", href: "/sales/history", icon: History },
]

interface SalesSidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

export function SalesSidebar({ isOpen = false, onToggle }: SalesSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onToggle} />
      ) : null}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-white transition-transform duration-300 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sales reporting</p>
            <h1 className="text-lg font-bold" style={{ color: "var(--brand-primary, #0f766e)" }}>
              Field desk
            </h1>
          </div>
          <button type="button" className="lg:hidden" onClick={onToggle}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => {
            const active =
              item.href === "/sales" ? pathname === "/sales" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="border-t p-3">
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
