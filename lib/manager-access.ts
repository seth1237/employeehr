import { BarChart3, CheckCircle2, Clock, FileText, MessageSquare, Target, Users, Wallet, BookOpen, Briefcase, FileSearch, Mail, Send } from "lucide-react"
import { companyApi } from "@/lib/api"
import { getUser } from "@/lib/auth"

export const MANAGER_SECTION_OPTIONS = [
  "CORE",
  "EMPLOYEE MANAGEMENT",
  "PERFORMANCE",
  "FINANCE",
  "INVENTORY MANAGER",
  "CLIENTS",
  "FLEET",
  "COMMUNICATIONS",
]

export const MANAGER_MENU_ITEMS = [
  { label: "Dashboard", icon: BarChart3, href: "/manager", section: "CORE" },
  { label: "Employees", icon: Users, href: "/manager/team", section: "EMPLOYEE MANAGEMENT" },
  { label: "Approvals", icon: CheckCircle2, href: "/manager/approvals", section: "EMPLOYEE MANAGEMENT" },
  { label: "Leave Requests", icon: Clock, href: "/manager/leave-requests", section: "EMPLOYEE MANAGEMENT" },
  { label: "Feedback", icon: MessageSquare, href: "/manager/feedback", section: "EMPLOYEE MANAGEMENT" },
  { label: "Performance", icon: Target, href: "/manager/performance", section: "PERFORMANCE" },
  { label: "Reports", icon: FileText, href: "/manager/reports", section: "PERFORMANCE" },
  { label: "PDP Reviews", icon: FileSearch, href: "/manager/pdp-reviews", section: "PERFORMANCE" },
  { label: "Evaluations", icon: FileText, href: "/manager/evaluations", section: "PERFORMANCE" },
  { label: "Finance", icon: Wallet, href: "/manager/fees", section: "FINANCE" },
  { label: "Resources", icon: BookOpen, href: "/manager/resources", section: "INVENTORY MANAGER" },
  { label: "Document Library", icon: BookOpen, href: "/manager/library", section: "INVENTORY MANAGER" },
  { label: "Documents & Exams", icon: FileText, href: "/manager/examinations", section: "INVENTORY MANAGER" },
  { label: "Operations", icon: Briefcase, href: "/manager/supervision", section: "EMPLOYEE MANAGEMENT" },
  { label: "Messages", icon: Mail, href: "/manager/messages", section: "COMMUNICATIONS" },
  { label: "Send Message", icon: Send, href: "/manager/messages/send", section: "COMMUNICATIONS" },
]

const SECTION_ALIASES: Record<string, string> = {
  core: "CORE",
  dashboard: "CORE",
  "employee management": "EMPLOYEE MANAGEMENT",
  employees: "EMPLOYEE MANAGEMENT",
  team: "EMPLOYEE MANAGEMENT",
  teammembers: "EMPLOYEE MANAGEMENT",
  performance: "PERFORMANCE",
  kpi: "PERFORMANCE",
  kpis: "PERFORMANCE",
  finance: "FINANCE",
  fees: "FINANCE",
  payroll: "FINANCE",
  "inventory manager": "INVENTORY MANAGER",
  inventory: "INVENTORY MANAGER",
  clients: "CLIENTS",
  client: "CLIENTS",
  fleet: "FLEET",
  vehicles: "FLEET",
}

const normalizeSection = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const direct = trimmed.toUpperCase()
  if (MANAGER_SECTION_OPTIONS.includes(direct)) return direct

  const compact = trimmed.toLowerCase().replace(/[^a-z]/g, "")
  return SECTION_ALIASES[compact] || SECTION_ALIASES[trimmed.toLowerCase()] || null
}

export const getManagerSectionForPath = (path: string): string | null => {
  const item = MANAGER_MENU_ITEMS.find((entry) => path === entry.href || path.startsWith(`${entry.href}/`))
  return item?.section || null
}

export const getManagerAllowedSections = async (): Promise<Set<string> | null> => {
  const user = getUser()
  const role = user?.role

  if (!role || role === "company_admin" || role === "hr" || role === "employee") {
    return null
  }

  const userId = user?._id || (user as any)?.userId

  try {
    const [pageAccessResult, deptsResult] = await Promise.allSettled([
      companyApi.getPageAccess(),
      companyApi.getDepartments(),
    ])

    const pageAccessRes = pageAccessResult.status === "fulfilled" ? pageAccessResult.value : null
    const deptsRes = deptsResult.status === "fulfilled" ? deptsResult.value : null

    const effectiveSections = pageAccessRes?.success && Array.isArray(pageAccessRes.data?.effectiveSections)
      ? pageAccessRes.data.effectiveSections.map(normalizeSection).filter(Boolean) as string[]
      : []
    const roleSections = pageAccessRes?.success ? (pageAccessRes.data?.adminSectionsByRole?.[role] || []).map(normalizeSection).filter(Boolean) as string[] : []
    const userSections = userId && pageAccessRes?.success ? (pageAccessRes.data?.adminSectionsByUser?.[userId] || []).map(normalizeSection).filter(Boolean) as string[] : []

    const deptSections = new Set<string>()
    if (deptsRes?.success && Array.isArray(deptsRes.data) && userId) {
      deptsRes.data.forEach((dept: any) => {
        if (String(dept?.managerId || "") === String(userId) && Array.isArray(dept?.sidebarSections)) {
          dept.sidebarSections.forEach((section: string) => {
            const normalized = normalizeSection(section)
            if (normalized) deptSections.add(normalized)
          })
        }
      })
    }

    // If we have explicit sections configured, use them. Otherwise default to all sections.
    const allConfigured = [...effectiveSections, ...roleSections, ...userSections, ...Array.from(deptSections)]
    const hasExplicitConfig = allConfigured.length > 0 || 
      (deptsRes?.success && Array.isArray(deptsRes.data) && deptsRes.data.some((d: any) => d.sidebarSections?.length))

    if (hasExplicitConfig) {
      const effective = new Set<string>(["CORE", ...allConfigured])
      return effective
    } else {
      // No sections configured - default to showing all manager sections
      return new Set<string>(MANAGER_SECTION_OPTIONS)
    }
  } catch {
    // On error, show all sections by default
    return new Set<string>(MANAGER_SECTION_OPTIONS)
  }
}
