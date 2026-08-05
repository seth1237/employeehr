import type { IJWTPayload } from "../../types/interfaces"
import { Company } from "../../models/Company"

export type AssistantOrgContext = {
  orgId: string
  userId: string
  role: string
  userName: string
  companyName: string
  timezone: string
}

export async function buildOrgContext(user: IJWTPayload): Promise<AssistantOrgContext> {
  let companyName = "Your Company"
  try {
    if (user.org_id) {
      const company = await Company.findById(user.org_id).select("name").lean()
      if (company?.name) companyName = company.name
    }
  } catch {
    // Non-fatal: fall back to generic name
  }

  return {
    orgId: String(user.org_id || ""),
    userId: String(user.userId || ""),
    role: String(user.role || "employee"),
    userName: String(user.email || "User").split("@")[0] || "User",
    companyName,
    timezone: "Africa/Nairobi", // Default timezone; extend this if stored per-company
  }
}

// ─── Date helpers ────────────────────────────────────────────────────────────

export function parseIsoDate(value: string | undefined, fallback: Date): Date {
  if (!value?.trim()) return fallback
  const parsed = new Date(value.trim())
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

// ── Month ──────────────────────────────────────────────────────────────────

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

export function startOfLastMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1, 0, 0, 0, 0))
}

export function endOfLastMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0, 23, 59, 59, 999))
}

// ── Year ──────────────────────────────────────────────────────────────────

export function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
}

export function endOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999))
}

export function startOfLastYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear() - 1, 0, 1, 0, 0, 0, 0))
}

export function endOfLastYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999))
}

// ── Quarter ──────────────────────────────────────────────────────────────────

/** Returns the calendar quarter (1-4) for a given UTC date. */
export function getQuarter(date: Date): number {
  return Math.floor(date.getUTCMonth() / 3) + 1
}

export function startOfQuarter(date: Date): Date {
  const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3
  return new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1, 0, 0, 0, 0))
}

export function endOfQuarter(date: Date): Date {
  const quarterEndMonth = Math.floor(date.getUTCMonth() / 3) * 3 + 2
  return new Date(Date.UTC(date.getUTCFullYear(), quarterEndMonth + 1, 0, 23, 59, 59, 999))
}

export function startOfLastQuarter(date: Date): Date {
  const currentQuarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3
  // Go back 3 months from start of current quarter
  return new Date(Date.UTC(date.getUTCFullYear(), currentQuarterStartMonth - 3, 1, 0, 0, 0, 0))
}

export function endOfLastQuarter(date: Date): Date {
  const currentQuarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3
  // End of month before current quarter start
  return new Date(Date.UTC(date.getUTCFullYear(), currentQuarterStartMonth, 0, 23, 59, 59, 999))
}

// ── Week ──────────────────────────────────────────────────────────────────

/** Start of the current ISO week (Monday). */
export function startOfWeek(date: Date): Date {
  const day = date.getUTCDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  const d = new Date(date)
  d.setUTCDate(date.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** End of the current ISO week (Sunday). */
export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

export function startOfLastWeek(date: Date): Date {
  const start = startOfWeek(date)
  const last = new Date(start)
  last.setUTCDate(start.getUTCDate() - 7)
  return last
}

export function endOfLastWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() - 1)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

// ── Formatters ────────────────────────────────────────────────────────────

/** Format: June 2026 */
export function formatMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
}

/** Format: Q2 2026 */
export function formatQuarterLabel(date: Date): string {
  return `Q${getQuarter(date)} ${date.getUTCFullYear()}`
}

/** Format: Week of Jun 16 – Jun 22, 2026 */
export function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" }
  return `Week of ${start.toLocaleString("en-US", opts)} – ${end.toLocaleString("en-US", { ...opts, year: "numeric" })}`
}