import { getUser } from "@/lib/auth"
import { getAdminSectionForPath } from "@/lib/admin-sections"

export const WALKTHROUGH_DESKTOP_MIN = 1024
export const SECTION_IDLE_DAYS = 14
export const REMINDER_COOLDOWN_DAYS = 14

export type WalkthroughPortal = "admin" | "sales" | "engineer"

export type WalkthroughState = {
  completed: boolean
  currentStep: number
  completedAt?: number
  skippedAt?: number
  lastShownAt?: number
  reminders: Record<string, number>
}

export type SectionReminder = {
  id: string
  title: string
  description: string
  href: string
  target: string
}

const SECTION_REMINDERS: SectionReminder[] = [
  {
    id: "CLIENTS",
    title: "CRM is waiting",
    description: "You have not opened clients, hospitals, or installed machines in a while. Start here when you need a customer record.",
    href: "/admin/clients/clients-list",
    target: "wt-section-CLIENTS",
  },
  {
    id: "INVENTORY MANAGER",
    title: "Inventory needs a look",
    description: "Quotations, invoices, and stock live here. Open inventory when you need to quote or check levels.",
    href: "/admin/stock/add-inventory",
    target: "wt-section-INVENTORY MANAGER",
  },
  {
    id: "ACCOUNTS",
    title: "Finance has been quiet",
    description: "Expenses, cash, and receivables have not been opened recently. A quick check keeps approvals moving.",
    href: "/admin/accounts",
    target: "wt-section-ACCOUNTS",
  },
  {
    id: "FIELD MANAGEMENT",
    title: "Field sales is idle",
    description: "Planner and visit reports have not been used lately. Open field management to review the team.",
    href: "/admin/field-management/planner",
    target: "wt-section-FIELD MANAGEMENT",
  },
  {
    id: "sales-quotes",
    title: "Time to follow up quotes",
    description: "Your quotations desk has been idle. Open quotes to chase pending customer approvals.",
    href: "/sales/quotes",
    target: "wt-section-sales-quotes",
  },
  {
    id: "engineering",
    title: "Work orders need attention",
    description: "You have not opened jobs or machines recently. Start from work orders when you are back in the field.",
    href: "/engineer/work-orders",
    target: "wt-section-engineering",
  },
]

function storageKey(kind: "state" | "visits", userId: string, portal: WalkthroughPortal) {
  return `elevate_walkthrough_${kind}_${portal}_${userId}`
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

function daysSince(ts?: number) {
  if (!ts) return Number.POSITIVE_INFINITY
  return (Date.now() - ts) / (1000 * 60 * 60 * 24)
}

export function isDesktopWalkthrough() {
  return typeof window !== "undefined" && window.innerWidth >= WALKTHROUGH_DESKTOP_MIN
}

export function walkthroughUserId() {
  const user = getUser()
  return user?._id || user?.userId || user?.email || "anonymous"
}

export function getWalkthroughState(portal: WalkthroughPortal): WalkthroughState {
  const userId = walkthroughUserId()
  return readJson<WalkthroughState>(storageKey("state", userId, portal), {
    completed: false,
    currentStep: 0,
    reminders: {},
  })
}

export function saveWalkthroughState(portal: WalkthroughPortal, state: WalkthroughState) {
  writeJson(storageKey("state", walkthroughUserId(), portal), state)
}

export function recordSectionVisit(pathname: string, portal: WalkthroughPortal) {
  const userId = walkthroughUserId()
  const visits = readJson<Record<string, number>>(storageKey("visits", userId, portal), {})
  const now = Date.now()

  if (portal === "admin") {
    const section = getAdminSectionForPath(pathname)
    if (section) visits[section] = now
  }
  if (pathname.startsWith("/sales/quotes")) visits["sales-quotes"] = now
  if (pathname.startsWith("/engineer/work-orders") || pathname.startsWith("/engineer/machines")) {
    visits["engineering"] = now
  }
  if (pathname.startsWith("/admin/clients")) visits.CLIENTS = now
  if (pathname.startsWith("/admin/stock")) visits["INVENTORY MANAGER"] = now
  if (pathname.startsWith("/admin/accounts")) visits.ACCOUNTS = now

  writeJson(storageKey("visits", userId, portal), visits)
}

function getSectionVisits(portal: WalkthroughPortal) {
  return readJson<Record<string, number>>(storageKey("visits", walkthroughUserId(), portal), {})
}

export function shouldStartFirstTour(portal: WalkthroughPortal) {
  const state = getWalkthroughState(portal)
  return !state.completed && !state.skippedAt
}

export function getIgnoredSectionReminder(portal: WalkthroughPortal): SectionReminder | null {
  const state = getWalkthroughState(portal)
  if (!state.completed && !state.skippedAt) return null

  const visits = getSectionVisits(portal)
  const available = SECTION_REMINDERS.filter((section) => {
    if (portal === "admin") {
      return !["sales-quotes", "engineering"].includes(section.id)
    }
    if (portal === "sales") return section.id === "sales-quotes"
    return section.id === "engineering"
  })

  const knownSince = state.completedAt || state.skippedAt
  for (const section of available) {
    const lastSeen = visits[section.id] ?? knownSince
    const lastReminded = state.reminders?.[section.id]
    if (daysSince(lastSeen) >= SECTION_IDLE_DAYS && daysSince(lastReminded) >= REMINDER_COOLDOWN_DAYS) {
      return section
    }
  }
  return null
}

export function markSectionReminded(portal: WalkthroughPortal, sectionId: string) {
  const state = getWalkthroughState(portal)
  saveWalkthroughState(portal, {
    ...state,
    reminders: { ...(state.reminders || {}), [sectionId]: Date.now() },
    lastShownAt: Date.now(),
  })
}

export function completeWalkthrough(portal: WalkthroughPortal) {
  const state = getWalkthroughState(portal)
  saveWalkthroughState(portal, {
    ...state,
    completed: true,
    currentStep: 0,
    completedAt: Date.now(),
    lastShownAt: Date.now(),
  })
}

export function skipWalkthrough(portal: WalkthroughPortal) {
  const state = getWalkthroughState(portal)
  saveWalkthroughState(portal, {
    ...state,
    completed: false,
    skippedAt: Date.now(),
    lastShownAt: Date.now(),
  })
}

export function resetWalkthrough(portal: WalkthroughPortal) {
  saveWalkthroughState(portal, {
    completed: false,
    currentStep: 0,
    reminders: getWalkthroughState(portal).reminders || {},
    lastShownAt: Date.now(),
  })
}

export const START_WALKTHROUGH_EVENT = "elevate-start-walkthrough"

export function requestWalkthroughReplay(portal: WalkthroughPortal) {
  if (typeof window === "undefined") return
  resetWalkthrough(portal)
  window.dispatchEvent(new CustomEvent(START_WALKTHROUGH_EVENT, { detail: { portal } }))
}
