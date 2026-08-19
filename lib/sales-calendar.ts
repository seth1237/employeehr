export function weekOfMonth(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  return Math.ceil((date.getDate() + first.getDay()) / 7)
}

export function monthKey(dateStr: string) {
  return String(dateStr || "").slice(0, 7)
}

export function monthLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("en-KE", { month: "long", year: "numeric" })
}

export function dateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function shortDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}
