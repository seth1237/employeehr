import type { Response } from "express"
import { randomUUID } from "crypto"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import { User } from "../models/User"
import AuditLog from "../models/AuditLog"
import { StockInvoice } from "../models/StockInvoice"
import { StockProduct } from "../models/StockProduct"
import { StockClient } from "../models/StockClient"
import { StockQuotation } from "../models/StockQuotation"
import { Attendance } from "../models/Attendance"
import { Meeting } from "../models/Meeting"
import { LeaveRequest } from "../models/LeaveRequest"
import { OwnerActionOtp } from "../models/OwnerActionOtp"
import { isPlatformOwner } from "../utils/platformOwner"
import { emailService } from "../services/emailService"
import { companyDeleteOtpEmail } from "../lib/email-templates"
import { permanentlyDeleteCompany } from "../services/companyDeletionService"
import { sanitizeEnabledPages } from "../lib/enabledPages"

const COMPANY_DELETE_OTP_EMAIL = String(
  process.env.COMPANY_DELETE_OTP_EMAIL || "info@elevatehub.co.ke",
)
  .trim()
  .toLowerCase()

const COMPANY_DELETE_OTP_MINUTES = 10

function requireOwner(req: AuthenticatedRequest, res: Response) {
  if (!isPlatformOwner(req.user?.email, req.user?.role)) {
    res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
    return false
  }
  return true
}

const BYTES_PER_DOC: Record<string, number> = {
  users: 2_500,
  invoices: 4_000,
  products: 1_800,
  clients: 1_200,
  quotations: 3_500,
  attendance: 600,
  meetings: 2_000,
  leave: 900,
  audit: 800,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

async function countByOrg(model: any): Promise<Map<string, number>> {
  const rows = await model.aggregate([
    { $group: { _id: "$org_id", count: { $sum: 1 } } },
  ])
  return new Map(rows.map((r: any) => [String(r._id), Number(r.count) || 0]))
}

export class OwnerController {
  /**
   * Get all companies with their details
   */
  static async getAllCompanies(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      console.log("📊 [OwnerController] Fetching all companies...")

      const companies = await Company.find()
        .lean()
        .sort({ createdAt: -1 })

      console.log(`✅ [OwnerController] Found ${companies.length} companies`)

      // Map to include all needed fields with defaults
      const companiesData = companies.map((company: any) => ({
        _id: company._id?.toString(),
        name: company.name,
        email: company.email,
        slug: company.slug,
        phone: company.phone,
        industry: company.industry,
        status: company.status,
        subscription: company.subscription,
        isFrozen: company.isFrozen || false,
        frozenReason: company.frozenReason,
        frozenAt: company.frozenAt,
        enabledPages: company.enabledPages || [],
        pageAccessSettings: company.pageAccessSettings,
        maxEmployees: company.maxEmployees || 100,
        employeeCount: company.employeeCount || 0,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        primaryColor: company.primaryColor,
        logo: company.logo,
      }))

      return res.json({
        success: true,
        data: companiesData,
        total: companiesData.length,
      })
    } catch (error) {
      console.error("❌ [OwnerController] Error fetching companies:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch companies",
        error: process.env.NODE_ENV === "development" ? (error as any).message : undefined,
      })
    }
  }

  /**
   * Freeze a company account
   */
  static async freezeCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId, reason } = req.body

      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required" })
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          isFrozen: true,
          frozenReason: reason || "Account frozen by system owner",
          frozenAt: new Date(),
          frozenBy: userEmail,
        },
        { new: true },
      )

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Company account frozen successfully",
        data: company,
      })
    } catch (error) {
      console.error("Error freezing company:", error)
      return res.status(500).json({ success: false, message: "Failed to freeze company" })
    }
  }

  /**
   * Unfreeze a company account
   */
  static async unfreezeCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId } = req.body

      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required" })
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          isFrozen: false,
          frozenReason: null,
          frozenAt: null,
          frozenBy: null,
        },
        { new: true },
      )

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Company account unfrozen successfully",
        data: company,
      })
    } catch (error) {
      console.error("Error unfreezing company:", error)
      return res.status(500).json({ success: false, message: "Failed to unfreeze company" })
    }
  }

  /**
   * Update enabled pages for a company
   */
  static async updateCompanyPages(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId } = req.body

      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required" })
      }

      const enabledPages = sanitizeEnabledPages(req.body.enabledPages)

      const company = await Company.findByIdAndUpdate(
        companyId,
        { enabledPages },
        { new: true },
      )

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Company pages updated successfully",
        data: company,
      })
    } catch (error) {
      console.error("Error updating company pages:", error)
      return res.status(500).json({ success: false, message: "Failed to update company pages" })
    }
  }

  /**
   * Get single company details
   */
  static async getCompanyDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId } = req.params

      const company = await Company.findById(companyId)

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        data: company,
      })
    } catch (error) {
      console.error("Error fetching company details:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch company details" })
    }
  }

  /**
   * SaaS platform insights for the system owner
   */
  static async getPlatformInsights(req: AuthenticatedRequest, res: Response) {
    try {
      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const now = new Date()
      const todayStart = startOfDay(now)
      const weekAgo = daysAgo(7)
      const twoWeeksAgo = daysAgo(14)
      const monthAgo = daysAgo(30)
      const twoMonthsAgo = daysAgo(60)

      const [
        companies,
        users,
        invoiceByOrg,
        productByOrg,
        clientByOrg,
        quotationByOrg,
        attendanceByOrg,
        meetingByOrg,
        leaveByOrg,
        auditByOrg,
        moduleViews,
        recentAudit,
        invoicesThisMonth,
        invoicesLastMonth,
        newCompaniesThisMonth,
        newCompaniesLastMonth,
      ] = await Promise.all([
        Company.find().lean(),
        User.find({}, "org_id firstName lastName email role lastLoginAt lastActiveAt createdAt status").lean(),
        countByOrg(StockInvoice),
        countByOrg(StockProduct),
        countByOrg(StockClient),
        countByOrg(StockQuotation),
        countByOrg(Attendance),
        countByOrg(Meeting),
        countByOrg(LeaveRequest),
        countByOrg(AuditLog),
        AuditLog.aggregate([
          { $match: { action: "view", timestamp: { $gte: monthAgo } } },
          { $group: { _id: "$resource", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 12 },
        ]),
        AuditLog.find({})
          .sort({ timestamp: -1 })
          .limit(25)
          .select("org_id userId action resource details timestamp")
          .lean(),
        StockInvoice.countDocuments({ createdAt: { $gte: monthAgo } }),
        StockInvoice.countDocuments({ createdAt: { $gte: twoMonthsAgo, $lt: monthAgo } }),
        Company.countDocuments({ createdAt: { $gte: monthAgo } }),
        Company.countDocuments({ createdAt: { $gte: twoMonthsAgo, $lt: monthAgo } }),
      ])

      const companyMap = new Map(companies.map((c: any) => [String(c._id), c]))
      const totalCompanies = companies.length
      const activeCompanies = companies.filter((c: any) => !c.isFrozen && c.status !== "inactive").length
      const frozenCompanies = companies.filter((c: any) => c.isFrozen).length

      const activeTodayUsers = users.filter((u: any) => {
        const t = u.lastActiveAt || u.lastLoginAt
        return t && new Date(t) >= todayStart
      })
      const activeTodayOrgs = new Set(activeTodayUsers.map((u: any) => String(u.org_id)))
      const monthlyActiveUsers = users.filter((u: any) => {
        const t = u.lastActiveAt || u.lastLoginAt
        return t && new Date(t) >= monthAgo
      })
      const monthlyActiveOrgs = new Set(monthlyActiveUsers.map((u: any) => String(u.org_id)))
      const onlineUsers = users.filter((u: any) => {
        return u.lastActiveAt && now.getTime() - new Date(u.lastActiveAt).getTime() < 5 * 60 * 1000
      })

      // Per-tenant usage / estimated storage
      const tenantUsage = companies.map((c: any) => {
        const orgId = String(c._id)
        const counts = {
          users: users.filter((u: any) => String(u.org_id) === orgId).length,
          invoices: invoiceByOrg.get(orgId) || 0,
          products: productByOrg.get(orgId) || 0,
          clients: clientByOrg.get(orgId) || 0,
          quotations: quotationByOrg.get(orgId) || 0,
          attendance: attendanceByOrg.get(orgId) || 0,
          meetings: meetingByOrg.get(orgId) || 0,
          leave: leaveByOrg.get(orgId) || 0,
          audit: auditByOrg.get(orgId) || 0,
        }
        const bytes =
          counts.users * BYTES_PER_DOC.users +
          counts.invoices * BYTES_PER_DOC.invoices +
          counts.products * BYTES_PER_DOC.products +
          counts.clients * BYTES_PER_DOC.clients +
          counts.quotations * BYTES_PER_DOC.quotations +
          counts.attendance * BYTES_PER_DOC.attendance +
          counts.meetings * BYTES_PER_DOC.meetings +
          counts.leave * BYTES_PER_DOC.leave +
          counts.audit * BYTES_PER_DOC.audit

        const orgUsers = users.filter((u: any) => String(u.org_id) === orgId)
        const lastActivity = orgUsers.reduce((latest: Date | null, u: any) => {
          const t = u.lastActiveAt || u.lastLoginAt
          if (!t) return latest
          const d = new Date(t)
          return !latest || d > latest ? d : latest
        }, null as Date | null)

        const daysSinceActive = lastActivity
          ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          : 999

        // Module adoption from enabled pages
        const pages: string[] = Array.isArray(c.enabledPages) ? c.enabledPages : []
        const moduleFlags = {
          stock: pages.includes("stock") || counts.products > 0 || counts.invoices > 0,
          hr: pages.includes("attendance") || pages.includes("leave") || pages.includes("payroll") || counts.attendance > 0,
          meetings: pages.includes("meetings") || counts.meetings > 0,
          reports: pages.includes("reports"),
          performance: pages.includes("performance") || pages.includes("kpis"),
          recruitment: pages.includes("recruitment"),
          communications: pages.includes("communications"),
        }
        const moduleScore =
          (Object.values(moduleFlags).filter(Boolean).length / Object.keys(moduleFlags).length) * 100

        // Health score 0-100
        let health = 40
        if (daysSinceActive <= 1) health += 25
        else if (daysSinceActive <= 7) health += 15
        else if (daysSinceActive <= 14) health += 5
        else health -= 20
        health += Math.min(20, counts.invoices > 0 ? 10 + Math.min(10, counts.invoices / 50) : 0)
        health += Math.min(15, moduleScore * 0.15)
        health += Math.min(10, counts.users * 2)
        if (c.isFrozen) health = Math.min(health, 15)
        health = Math.max(0, Math.min(100, Math.round(health)))

        const risk: "low" | "medium" | "high" =
          c.isFrozen || daysSinceActive > 14 ? "high" : daysSinceActive > 7 ? "medium" : "low"

        return {
          orgId,
          name: c.name,
          industry: c.industry || "Other",
          city: c.city || null,
          country: c.country || null,
          subscription: c.subscription || "free",
          isFrozen: !!c.isFrozen,
          createdAt: c.createdAt,
          counts,
          estimatedBytes: bytes,
          estimatedStorage: formatBytes(bytes),
          lastActivity,
          daysSinceActive,
          healthScore: health,
          risk,
          maturityScore: Math.round(moduleScore),
          modules: moduleFlags,
        }
      })

      const totalEstimatedBytes = tenantUsage.reduce((s, t) => s + t.estimatedBytes, 0)
      const topStorage = [...tenantUsage].sort((a, b) => b.estimatedBytes - a.estimatedBytes).slice(0, 10)
      const storageShare = topStorage.map((t) => ({
        name: t.name,
        bytes: t.estimatedBytes,
        label: t.estimatedStorage,
        percent: totalEstimatedBytes > 0 ? Math.round((t.estimatedBytes / totalEstimatedBytes) * 100) : 0,
        breakdown: {
          invoices: t.counts.invoices,
          products: t.counts.products,
          users: t.counts.users,
          clients: t.counts.clients,
          audit: t.counts.audit,
        },
      }))

      // Growing companies (users created in last 30 days vs prior)
      const growing = tenantUsage
        .map((t) => {
          const recentUsers = users.filter(
            (u: any) => String(u.org_id) === t.orgId && u.createdAt && new Date(u.createdAt) >= monthAgo,
          ).length
          return { ...t, userGrowth: recentUsers }
        })
        .filter((t) => t.userGrowth > 0)
        .sort((a, b) => b.userGrowth - a.userGrowth)
        .slice(0, 8)

      const churnRisk = tenantUsage
        .filter((t) => !t.isFrozen && t.daysSinceActive >= 14)
        .sort((a, b) => b.daysSinceActive - a.daysSinceActive)
        .slice(0, 12)

      const healthDistribution = {
        healthy: tenantUsage.filter((t) => t.healthScore >= 70).length,
        watch: tenantUsage.filter((t) => t.healthScore >= 40 && t.healthScore < 70).length,
        atRisk: tenantUsage.filter((t) => t.healthScore < 40).length,
      }

      // Module adoption across companies
      const moduleKeys = ["stock", "hr", "meetings", "reports", "performance", "recruitment", "communications"] as const
      const moduleAdoption = moduleKeys.map((key) => {
        const using = tenantUsage.filter((t) => (t.modules as any)[key]).length
        return {
          module: key,
          companies: using,
          percent: totalCompanies > 0 ? Math.round((using / totalCompanies) * 100) : 0,
        }
      }).sort((a, b) => b.percent - a.percent)

      // Feature usage from audit views
      const featureUsage = moduleViews.map((m: any) => ({
        resource: m._id || "unknown",
        views: m.count,
      }))

      // Industry marketing intel
      const industryMap = new Map<string, { companies: number; users: number; invoices: number; bytes: number }>()
      for (const t of tenantUsage) {
        const key = t.industry || "Other"
        const cur = industryMap.get(key) || { companies: 0, users: 0, invoices: 0, bytes: 0 }
        cur.companies += 1
        cur.users += t.counts.users
        cur.invoices += t.counts.invoices
        cur.bytes += t.estimatedBytes
        industryMap.set(key, cur)
      }
      const industries = Array.from(industryMap.entries())
        .map(([name, v]) => ({
          name,
          ...v,
          avgUsers: v.companies > 0 ? Math.round(v.users / v.companies) : 0,
          storage: formatBytes(v.bytes),
        }))
        .sort((a, b) => b.companies - a.companies)

      // Geographic
      const geoMap = new Map<string, number>()
      for (const c of companies as any[]) {
        const loc = c.city || c.country || "Unspecified"
        geoMap.set(loc, (geoMap.get(loc) || 0) + 1)
      }
      const geography = Array.from(geoMap.entries())
        .map(([name, companiesCount]) => ({ name, companies: companiesCount }))
        .sort((a, b) => b.companies - a.companies)
        .slice(0, 10)

      // Journey funnel (approx)
      const withUsers = tenantUsage.filter((t) => t.counts.users > 0).length
      const withProducts = tenantUsage.filter((t) => t.counts.products > 0).length
      const withClients = tenantUsage.filter((t) => t.counts.clients > 0).length
      const withInvoices = tenantUsage.filter((t) => t.counts.invoices > 0).length
      const withRepeatActivity = tenantUsage.filter((t) => t.daysSinceActive <= 30 && t.counts.invoices > 1).length
      const journey = [
        { stage: "Signed up", count: totalCompanies, percent: 100 },
        { stage: "Added users", count: withUsers, percent: totalCompanies ? Math.round((withUsers / totalCompanies) * 100) : 0 },
        { stage: "Created products", count: withProducts, percent: totalCompanies ? Math.round((withProducts / totalCompanies) * 100) : 0 },
        { stage: "Added customers", count: withClients, percent: totalCompanies ? Math.round((withClients / totalCompanies) * 100) : 0 },
        { stage: "First invoice", count: withInvoices, percent: totalCompanies ? Math.round((withInvoices / totalCompanies) * 100) : 0 },
        { stage: "Repeat billing month", count: withRepeatActivity, percent: totalCompanies ? Math.round((withRepeatActivity / totalCompanies) * 100) : 0 },
      ]

      // Activity feed
      const activityFeed = recentAudit.map((a: any) => {
        const company = companyMap.get(String(a.org_id))
        return {
          time: a.timestamp,
          orgId: a.org_id,
          companyName: (company as any)?.name || "Unknown",
          action: a.action,
          resource: a.resource,
          details: a.details || `${a.action} ${a.resource}`,
        }
      })

      // Also prepend new company signups
      const recentSignups = [...companies]
        .filter((c: any) => c.createdAt && new Date(c.createdAt) >= weekAgo)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((c: any) => ({
          time: c.createdAt,
          orgId: String(c._id),
          companyName: c.name,
          action: "signup",
          resource: "company",
          details: `New company registered: ${c.name}`,
        }))

      const feed = [...recentSignups, ...activityFeed]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 20)

      // Executive insights / recommendations
      const insights: string[] = []
      if (churnRisk.length > 0) {
        insights.push(
          `${churnRisk.length} companies have not logged in for 14+ days — trigger re-engagement outreach.`,
        )
      }
      const topModule = moduleAdoption[0]
      if (topModule) {
        insights.push(
          `${topModule.module.toUpperCase()} leads module adoption at ${topModule.percent}% — double down on related advanced features.`,
        )
      }
      const weakModule = [...moduleAdoption].sort((a, b) => a.percent - b.percent)[0]
      if (weakModule && weakModule.percent < 40) {
        insights.push(
          `${weakModule.module.toUpperCase()} is only used by ${weakModule.percent}% of tenants — improve onboarding or packaging.`,
        )
      }
      if (storageShare[0] && storageShare[0].percent >= 25) {
        insights.push(
          `${storageShare[0].name} alone consumes ~${storageShare[0].percent}% of estimated platform data — review storage tiers.`,
        )
      }
      if (journey[4] && journey[3] && journey[4].percent < journey[3].percent - 15) {
        insights.push(
          `Drop-off after customers are added: ${journey[3].percent}% have customers but only ${journey[4].percent}% create invoices — fix invoice UX.`,
        )
      }
      const wowGrowth =
        newCompaniesLastMonth > 0
          ? Math.round(((newCompaniesThisMonth - newCompaniesLastMonth) / newCompaniesLastMonth) * 100)
          : newCompaniesThisMonth > 0
            ? 100
            : 0
      insights.push(
        `${activeTodayOrgs.size} companies active today (${totalCompanies ? Math.round((activeTodayOrgs.size / totalCompanies) * 100) : 0}% of base). Company signups this month: ${newCompaniesThisMonth} (${wowGrowth >= 0 ? "+" : ""}${wowGrowth}% vs prior month).`,
      )

      const invoiceGrowth =
        invoicesLastMonth > 0
          ? Math.round(((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) * 100)
          : invoicesThisMonth > 0
            ? 100
            : 0

      return res.json({
        success: true,
        data: {
          generatedAt: now.toISOString(),
          kpis: {
            totalCompanies,
            activeCompanies,
            frozenCompanies,
            activeTodayCompanies: activeTodayOrgs.size,
            activeTodayPercent: totalCompanies ? Math.round((activeTodayOrgs.size / totalCompanies) * 100) : 0,
            monthlyActiveCompanies: monthlyActiveOrgs.size,
            totalUsers: users.length,
            onlineSessions: onlineUsers.length,
            monthlyActiveUsers: monthlyActiveUsers.length,
            estimatedStorageBytes: totalEstimatedBytes,
            estimatedStorage: formatBytes(totalEstimatedBytes),
            invoicesThisMonth,
            invoiceGrowth,
            newCompaniesThisMonth,
            companyGrowth: wowGrowth,
          },
          executiveSummary: insights,
          healthDistribution,
          topStorage: storageShare,
          tenantUsage: tenantUsage
            .sort((a, b) => b.estimatedBytes - a.estimatedBytes)
            .map((t) => ({
              ...t,
              lastActivity: t.lastActivity?.toISOString?.() || t.lastActivity,
            })),
          growingCompanies: growing.map((g) => ({
            name: g.name,
            userGrowth: g.userGrowth,
            users: g.counts.users,
            healthScore: g.healthScore,
          })),
          churnRisk: churnRisk.map((c) => ({
            name: c.name,
            daysSinceActive: c.daysSinceActive,
            healthScore: c.healthScore,
            industry: c.industry,
          })),
          moduleAdoption,
          featureUsage,
          industries,
          geography,
          journey,
          activityFeed: feed,
          lowestMaturity: [...tenantUsage]
            .sort((a, b) => a.maturityScore - b.maturityScore)
            .slice(0, 8)
            .map((t) => ({
              name: t.name,
              maturityScore: t.maturityScore,
              healthScore: t.healthScore,
              modules: t.modules,
            })),
        },
      })
    } catch (error) {
      console.error("❌ [OwnerController] Insights error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to build platform insights",
        error: process.env.NODE_ENV === "development" ? (error as any).message : undefined,
      })
    }
  }

  /**
   * Who can access the owner console
   */
  static async getOwnerSession(req: AuthenticatedRequest, res: Response) {
    try {
      if (!requireOwner(req, res)) return
      return res.json({
        success: true,
        data: {
          email: req.user?.email,
          role: req.user?.role,
          deleteOtpEmail: COMPANY_DELETE_OTP_EMAIL,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify owner session",
      })
    }
  }

  /**
   * Step 1: request permanent company deletion — OTP emailed to info@elevatehub.co.ke
   */
  static async requestCompanyDelete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!requireOwner(req, res)) return

      const companyId = String(req.params.companyId || req.body?.companyId || "").trim()
      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required" })
      }

      const company = await Company.findById(companyId).lean()
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      await OwnerActionOtp.updateMany(
        {
          action: "delete_company",
          companyId,
          used: false,
        },
        { $set: { used: true } },
      )

      const otp = String(Math.floor(100000 + Math.random() * 900000))
      const challengeId = randomUUID()
      const expiresAt = new Date(Date.now() + COMPANY_DELETE_OTP_MINUTES * 60 * 1000)

      await OwnerActionOtp.create({
        challengeId,
        action: "delete_company",
        companyId,
        companyName: company.name,
        companySlug: company.slug,
        requestedByEmail: String(req.user?.email || "").toLowerCase(),
        requestedByUserId: String(req.user?.userId || ""),
        otpEmail: COMPANY_DELETE_OTP_EMAIL,
        otp,
        expiresAt,
        used: false,
      })

      const html = companyDeleteOtpEmail({
        otp,
        companyName: company.name,
        companySlug: company.slug,
        companyId,
        requestedBy: req.user?.email || "unknown",
        expiresMinutes: COMPANY_DELETE_OTP_MINUTES,
      })

      const sent = await emailService.sendEmail({
        to: COMPANY_DELETE_OTP_EMAIL,
        subject: `Delete company OTP — ${company.name}`,
        html,
      })

      if (!sent) {
        return res.status(500).json({
          success: false,
          message: `Failed to send OTP to ${COMPANY_DELETE_OTP_EMAIL}`,
        })
      }

      return res.json({
        success: true,
        message: `Verification code sent to ${COMPANY_DELETE_OTP_EMAIL}`,
        data: {
          challengeId,
          companyId,
          companyName: company.name,
          companySlug: company.slug,
          otpEmail: COMPANY_DELETE_OTP_EMAIL,
          expiresInMinutes: COMPANY_DELETE_OTP_MINUTES,
        },
      })
    } catch (error: any) {
      console.error("requestCompanyDelete failed:", error)
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to start company deletion",
      })
    }
  }

  /**
   * Step 2: confirm OTP + typed slug, then permanently wipe company data
   */
  static async confirmCompanyDelete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!requireOwner(req, res)) return

      const companyId = String(req.params.companyId || req.body?.companyId || "").trim()
      const challengeId = String(req.body?.challengeId || "").trim()
      const otp = String(req.body?.otp || "").trim()
      const confirmSlug = String(req.body?.confirmSlug || "").trim().toLowerCase()

      if (!companyId || !challengeId || !otp || !confirmSlug) {
        return res.status(400).json({
          success: false,
          message: "companyId, challengeId, otp, and confirmSlug are required",
        })
      }

      const challenge = await OwnerActionOtp.findOne({
        challengeId,
        action: "delete_company",
        companyId,
        used: false,
        expiresAt: { $gt: new Date() },
      })

      if (!challenge || challenge.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification code",
        })
      }

      if (String(challenge.companySlug || "").toLowerCase() !== confirmSlug) {
        return res.status(400).json({
          success: false,
          message: "Confirm slug does not match the company slug",
        })
      }

      challenge.used = true
      await challenge.save()

      const result = await permanentlyDeleteCompany(companyId)

      return res.json({
        success: true,
        message: `Company "${result.companyName}" permanently deleted`,
        data: result,
      })
    } catch (error: any) {
      console.error("confirmCompanyDelete failed:", error)
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to delete company",
      })
    }
  }
}
