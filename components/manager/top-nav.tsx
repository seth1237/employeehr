"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function ManagerTopNav({
  title,
  onMenuClick,
}: {
  title: string
  onMenuClick: () => void
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Company Manager</p>
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
        <Link href="/admin">Admin Dashboard</Link>
      </Button>
    </header>
  )
}
