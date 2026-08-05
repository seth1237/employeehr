export type RecentPage = {
  href: string
  label: string
  visitedAt: number
}

export type DashboardWidgetId =
  | "hr-overview"
  | "stock-summary"
  | "dispatch-summary"
  | "sales-analytics"
  | "attention"
  | "departments"

const RECENT_KEY = "admin_recent_pages"
const FAVORITES_KEY = "admin_favorite_pages"
const WIDGETS_KEY = "admin_dashboard_widgets"
const TOUR_KEY = "admin_sales_workflow_tour"
const LAST_VISIT_KEY = "admin_last_visit_at"

/** Re-show tour after this many days without opening admin */
export const TOUR_IDLE_DAYS = 14

const DEFAULT_WIDGETS: DashboardWidgetId[] = [
  "hr-overview",
  "sales-analytics",
  "dispatch-summary",
  "departments",
  "stock-summary",
  "attention",
]

export const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  "hr-overview": "HR overview metrics",
  "sales-analytics": "Sales & trends",
  "dispatch-summary": "Dispatch & activity",
  departments: "Departments & clients",
  "stock-summary": "Inventory summary",
  attention: "Stock risk center",
}

type TourRecord = {
  status: "active" | "dismissed" | "completed"
  step?: string
  lastShownAt?: number
  dismissedAt?: number
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

function daysBetween(a: number, b: number) {
  return Math.abs(a - b) / (1000 * 60 * 60 * 24)
}

export function trackRecentPage(href: string, label: string) {
  if (!href.startsWith("/admin")) return
  const current = readJson<RecentPage[]>(RECENT_KEY, [])
  const next = [
    { href, label, visitedAt: Date.now() },
    ...current.filter((p) => p.href !== href),
  ].slice(0, 8)
  writeJson(RECENT_KEY, next)
}

export function getRecentPages(): RecentPage[] {
  return readJson<RecentPage[]>(RECENT_KEY, [])
}

export function getFavoriteHrefs(): string[] {
  return readJson<string[]>(FAVORITES_KEY, [])
}

export function toggleFavorite(href: string): string[] {
  const current = getFavoriteHrefs()
  const next = current.includes(href)
    ? current.filter((h) => h !== href)
    : [...current, href]
  writeJson(FAVORITES_KEY, next)
  return next
}

export function isFavorite(href: string): boolean {
  return getFavoriteHrefs().includes(href)
}

export function getDashboardWidgetOrder(): DashboardWidgetId[] {
  const saved = readJson<DashboardWidgetId[]>(WIDGETS_KEY, DEFAULT_WIDGETS)
  const valid = saved.filter((id) => DEFAULT_WIDGETS.includes(id))
  const missing = DEFAULT_WIDGETS.filter((id) => !valid.includes(id))
  return [...valid, ...missing]
}

export function saveDashboardWidgetOrder(order: DashboardWidgetId[]) {
  writeJson(WIDGETS_KEY, order)
}

export function moveDashboardWidget(
  order: DashboardWidgetId[],
  id: DashboardWidgetId,
  direction: "up" | "down",
): DashboardWidgetId[] {
  const idx = order.indexOf(id)
  if (idx < 0) return order
  const swap = direction === "up" ? idx - 1 : idx + 1
  if (swap < 0 || swap >= order.length) return order
  const next = [...order]
  ;[next[idx], next[swap]] = [next[swap], next[idx]]
  saveDashboardWidgetOrder(next)
  return next
}

export type SalesTourStep =
  | "inventory"
  | "quotation"
  | "invoice"
  | "dispatch"
  | "completed"

function readTourRecord(): TourRecord | null {
  const raw = typeof window !== "undefined" ? localStorage.getItem(TOUR_KEY) : null
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    // Migrate legacy string step values
    if (typeof parsed === "string") {
      if (parsed === "completed") {
        return { status: "completed", dismissedAt: Date.now() }
      }
      return { status: "active", step: parsed, lastShownAt: Date.now() }
    }
    if (parsed && typeof parsed === "object" && parsed.status) {
      return parsed as TourRecord
    }
  } catch {
    // ignore
  }
  return null
}

function writeTourRecord(record: TourRecord) {
  writeJson(TOUR_KEY, record)
}

/** Call once per admin session to record activity and decide if tour should open. */
export function touchAdminVisitAndShouldShowTour(): {
  show: boolean
  step: SalesTourStep
} {
  const now = Date.now()
  const lastVisit = readJson<number | null>(LAST_VISIT_KEY, null)
  const idleDays = lastVisit ? daysBetween(now, lastVisit) : Number.POSITIVE_INFINITY
  writeJson(LAST_VISIT_KEY, now)

  const record = readTourRecord()

  // Brand new install — never seen the tour
  if (!record) {
    const hasHistory =
      Boolean(lastVisit) || getRecentPages().length > 0 || getFavoriteHrefs().length > 0
    // Returning users should not get a forced tour on this upgrade
    if (hasHistory) {
      writeTourRecord({ status: "dismissed", dismissedAt: now })
      return { show: false, step: "inventory" }
    }
    writeTourRecord({
      status: "active",
      step: "inventory",
      lastShownAt: now,
    })
    return { show: true, step: "inventory" }
  }

  if (record.status === "active") {
    const step = (record.step as SalesTourStep) || "inventory"
    if (step === "completed") {
      writeTourRecord({ status: "completed", dismissedAt: now })
      return { show: false, step: "inventory" }
    }
    return { show: true, step }
  }

  // Dismissed/completed: only re-show after long absence, once
  if (idleDays >= TOUR_IDLE_DAYS) {
    const lastShown = record.lastShownAt || record.dismissedAt || 0
    if (!lastShown || daysBetween(now, lastShown) >= TOUR_IDLE_DAYS) {
      writeTourRecord({
        status: "active",
        step: "inventory",
        lastShownAt: now,
      })
      return { show: true, step: "inventory" }
    }
  }

  return { show: false, step: "inventory" }
}

export function getSalesTourStep(): SalesTourStep | null {
  const record = readTourRecord()
  if (!record || record.status !== "active") return null
  const step = (record.step as SalesTourStep) || "inventory"
  return step === "completed" ? null : step
}

export function setSalesTourStep(step: SalesTourStep) {
  if (step === "completed") {
    writeTourRecord({ status: "completed", dismissedAt: Date.now() })
    return
  }
  const existing = readTourRecord()
  writeTourRecord({
    status: "active",
    step,
    lastShownAt: existing?.lastShownAt || Date.now(),
  })
}

export function dismissSalesTour() {
  writeTourRecord({
    status: "dismissed",
    dismissedAt: Date.now(),
    lastShownAt: Date.now(),
  })
}

export function labelForPath(pathname: string): string {
  const map: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/stock/add-inventory": "Add Inventory",
    "/admin/stock/quotations": "Quotations",
    "/admin/stock/invoices": "Invoices",
    "/admin/stock/dispatch": "Dispatch",
    "/admin/stock/sales": "Sales",
    "/admin/clients/clients-list": "Clients",
    "/admin/accounts/payments": "Payments",
  }
  if (map[pathname]) return map[pathname]
  const parts = pathname.split("/").filter(Boolean)
  const last = parts[parts.length - 1]
  if (last && last.length > 20) return "Record detail"
  return last
    ? last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Admin"
}
