import { ADMIN_SECTION_OPTIONS, type AdminSection } from "@/lib/admin-sections"

/** Historical owner checkboxes before modules matched admin sidebar sections. */
export const LEGACY_OWNER_PAGES = [
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
] as const

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

/** Canonical admin sections this company may use. Empty array = none. */
export function resolveEnabledAdminSections(pages?: string[] | null): AdminSection[] {
  if (!Array.isArray(pages)) return [...ADMIN_SECTION_OPTIONS]
  if (pages.length === 0) return []
  if (isLegacyFullAccess(pages) || isFullSectionAccess(pages)) return [...ADMIN_SECTION_OPTIONS]

  const enabled = new Set<AdminSection>()
  for (const page of pages) {
    if (SECTION_SET.has(page)) enabled.add(page as AdminSection)
    else if (LEGACY_PAGE_TO_SECTION[page]) enabled.add(LEGACY_PAGE_TO_SECTION[page])
  }
  return ADMIN_SECTION_OPTIONS.filter((section) => enabled.has(section))
}

export function isPlatformModuleCap(pages?: string[] | null) {
  const sections = resolveEnabledAdminSections(pages)
  return sections.length > 0 && sections.length < ADMIN_SECTION_OPTIONS.length
}

export const ADMIN_SECTION_HOME: Record<string, string> = {
  CORE: "/admin",
  RECRUITMENT: "/admin/jobs",
  "EMPLOYEE MANAGEMENT": "/admin/attendance",
  "INVENTORY MANAGER": "/admin/stock",
  IMPORTATION: "/admin/stock/importation",
  CLIENTS: "/admin/clients",
  "FIELD MANAGEMENT": "/admin/field-management",
  FLEET: "/admin/fleet",
  ACCOUNTS: "/admin/accounts",
  PERFORMANCE: "/admin/kpis",
  SYSTEM: "/admin/settings/company",
}

export function firstAllowedAdminPath(sections: Iterable<string>) {
  for (const section of ADMIN_SECTION_OPTIONS) {
    if (new Set(sections).has(section) && ADMIN_SECTION_HOME[section]) {
      return ADMIN_SECTION_HOME[section]
    }
  }
  return "/admin"
}
