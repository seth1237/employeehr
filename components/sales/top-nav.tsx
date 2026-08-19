"use client"

import Link from "next/link"
import { Menu, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth"

export function SalesTopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = getUser()
  const name = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Sales representative"

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="hidden text-xs text-slate-500 sm:block">Let’s get today’s visits in</p>
        </div>
      </div>
      <Button asChild size="icon" className="h-10 w-10 sm:hidden" aria-label="Plan visit">
        <Link href="/sales/planner">
          <Plus className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild size="sm" className="hidden min-h-10 sm:inline-flex">
        <Link href="/sales/planner">
          <Plus className="mr-1.5 h-4 w-4" />
          Plan visit
        </Link>
      </Button>
    </header>
  )
}
