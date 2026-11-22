"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function EngineerPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] space-y-4 p-3 pb-24 sm:p-4 lg:p-6 lg:pb-6", className)}>
      {children}
    </div>
  )
}

export function EngineerHeader({
  eyebrow = "Technical service",
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-3 shadow-sm"
      style={{
        borderColor: "var(--brand-primary-100, var(--brand-soft-border))",
        background: "linear-gradient(to right, var(--brand-primary-50), var(--brand-secondary-50))",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--brand-primary)" }}
          >
            {eyebrow}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
          {description ? <p className="hidden max-w-2xl text-sm text-slate-600 sm:block">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

export function EngineerKpi({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string
  value: string | number
  href?: string
  icon: LucideIcon
}) {
  const body = (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs">{label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">{value}</p>
        </div>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8"
          style={{ backgroundColor: "var(--brand-primary-50)", color: "var(--brand-primary)" }}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        </span>
      </div>
    </div>
  )
  if (!href) return body
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  )
}

export function EngineerStatusBadge({ status, label }: { status?: string; label?: string }) {
  const value = String(status || "").toLowerCase()
  const text = label || value.replace(/_/g, " ") || "open"
  let className = "border-slate-200 bg-slate-50 text-slate-700"
  if (value === "completed") className = "border-emerald-200 bg-emerald-50 text-emerald-800"
  else if (value === "in_progress") className = "border-sky-200 bg-sky-50 text-sky-800"
  else if (value === "assigned" || value === "open") className = "border-amber-200 bg-amber-50 text-amber-800"
  else if (value === "overdue" || value === "cancelled") className = "border-rose-200 bg-rose-50 text-rose-800"
  else if (value === "installation_pending" || value === "waiting_parts") {
    className = "border-amber-200 bg-amber-50 text-amber-800"
  }
  return (
    <Badge variant="outline" className={cn("h-5 capitalize px-1.5 text-[10px]", className)}>
      {text}
    </Badge>
  )
}

export function formatWhen(value?: string | Date | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatResponseSpan(from?: string | Date | null, to?: string | Date | null) {
  if (!from || !to) return ""
  const start = new Date(from).getTime()
  const end = new Date(to).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return ""
  const minutes = Math.max(0, Math.round((end - start) / 60000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (hours < 24) return rem ? `${hours}h ${rem}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const left = hours % 24
  return left ? `${days}d ${left}h` : `${days}d`
}

export function ResponseTrack({
  raised,
  resolved,
  className,
}: {
  raised?: string | Date | null
  resolved?: string | Date | null
  className?: string
}) {
  const raisedLabel = formatWhen(raised)
  const resolvedLabel = formatWhen(resolved)
  if (!raisedLabel && !resolvedLabel) return null
  const span = formatResponseSpan(raised, resolved)

  return (
    <div className={cn("mt-2 rounded-lg bg-slate-50 px-2.5 py-2", className)}>
      <div className="flex items-start justify-between gap-2 text-[11px]">
        <div>
          <p className="font-medium uppercase tracking-wide text-slate-500">Raised</p>
          <p className="mt-0.5 text-slate-800">{raisedLabel || "—"}</p>
        </div>
        <div className="text-right">
          <p className="font-medium uppercase tracking-wide text-slate-500">Resolved</p>
          <p className="mt-0.5 text-slate-800">{resolvedLabel || "Open"}</p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="h-px flex-1 bg-slate-300" />
        <span className="text-[10px] font-medium text-slate-500">{span || (resolvedLabel ? "" : "Awaiting close")}</span>
        <span className="h-px flex-1 bg-slate-300" />
      </div>
    </div>
  )
}

export function withinEditWindow(completedDate?: string | Date | null) {
  if (!completedDate) return false
  const stamp = new Date(completedDate).getTime()
  if (Number.isNaN(stamp)) return false
  return Date.now() - stamp < 24 * 60 * 60 * 1000
}
