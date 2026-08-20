export const ADMIN_SECTION_OPTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "FIELD MANAGEMENT",
  "CLIENTS",
  "FLEET",
  "IMPORTATION",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
] as const

export type AdminSection = (typeof ADMIN_SECTION_OPTIONS)[number]

const LEGACY_OWNER_PAGES = [
  "dashboard",
  "attendance",
  "leave",
  "performance",
  "kpis",
  "feedback",
  "meetings",
  "stock",
  "payroll",
  "recruitment",
  "communications",
  "reports",
]

const LEGACY_PAGE_TO_SECTION: Record<string, AdminSection> = {
  dashboard: "CORE",
  attendance: "EMPLOYEE MANAGEMENT",
  leave: "EMPLOYEE MANAGEMENT",
  payroll: "EMPLOYEE MANAGEMENT",
  meetings: "EMPLOYEE MANAGEMENT",
  performance: "PERFORMANCE",
  kpis: "PERFORMANCE",
  feedback: "PERFORMANCE",
  reports: "PERFORMANCE",
  recruitment: "RECRUITMENT",
  communications: "RECRUITMENT",
  stock: "INVENTORY MANAGER",
  clients: "CLIENTS",
  field: "FIELD MANAGEMENT",
  fleet: "FLEET",
  importation: "IMPORTATION",
  accounts: "ACCOUNTS",
  system: "SYSTEM",
}

const SECTION_SET = new Set<string>(ADMIN_SECTION_OPTIONS)

function isLegacyFullAccess(pages: string[]) {
  return (
    pages.length === LEGACY_OWNER_PAGES.length &&
    LEGACY_OWNER_PAGES.every((page) => pages.includes(page))
  )
}

function isFullSectionAccess(pages: string[]) {
  return (
    pages.length === ADMIN_SECTION_OPTIONS.length &&
    ADMIN_SECTION_OPTIONS.every((section) => pages.includes(section))
  )
}

export function resolveEnabledAdminSections(pages?: string[] | null): string[] {
  if (!Array.isArray(pages)) return [...ADMIN_SECTION_OPTIONS]
  if (pages.length === 0) return []
  if (isLegacyFullAccess(pages) || isFullSectionAccess(pages)) return [...ADMIN_SECTION_OPTIONS]

  const enabled = new Set<string>()
  for (const page of pages) {
    if (SECTION_SET.has(page)) enabled.add(page)
    else if (LEGACY_PAGE_TO_SECTION[page]) enabled.add(LEGACY_PAGE_TO_SECTION[page])
  }
  return ADMIN_SECTION_OPTIONS.filter((section) => enabled.has(section))
}

export function sanitizeEnabledPages(pages: unknown): string[] {
  if (!Array.isArray(pages)) return [...ADMIN_SECTION_OPTIONS]
  const raw = pages.filter((item): item is string => typeof item === "string")
  return resolveEnabledAdminSections(raw)
}
