"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth"

interface SalesTopNavProps {
  onMenuClick?: () => void
}

export function SalesTopNav({ onMenuClick }: SalesTopNavProps) {
  const user = getUser()
  const name = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Sales representative"

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-[11px] text-muted-foreground">Personal reporting only — no team ranking</p>
        </div>
      </div>
    </header>
  )
}
