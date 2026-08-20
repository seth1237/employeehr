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
  CalendarDays,
  LogOut,
  Palmtree,
  X,
} from "lucide-react"
import { logout } from "@/lib/auth"

const navigation = [
  { name: "Today", href: "/sales", icon: LayoutDashboard },
  { name: "Planner", href: "/sales/planner", icon: CalendarDays },
  { name: "Visit reports", href: "/sales/report", icon: ClipboardList },
  { name: "Clients", href: "/sales/clients", icon: BookUser },
  { name: "Quotes", href: "/sales/quotes", icon: FileText },
  { name: "Leave", href: "/sales/leave", icon: Palmtree },
  { name: "History", href: "/sales/history", icon: History },
]

export function SalesSidebar({ isOpen = false, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()

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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Field sales</p>
            <p className="text-base font-semibold text-slate-900">Desk</p>
          </div>
          <button type="button" className="rounded-md p-2 lg:hidden" onClick={onToggle} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Sales pages">
          {navigation.map((item) => {
            const active = item.href === "/sales" ? pathname === "/sales" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700",
                  active ? "bg-teal-50 text-teal-900" : "text-slate-600 hover:bg-slate-50",
                )}
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
