export type PeriodKind = "weekly" | "monthly" | "quarterly"

export type PeriodWindow = {
  kind: PeriodKind
  from: Date
  to: Date
  label: string
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfWeekMonday(date: Date) {
  const start = startOfDay(date)
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  return start
}

export function currentPeriods(now = new Date()): Record<PeriodKind, PeriodWindow> {
  const weekFrom = startOfWeekMonday(now)
  const weekTo = new Date(weekFrom)
  weekTo.setDate(weekTo.getDate() + 7)

  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const quarterIndex = Math.floor(now.getMonth() / 3)
  const quarterFrom = new Date(now.getFullYear(), quarterIndex * 3, 1)
  const quarterTo = new Date(now.getFullYear(), quarterIndex * 3 + 3, 1)

  return {
    weekly: {
      kind: "weekly",
      from: weekFrom,
      to: weekTo,
      label: `Week of ${weekFrom.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`,
    },
    monthly: {
      kind: "monthly",
      from: monthFrom,
      to: monthTo,
      label: monthFrom.toLocaleDateString("en-KE", { month: "long", year: "numeric" }),
    },
    quarterly: {
      kind: "quarterly",
      from: quarterFrom,
      to: quarterTo,
      label: `Q${quarterIndex + 1} ${now.getFullYear()}`,
    },
  }
}

export function inPeriod(value: Date | string | undefined, window: PeriodWindow) {
  if (!value) return false
  const raw = String(value)
  const date = value instanceof Date ? value : new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw)
  if (Number.isNaN(date.getTime())) return false
  return date >= window.from && date < window.to
}

export function invoiceAmount(invoice: { grandTotal?: number; subTotal?: number }) {
  return Number(invoice.grandTotal || invoice.subTotal || 0)
}

export function isGeneratedInvoice(invoice: { status?: string }) {
  return (
    invoice.status === "draft" ||
    invoice.status === "issued" ||
    invoice.status === "paid" ||
    invoice.status === "pending_approval"
  )
}
