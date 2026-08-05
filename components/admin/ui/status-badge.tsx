"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  issued: "Issued",
  cancelled: "Cancelled",
  draft: "Draft",
  pending_approval: "Pending approval",
  converted: "Converted",
  not_assigned: "Not assigned",
  assigned: "Assigned",
  packing: "Packing",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  open: "Open",
  closed: "Closed",
  won: "Won",
  lost: "Lost",
  follow_up: "Follow up",
}

const TONE_BY_STATUS: Record<string, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  won: "border-emerald-200 bg-emerald-50 text-emerald-800",
  issued: "border-sky-200 bg-sky-50 text-sky-800",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  assigned: "border-sky-200 bg-sky-50 text-sky-800",
  packing: "border-amber-200 bg-amber-50 text-amber-800",
  packed: "border-amber-200 bg-amber-50 text-amber-800",
  dispatched: "border-indigo-200 bg-indigo-50 text-indigo-800",
  pending_approval: "border-amber-200 bg-amber-50 text-amber-800",
  follow_up: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  lost: "border-rose-200 bg-rose-50 text-rose-800",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
  not_assigned: "border-slate-200 bg-slate-50 text-slate-600",
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return "Unknown"
  const key = String(status).trim().toLowerCase()
  if (STATUS_LABELS[key]) return STATUS_LABELS[key]
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status?: string | null
  label?: string
  className?: string
}) {
  const key = String(status || "").trim().toLowerCase()
  const text = label || formatStatusLabel(status)
  const tone = TONE_BY_STATUS[key] || "border-slate-200 bg-slate-50 text-slate-700"

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tone,
        className,
      )}
      aria-label={`Status: ${text}`}
    >
      <span className="sr-only">Status: </span>
      {text}
    </Badge>
  )
}
