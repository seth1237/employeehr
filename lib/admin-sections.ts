/** Canonical admin sidebar / page-access sections (keep in sync with server). */
export const ADMIN_SECTION_OPTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "CLIENTS",
  "FLEET",
  "IMPORTATION",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
] as const

export type AdminSection = (typeof ADMIN_SECTION_OPTIONS)[number]

/** Sections that existed before CLIENTS / FLEET / IMPORTATION were added. */
export const LEGACY_ADMIN_SECTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
] as const

export const ADMIN_ROLES = ["company_admin", "admin", "hr", "super_admin"] as const

export const isAdminRole = (role?: string | null): boolean =>
  !!role && (ADMIN_ROLES as readonly string[]).includes(role)

export const ADMIN_SECTION_PATHS: Array<{
  section: AdminSection | string
  match: (path: string) => boolean
}> = [
  {
    section: "CORE",
    match: (path) => path === "/admin" || path.startsWith("/admin/users"),
  },
  {
    section: "RECRUITMENT",
    match: (path) =>
      ["/admin/jobs", "/admin/applications", "/admin/analytics", "/admin/communications"].some(
        (prefix) => path.startsWith(prefix),
      ),
  },
  {
    section: "EMPLOYEE MANAGEMENT",
    match: (path) =>
      [
        "/admin/leave",
        "/admin/attendance",
        "/admin/payroll",
        "/admin/meetings",
        "/admin/bookings",
        "/admin/suggestions",
        "/admin/badges",
        "/admin/polls",
        "/admin/contracts",
        "/admin/alerts",
        "/admin/allocations",
      ].some((prefix) => path.startsWith(prefix)),
  },
  {
    section: "INVENTORY MANAGER",
    match: (path) =>
      path.startsWith("/admin/stock") && !path.startsWith("/admin/stock/importation"),
  },
  {
    section: "IMPORTATION",
    match: (path) => path.startsWith("/admin/stock/importation"),
  },
  { section: "CLIENTS", match: (path) => path.startsWith("/admin/clients") },
  { section: "FLEET", match: (path) => path.startsWith("/admin/fleet") },
  { section: "ACCOUNTS", match: (path) => path.startsWith("/admin/accounts") },
  {
    section: "PERFORMANCE",
    match: (path) =>
      ["/admin/kpis", "/admin/feedback-360", "/admin/reports"].some((prefix) =>
        path.startsWith(prefix),
      ),
  },
  {
    section: "SYSTEM",
    match: (path) =>
      ["/admin/settings", "/admin/stamps"].some((prefix) => path.startsWith(prefix)),
  },
]

export const getAdminSectionForPath = (path: string): string | null => {
  const rule = ADMIN_SECTION_PATHS.find((entry) => entry.match(path))
  return rule?.section || null
}

/**
 * Resolve which sections a user may see.
 * Returns null = unrestricted (show everything).
 */
export function resolveAdminAllowedSections(params: {
  role?: string | null
  userId?: string | null
  pageAccess?: {
    effectiveSections?: string[]
    adminSectionsByRole?: Record<string, string[]>
    adminSectionsByUser?: Record<string, string[]>
  } | null
}): Set<string> | null {
  const role = params.role || ""
  if (!role || role === "company_admin" || role === "super_admin") {
    return null
  }

  const data = params.pageAccess
  if (!data) return null

  const userId = params.userId || ""
  const fromEffective = Array.isArray(data.effectiveSections)
    ? data.effectiveSections
    : []
  const fromRole = data.adminSectionsByRole?.[role] || []
  const fromUser = userId ? data.adminSectionsByUser?.[userId] || [] : []

  const merged = Array.from(
    new Set(
      (fromEffective.length > 0
        ? fromEffective
        : [...fromRole, ...fromUser]
      ).filter((s): s is string => typeof s === "string" && s.length > 0),
    ),
  )

  // Admin-area roles with no configured sections: show everything (fail open).
  if (merged.length === 0 && (role === "admin" || role === "hr")) {
    return null
  }

  if (merged.length === 0) {
    return new Set(["CORE"])
  }

  return new Set(["CORE", ...merged])
}
