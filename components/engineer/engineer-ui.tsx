"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useEngineerBranding } from "@/components/engineer/branding"

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
  const branding = useEngineerBranding()
  return (
    <div
      className="rounded-2xl border px-4 py-3 shadow-sm"
      style={{
        borderColor: branding.primaryBorder,
        background: `linear-gradient(to right, ${branding.primarySoft}, ${branding.secondarySoft})`,
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: branding.primaryColor }}>
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
  const branding = useEngineerBranding()
  const body = (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs">{label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">{value}</p>
        </div>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8"
          style={{ backgroundColor: branding.primarySoft, color: branding.primaryColor }}
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
