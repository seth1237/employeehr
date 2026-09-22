"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ClipboardList, Inbox, LayoutDashboard, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEngineerBranding } from "@/components/engineer/branding"

const ITEMS = [
  { href: "/engineer", label: "Today", icon: LayoutDashboard, exact: true },
  { href: "/engineer/work-orders", label: "Jobs", icon: ClipboardList },
  { href: "/engineer/requests", label: "Inbox", icon: Inbox },
  { href: "/engineer/machines", label: "Machines", icon: Wrench },
  { href: "/engineer/calendar", label: "Cal", icon: CalendarDays },
]

export function EngineerMobileNav() {
  const pathname = usePathname()
  const branding = useEngineerBranding()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Engineer"
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
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                  active ? "" : "text-slate-500",
                )}
                style={active ? { color: branding.primaryColor } : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
