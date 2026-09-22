"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DesktopTableShell, MobileCardList, MobileCard } from "@/components/admin/ui/mobile-list"
import { useCompanyBranding } from "@/hooks/use-sales-branding"
import { cn } from "@/lib/utils"

export const TS_BASE = "/admin/clients/technical-service"

const TABS = [
  { href: TS_BASE, label: "Overview", exact: true },
  { href: `${TS_BASE}/activity`, label: "Recent activity" },
  { href: `${TS_BASE}/installations`, label: "Pending installations" },
  { href: `${TS_BASE}/expenses`, label: "Expenses" },
]

export function monthStart() {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().slice(0, 10)
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function whenLabel(value?: string | Date | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function money(value?: number) {
  return Number(value || 0).toLocaleString()
}

export function statusTone(status?: string) {
  const value = String(status || "").toLowerCase()
  if (value === "completed" || value === "approved" || value === "reimbursed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }
  if (value === "in_progress") return "border-sky-200 bg-sky-50 text-sky-800"
  if (value === "installation_pending" || value === "submitted" || value === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }
  if (value === "rejected" || value === "overdue" || value === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-800"
  }
  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function TechnicalServiceHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  const branding = useCompanyBranding()
  const pathname = usePathname()
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: branding.primaryBorder,
          background: `linear-gradient(to right, ${branding.primarySoft}, ${branding.secondarySoft})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: branding.primaryColor }}>
              Technical Service
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Technical service sections">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                active ? "text-white" : "text-slate-600 hover:bg-slate-100",
              )}
              style={active ? { backgroundColor: branding.primaryColor } : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function TechnicalServicePage({ children }: { children: ReactNode }) {
  return <div className="space-y-5 p-4 md:p-6">{children}</div>
}

export function PreviewCard({
  title,
  href,
  children,
}: {
  title: string
  href: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link href={href}>View more</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

export function StatusBadge({ status }: { status?: string }) {
  return (
    <Badge variant="outline" className={`capitalize ${statusTone(status)}`}>
      {String(status || "open").replaceAll("_", " ")}
    </Badge>
  )
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export { DesktopTableShell, MobileCardList, MobileCard }
