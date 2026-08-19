"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookUser, CalendarDays, ClipboardList, FileText, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/sales", label: "Today", icon: LayoutDashboard, exact: true },
  { href: "/sales/planner", label: "Plan", icon: CalendarDays },
  { href: "/sales/report", label: "Report", icon: ClipboardList },
  { href: "/sales/clients", label: "Clients", icon: BookUser },
  { href: "/sales/quotes", label: "Quotes", icon: FileText },
]

export function SalesMobileNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Sales"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700",
                  active ? "text-teal-800" : "text-slate-500",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
