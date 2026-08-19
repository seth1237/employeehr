"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function SalesPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] space-y-4 p-3 pb-24 sm:p-4 lg:p-6 lg:pb-6", className)}>
      {children}
    </div>
  )
}

export function SalesHeader({
  eyebrow = "Sales",
  title,
  description,
  actions,
  color,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  color?: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: color || "#0f766e" }}>
          {eyebrow}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SalesKpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  color,
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone?: "default" | "alert" | "success"
  color?: string
}) {
  const iconColor = tone === "alert" ? "#b45309" : tone === "success" ? "#047857" : color || "#0f766e"
  const iconBg = tone === "alert" ? "#fffbeb" : tone === "success" ? "#ecfdf5" : "rgba(15,118,110,0.08)"
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </div>
  )
}

export function SalesStatusBadge({
  status,
  label,
}: {
  status: string
  label?: string
}) {
  const value = String(status || "").toLowerCase()
  const text = label || String(status || "").replace(/_/g, " ")
  let className = "border-slate-200 bg-slate-50 text-slate-700"
  if (/(approved|completed|locked|converted|issued|paid|done)/.test(value)) {
    className = "border-emerald-200 bg-emerald-50 text-emerald-800"
  } else if (/(pending|draft|open|planned|submitted)/.test(value)) {
    className = "border-amber-200 bg-amber-50 text-amber-800"
  } else if (/(reject|cancel|overdue|unlock)/.test(value)) {
    className = "border-red-200 bg-red-50 text-red-800"
  }
  return (
    <Badge variant="outline" className={cn("capitalize", className)} aria-label={`Status: ${text}`}>
      {text}
    </Badge>
  )
}

export function SalesSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SalesEmpty({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function SalesQuickAction({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
  color?: string
}) {
  return (
    <Button asChild variant="outline" className="h-auto min-h-11 justify-start border-slate-200 p-3 text-left">
      <Link href={href} className="flex w-full items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: "rgba(15,118,110,0.08)", color: color || "#0f766e" }}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-900">{title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        </span>
      </Link>
    </Button>
  )
}

export function telHref(phone?: string) {
  const digits = String(phone || "").replace(/[^\d+]/g, "")
  return digits ? `tel:${digits}` : ""
}
