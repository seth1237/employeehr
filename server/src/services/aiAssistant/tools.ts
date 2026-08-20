import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { StockSale } from "../../models/StockSale"
import { StockProduct } from "../../models/StockProduct"
import { StockInvoice } from "../../models/StockInvoice"
import { StockQuotation } from "../../models/StockQuotation"
import { User } from "../../models/User"
import { LeaveRequest } from "../../models/LeaveRequest"
import { LeaveBalance } from "../../models/LeaveBalance"
import { Payroll } from "../../models/Payroll"
import { Attendance } from "../../models/Attendance"
import { Task } from "../../models/Task"
import { Meeting } from "../../models/Meeting"
import { Performance } from "../../models/Performance"
import { PDP } from "../../models/PDP"
import { KPI } from "../../models/KPI"
import { Feedback } from "../../models/Feedback"
import Alert from "../../models/Alert"
import { InstalledMachine } from "../../models/InstalledMachine"
import { StockClient } from "../../models/StockClient"
import { StockClientGroup } from "../../models/StockClientGroup"
import { StockExpense } from "../../models/StockExpense"
import { StockInvoicePayment } from "../../models/StockInvoicePayment"
import { ClientComplaint } from "../../models/ClientComplaint"
import { ClientConversation } from "../../models/ClientConversation"
import { CallLog } from "../../models/CallLog"
import { Ticket } from "../../models/Ticket"
import { SalesPlanner } from "../../models/SalesPlanner"
import { SalesVisit } from "../../models/SalesVisit"
import { SalesQuote } from "../../models/SalesQuote"
import type { AssistantOrgContext } from "./orgContext"
import {
  endOfMonth,
  parseIsoDate,
  startOfMonth,
  startOfLastMonth,
  endOfLastMonth,
  startOfYear,
  endOfYear,
  startOfLastYear,
  endOfLastYear,
  startOfQuarter,
  endOfQuarter,
  startOfLastQuarter,
  endOfLastQuarter,
  startOfWeek,
  endOfWeek,
  startOfLastWeek,
  endOfLastWeek,
  formatMonthLabel,
  formatQuarterLabel,
  formatWeekLabel,
  getQuarter,
} from "./orgContext"

// ─── Shared helpers ───────────────────────────────────────────────────────────

const dateRangeSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("ISO date start (YYYY-MM-DD). Omit to let the tool infer from period."),
  endDate: z.string().optional().describe("ISO date end (YYYY-MM-DD), inclusive."),
  period: z
    .enum([
      "last_month",
      "this_month",
      "last_7_days",
      "last_30_days",
      "last_90_days",
      "this_week",
      "last_week",
      "this_quarter",
      "last_quarter",
      "this_year",
      "last_year",
      "custom",
    ])
    .optional()
    .describe(
      "Shortcut period. Use 'last_month' / 'this_month' for monthly, 'this_quarter' / 'last_quarter' for quarterly, 'this_year' for year-to-date.",
    ),
})

function resolveRange(input: z.infer<typeof dateRangeSchema>) {
  const now = new Date()
  switch (input.period) {
    case "last_month":
      return { start: startOfLastMonth(now), end: endOfLastMonth(now), label: formatMonthLabel(startOfLastMonth(now)) }
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now), label: formatMonthLabel(now) }
    case "last_7_days": {
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 7)
      return { start, end: now, label: "last 7 days" }
    }
    case "last_30_days": {
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 30)
      return { start, end: now, label: "last 30 days" }
    }
    case "last_90_days": {
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 90)
      return { start, end: now, label: "last 90 days" }
    }
    case "this_week": {
      const start = startOfWeek(now)
      const end = endOfWeek(now)
      return { start, end, label: formatWeekLabel(start, end) }
    }
    case "last_week": {
      const start = startOfLastWeek(now)
      const end = endOfLastWeek(now)
      return { start, end, label: formatWeekLabel(start, end) }
    }
    case "this_quarter": {
      const start = startOfQuarter(now)
      const end = endOfQuarter(now)
      return { start, end, label: `${formatQuarterLabel(now)} (quarter-to-date)` }
    }
    case "last_quarter": {
      const start = startOfLastQuarter(now)
      const end = endOfLastQuarter(now)
      return { start, end, label: `Q${getQuarter(start)} ${start.getUTCFullYear()} (full quarter)` }
    }
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now), label: `${now.getUTCFullYear()} (year-to-date)` }
    case "last_year":
      return {
        start: startOfLastYear(now),
        end: endOfLastYear(now),
        label: `${now.getUTCFullYear() - 1} (full year)`,
      }
    default: {
      const start = parseIsoDate(input.startDate, startOfLastMonth(now))
      const end = parseIsoDate(input.endDate, endOfLastMonth(now))
      const label = `${start.toISOString().split("T")[0]} → ${end.toISOString().split("T")[0]}`
      return { start, end, label }
    }
  }
}

/** Guard: reject any query where orgId is empty  */
function assertOrgId(orgId: string) {
  if (!orgId || orgId.trim() === "") {
    throw new Error("Organization context is missing. Cannot query the database.")
  }
}

/** Some providers (e.g. Gemini via OpenRouter) reject completely empty parameter schemas */
const emptyArgsSchema = z.object({
  note: z
    .string()
    .optional()
    .describe("Optional unused note — leave empty"),
})

function normalizeClientKey(name: string, number: string, location: string) {
  return `${String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}|${String(number || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}|${String(location || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}`
}

function escapeRegex(value: string) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ─── Tool factory ─────────────────────────────────────────────────────────────

export function createAssistantTools(ctx: AssistantOrgContext) {
  assertOrgId(ctx.orgId)

  // Hard-typed org filter used in EVERY query — never interpolated or overridable
  const orgFilter = { org_id: ctx.orgId } as const

  // ─────────────────────────────────────────────────────────────────────────────
  // SALES TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getSalesSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("quantitySold soldPrice createdAt")
        .lean()

      const totalUnits = sales.reduce((sum, row) => sum + Number(row.quantitySold || 0), 0)
      const totalRevenue = sales.reduce(
        (sum, row) => sum + Number(row.quantitySold || 0) * Number(row.soldPrice || 0),
        0,
      )

      return JSON.stringify({
        period: label,
        dateRange: { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] },
        saleTransactions: sales.length,
        totalUnitsSold: totalUnits,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        avgTransactionValue: sales.length > 0 ? Number((totalRevenue / sales.length).toFixed(2)) : 0,
      })
    },
    {
      name: "get_sales_summary",
      description:
        "Sales totals: transaction count, units sold, revenue, and average transaction value. Use for 'how much did we sell?', 'what is our revenue?', or 'how many transactions this month?'.",
      schema: dateRangeSchema,
    },
  )

  const getTopProducts = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const limit = Math.min(Math.max((input as any).limit ?? 5, 1), 20)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("productId quantitySold soldPrice")
        .lean()

      const byProduct = new Map<string, { units: number; revenue: number }>()
      for (const sale of sales) {
        const key = String(sale.productId)
        const row = byProduct.get(key) || { units: 0, revenue: 0 }
        row.units += Number(sale.quantitySold || 0)
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        byProduct.set(key, row)
      }

      const productIds = Array.from(byProduct.keys())
      const products = await StockProduct.find({ _id: { $in: productIds }, ...orgFilter })
        .select("name category")
        .lean()
      const infoById = new Map(products.map((p) => [String(p._id), { name: p.name, category: p.category }]))

      const ranked = Array.from(byProduct.entries())
        .map(([productId, stats]) => {
          const info = infoById.get(productId)
          return {
            productName: info?.name || "Unknown Product",
            category: info?.category || "Uncategorized",
            unitsSold: stats.units,
            revenue: Number(stats.revenue.toFixed(2)),
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)

      return JSON.stringify({ period: label, topProducts: ranked })
    },
    {
      name: "get_top_products",
      description: "Best-selling products by revenue. Shows product names, categories, units sold, and revenue. Use for 'best sellers' or 'top products'.",
      schema: dateRangeSchema.extend({
        limit: z.number().int().min(1).max(20).optional().describe("How many top products to return (default 5)"),
      }),
    },
  )

  const getInventorySummary = tool(
    async () => {
      assertOrgId(ctx.orgId)
      const products = await StockProduct.find({ ...orgFilter, isActive: { $ne: false } })
        .select("name currentQuantity minAlertQuantity sellingPrice startingPrice category expiryEnabled expiryDate")
        .lean()

      const now = new Date()
      const lowStock = products
        .filter((p) => Number(p.currentQuantity || 0) <= Number(p.minAlertQuantity || 0))
        .map((p) => ({
          name: p.name,
          currentQuantity: p.currentQuantity,
          minAlertQuantity: p.minAlertQuantity,
          category: p.category || "Uncategorized",
        }))
        .slice(0, 15)

      const expiringSoon = products
        .filter((p) => p.expiryEnabled && p.expiryDate && new Date(p.expiryDate) > now)
        .filter((p) => {
          const daysLeft = (new Date(p.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          return daysLeft <= 30
        })
        .map((p) => ({
          name: p.name,
          expiryDate: p.expiryDate instanceof Date ? p.expiryDate.toISOString().split("T")[0] : p.expiryDate,
        }))
        .slice(0, 10)

      const totalUnits = products.reduce((sum, p) => sum + Number(p.currentQuantity || 0), 0)
      const stockValue = products.reduce(
        (sum, p) => sum + Number(p.currentQuantity || 0) * Number(p.sellingPrice || 0),
        0,
      )
      const costValue = products.reduce(
        (sum, p) => sum + Number(p.currentQuantity || 0) * Number(p.startingPrice || 0),
        0,
      )

      const byCategory: Record<string, { count: number; units: number }> = {}
      for (const p of products) {
        const cat = String(p.category || "Uncategorized")
        if (!byCategory[cat]) byCategory[cat] = { count: 0, units: 0 }
        byCategory[cat].count += 1
        byCategory[cat].units += Number(p.currentQuantity || 0)
      }

      return JSON.stringify({
        activeProducts: products.length,
        totalUnitsOnHand: totalUnits,
        estimatedRetailStockValue: Number(stockValue.toFixed(2)),
        estimatedCostValue: Number(costValue.toFixed(2)),
        potentialGrossMargin: Number((stockValue - costValue).toFixed(2)),
        lowStockCount: lowStock.length,
        lowStockItems: lowStock,
        expiringSoonCount: expiringSoon.length,
        expiringSoonItems: expiringSoon,
        byCategory,
      })
    },
    {
      name: "get_inventory_summary",
      description:
        "Current inventory: total products, stock value, low-stock alerts, expiring items, and category breakdown. Use for 'what products are low on stock?', 'inventory value?', or 'what's expiring soon?'.",
      schema: emptyArgsSchema,
    },
  )

  const getInvoiceSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const invoices = await StockInvoice.find({
        ...orgFilter,
        status: { $ne: "cancelled" },
        createdAt: { $gte: start, $lte: end },
      })
        .select("subTotal status invoiceNumber dispatch")
        .lean()

      const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.subTotal || 0), 0)
      const byStatus: Record<string, number> = {}
      const byDispatchStatus: Record<string, number> = {}
      for (const inv of invoices) {
        const status = String(inv.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
        const dispatchStatus = String((inv as any).dispatch?.status || "not_assigned")
        byDispatchStatus[dispatchStatus] = (byDispatchStatus[dispatchStatus] || 0) + 1
      }

      return JSON.stringify({
        period: label,
        dateRange: { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] },
        invoiceCount: invoices.length,
        totalInvoicedValue: Number(totalInvoiced.toFixed(2)),
        byPaymentStatus: byStatus,
        byDispatchStatus,
      })
    },
    {
      name: "get_invoice_summary",
      description:
        "Invoice counts and values for a period, broken down by payment status (paid/issued) and dispatch status. Use for 'unpaid invoices', 'pending deliveries', or 'how much is owed?'.",
      schema: dateRangeSchema,
    },
  )

  const getQuotationSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const quotations = await StockQuotation.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("subTotal status quotationNumber")
        .lean()

      const totalQuoted = quotations.reduce((sum, q) => sum + Number(q.subTotal || 0), 0)
      const byStatus: Record<string, number> = {}
      for (const q of quotations) {
        const status = String(q.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
      }

      const conversionRate =
        quotations.length > 0
          ? Number((((byStatus["converted"] || 0) / quotations.length) * 100).toFixed(1))
          : null

      return JSON.stringify({
        period: label,
        quotationCount: quotations.length,
        totalQuotedValue: Number(totalQuoted.toFixed(2)),
        conversionRatePercent: conversionRate,
        byStatus,
      })
    },
    {
      name: "get_quotation_summary",
      description: "Quotation counts, values, and conversion rate for a period. Shows pending, approved, or converted quotations.",
      schema: dateRangeSchema,
    },
  )

  const getSalesByCustomer = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const limit = Math.min(Math.max((input as any).limit ?? 10, 1), 50)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("clientId clientName quantitySold soldPrice")
        .lean()

      const byCustomer = new Map<string, { name: string; units: number; revenue: number; count: number }>()
      for (const sale of sales) {
        const key = String(sale.clientId || "unknown")
        const row = byCustomer.get(key) || { name: String((sale as any).clientName || key), units: 0, revenue: 0, count: 0 }
        row.units += Number(sale.quantitySold || 0)
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        row.count += 1
        if ((sale as any).clientName) row.name = String((sale as any).clientName)
        byCustomer.set(key, row)
      }

      const ranked = Array.from(byCustomer.values())
        .map((v) => ({
          customerName: v.name,
          transactions: v.count,
          unitsSold: v.units,
          totalRevenue: Number(v.revenue.toFixed(2)),
          avgOrderValue: Number((v.revenue / v.count).toFixed(2)),
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)

      return JSON.stringify({ period: label, uniqueCustomers: byCustomer.size, topCustomers: ranked })
    },
    {
      name: "get_sales_by_customer",
      description:
        "Top customers by revenue: transaction count, units bought, and average order value. Use for 'who are our top clients?' or 'best customers'.",
      schema: dateRangeSchema.extend({
        limit: z.number().int().min(1).max(50).optional().describe("Max customers to return (default 10)"),
      }),
    },
  )

  const getSalesPerformanceTrend = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("createdAt quantitySold soldPrice")
        .lean()

      const byDate = new Map<string, { revenue: number; units: number; count: number }>()
      for (const sale of sales) {
        const date = new Date(sale.createdAt || new Date()).toISOString().split("T")[0]
        const row = byDate.get(date) || { revenue: 0, units: 0, count: 0 }
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        row.units += Number(sale.quantitySold || 0)
        row.count += 1
        byDate.set(date, row)
      }

      const trend = Array.from(byDate.entries())
        .map(([date, stats]) => ({
          date,
          dailyRevenue: Number(stats.revenue.toFixed(2)),
          unitsSold: stats.units,
          transactions: stats.count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const totalRevenue = trend.reduce((sum, d) => sum + d.dailyRevenue, 0)
      const avgDaily = trend.length > 0 ? Number((totalRevenue / trend.length).toFixed(2)) : 0
      const bestDay = trend.reduce((best, d) => (d.dailyRevenue > (best?.dailyRevenue ?? 0) ? d : best), trend[0])

      return JSON.stringify({
        period: label,
        daysWithSales: trend.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        avgDailyRevenue: avgDaily,
        bestDay: bestDay ? { date: bestDay.date, revenue: bestDay.dailyRevenue } : null,
        trend: trend.slice(-31),
      })
    },
    {
      name: "get_sales_performance_trend",
      description:
        "Daily sales trend: revenue, units, and transactions per day. Best for identifying peak days and revenue patterns over time.",
      schema: dateRangeSchema,
    },
  )

  const getProductCategoryPerformance = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("productId quantitySold soldPrice")
        .lean()

      const productIds = Array.from(new Set(sales.map((s) => s.productId)))
      const products = await StockProduct.find({ _id: { $in: productIds }, ...orgFilter })
        .select("category name")
        .lean()

      const categoryMap = new Map(products.map((p) => [String(p._id), p.category || "Uncategorized"]))

      const byCategory = new Map<string, { revenue: number; units: number; count: number }>()
      for (const sale of sales) {
        const category = categoryMap.get(String(sale.productId)) || "Uncategorized"
        const row = byCategory.get(category) || { revenue: 0, units: 0, count: 0 }
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        row.units += Number(sale.quantitySold || 0)
        row.count += 1
        byCategory.set(category, row)
      }

      const total = Array.from(byCategory.values()).reduce((sum, v) => sum + v.revenue, 0)

      const categories = Array.from(byCategory.entries())
        .map(([name, stats]) => ({
          category: name,
          transactions: stats.count,
          unitsSold: stats.units,
          revenue: Number(stats.revenue.toFixed(2)),
          avgPricePerUnit: stats.units > 0 ? Number((stats.revenue / stats.units).toFixed(2)) : 0,
          revenueSharePercent: total > 0 ? Number(((stats.revenue / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)

      return JSON.stringify({ period: label, totalCategories: categories.length, categories })
    },
    {
      name: "get_product_category_performance",
      description: "Sales by product category with revenue share percentages. Shows which categories drive the most revenue.",
      schema: dateRangeSchema,
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // HR TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getEmployeeSummary = tool(
    async () => {
      assertOrgId(ctx.orgId)

      const users = await User.find({ ...orgFilter })
        .select("status role department position dateOfJoining")
        .lean()

      const active = users.filter((u) => String(u.status) === "active").length
      const byRole: Record<string, number> = {}
      const byDept: Record<string, number> = {}
      for (const user of users) {
        const role = String(user.role || "unknown")
        byRole[role] = (byRole[role] || 0) + 1
        const dept = String(user.department || "Unassigned")
        byDept[dept] = (byDept[dept] || 0) + 1
      }

      // New hires in last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
      const newHires = users.filter(
        (u) => u.dateOfJoining && new Date(u.dateOfJoining) >= thirtyDaysAgo,
      ).length

      return JSON.stringify({
        totalEmployees: users.length,
        activeEmployees: active,
        inactiveEmployees: users.length - active,
        newHiresLast30Days: newHires,
        byRole,
        byDepartment: byDept,
      })
    },
    {
      name: "get_employee_summary",
      description:
        "Workforce overview: total employees, active/inactive counts, new hires last 30 days, breakdown by role and department. Use for 'how many employees do we have?' or 'staff headcount'.",
      schema: emptyArgsSchema,
    },
  )

  const searchEmployees = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      const query = String(input.query || "").trim()
      if (!query || query.length < 2) {
        return JSON.stringify({ error: "Search query must be at least 2 characters." })
      }

      const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)

      const employees = await User.find(
        {
          ...orgFilter,
          $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
            { position: { $regex: query, $options: "i" } },
            { department: { $regex: query, $options: "i" } },
            { employee_id: { $regex: query, $options: "i" } },
          ],
        },
        "firstName lastName email role status department position employee_id dateOfJoining",
      )
        .limit(limit)
        .lean()

      return JSON.stringify({
        query,
        resultCount: employees.length,
        employees: employees.map((e) => ({
          name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
          employeeId: e.employee_id || "N/A",
          email: e.email,
          role: e.role,
          position: e.position || "Not set",
          status: e.status,
          department: e.department || "Not set",
          dateOfJoining: e.dateOfJoining
            ? new Date(e.dateOfJoining).toISOString().split("T")[0]
            : null,
        })),
      })
    },
    {
      name: "search_employees",
      description:
        "Search for employees by name, email, job title, department, or employee ID. Returns role, department, status, and join date.",
      schema: z.object({
        query: z.string().min(2).describe("Employee name, email, position, department, or employee ID to search for"),
        limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
      }),
    },
  )

  const getLeaveSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      const { start, end, label } = resolveRange(input)
      const requests = await LeaveRequest.find({
        org_id: ctx.orgId,
        createdAt: { $gte: start, $lte: end },
      })
        .select("status type userId startDate endDate")
        .lean()

      const byStatus: Record<string, number> = {}
      const byType: Record<string, number> = {}
      for (const req of requests) {
        const status = String(req.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
        const type = String((req as any).type || "unknown")
        byType[type] = (byType[type] || 0) + 1
      }

      const pending = requests.filter((r) => r.status === "pending")
      const pendingList = pending.slice(0, 5).map((r) => ({
        type: (r as any).type || "N/A",
        startDate: r.startDate ? new Date(r.startDate).toISOString().split("T")[0] : null,
        endDate: r.endDate ? new Date(r.endDate).toISOString().split("T")[0] : null,
      }))

      return JSON.stringify({
        period: label,
        totalRequests: requests.length,
        byStatus,
        byType,
        pendingApprovalCount: pending.length,
        samplePendingRequests: pendingList,
      })
    },
    {
      name: "get_leave_summary",
      description:
        "Leave requests by status and type for a period, including pending approvals. Use for 'how many pending leave requests?', 'who is on leave?', or leave statistics.",
      schema: dateRangeSchema,
    },
  )

  const getLeaveBalance = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      const filter: any = { org_id: ctx.orgId }
      if (input.year) filter.year = input.year
      if (input.userId) filter.user_id = input.userId

      const balances = await LeaveBalance.find(filter)
        .select("user_id year annual_total annual_used sick_total sick_used maternity_total maternity_used paternity_total paternity_used unpaid_used")
        .limit(20)
        .lean()

      if (!balances.length) {
        return JSON.stringify({ message: "No leave balance records found for the specified criteria." })
      }

      // Enrich with user names if querying multiple users
      const userIds = balances.map((b) => b.user_id).filter(Boolean)
      const users = await User.find({ _id: { $in: userIds }, ...orgFilter })
        .select("firstName lastName")
        .lean()
      const nameById = new Map(users.map((u) => [String(u._id), `${u.firstName || ""} ${u.lastName || ""}`.trim()]))

      const enriched = balances.map((b) => ({
        employeeName: nameById.get(String(b.user_id)) || "Unknown",
        year: b.year,
        annual: { total: b.annual_total, used: b.annual_used, remaining: Number(b.annual_total || 0) - Number(b.annual_used || 0) },
        sick: { total: b.sick_total, used: b.sick_used, remaining: Number(b.sick_total || 0) - Number(b.sick_used || 0) },
        maternity: { total: b.maternity_total, used: b.maternity_used },
        paternity: { total: b.paternity_total, used: b.paternity_used },
        unpaidUsed: b.unpaid_used,
      }))

      return JSON.stringify({ count: enriched.length, leaveBalances: enriched })
    },
    {
      name: "get_leave_balance",
      description:
        "Leave balance details showing total, used, and remaining days by type (annual, sick, maternity, paternity). Use for 'how many leave days does X have left?' or 'check leave balance'.",
      schema: z.object({
        userId: z.string().optional().describe("Filter to a specific user ID. Leave blank for all employees."),
        year: z.number().int().optional().describe("Year (e.g. 2026). Defaults to current year records."),
      }),
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYROLL TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getPayrollSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      const now = new Date()
      let monthFilter: string | undefined = (input as any).month

      if (!monthFilter) {
        const period: string | undefined = (input as any).period
        if (period === "last_month") {
          const last = startOfLastMonth(now)
          monthFilter = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`
        } else {
          monthFilter = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
        }
      }

      const payrolls = await Payroll.find({
        org_id: ctx.orgId,
        month: monthFilter,
      })
        .select("net_pay base_salary bonus total_deductions status user_id")
        .lean()

      if (!payrolls.length) {
        return JSON.stringify({
          month: monthFilter,
          message: `No payroll records found for ${monthFilter}. Payroll may not have been generated yet.`,
        })
      }

      const totalNetPay = payrolls.reduce((sum, p) => sum + Number(p.net_pay || 0), 0)
      const totalBaseSalary = payrolls.reduce((sum, p) => sum + Number(p.base_salary || 0), 0)
      const totalBonuses = payrolls.reduce((sum, p) => sum + Number(p.bonus || 0), 0)
      const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.total_deductions || 0), 0)
      const byStatus: Record<string, number> = {}
      for (const p of payrolls) {
        const status = String(p.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
      }

      return JSON.stringify({
        month: monthFilter,
        employeesPaid: payrolls.length,
        totalNetPay: Number(totalNetPay.toFixed(2)),
        totalBaseSalary: Number(totalBaseSalary.toFixed(2)),
        totalBonuses: Number(totalBonuses.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        avgNetPay: Number((totalNetPay / payrolls.length).toFixed(2)),
        byStatus,
      })
    },
    {
      name: "get_payroll_summary",
      description:
        "Payroll totals for a specific month: net pay, base salaries, bonuses, deductions, and employee count. Use for 'payroll cost this month', 'salary expenses', or 'how much did we pay staff?'.",
      schema: z.object({
        month: z
          .string()
          .optional()
          .describe("Month in YYYY-MM format (e.g. 2026-05). Leave blank for current month."),
        period: z.enum(["last_month", "this_month"]).optional().describe("Period shortcut instead of explicit month"),
      }),
    },
  )

  const getPayrollTrend = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      // Fetch last N months of payroll
      const months = Math.min(Math.max(input.months ?? 6, 2), 12)
      const now = new Date()
      const monthKeys: string[] = []
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
        monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
      }

      const payrolls = await Payroll.find({
        org_id: ctx.orgId,
        month: { $in: monthKeys },
      })
        .select("month net_pay base_salary bonus total_deductions")
        .lean()

      const byMonth: Record<string, { netPay: number; baseSalary: number; bonuses: number; deductions: number; count: number }> = {}
      for (const m of monthKeys) byMonth[m] = { netPay: 0, baseSalary: 0, bonuses: 0, deductions: 0, count: 0 }
      for (const p of payrolls) {
        const key = String(p.month || "")
        if (byMonth[key]) {
          byMonth[key].netPay += Number(p.net_pay || 0)
          byMonth[key].baseSalary += Number(p.base_salary || 0)
          byMonth[key].bonuses += Number(p.bonus || 0)
          byMonth[key].deductions += Number(p.total_deductions || 0)
          byMonth[key].count += 1
        }
      }

      const trend = Object.entries(byMonth).map(([month, stats]) => ({
        month,
        totalNetPay: Number(stats.netPay.toFixed(2)),
        totalBonuses: Number(stats.bonuses.toFixed(2)),
        totalDeductions: Number(stats.deductions.toFixed(2)),
        employeeCount: stats.count,
      }))

      return JSON.stringify({ monthsAnalyzed: months, trend })
    },
    {
      name: "get_payroll_trend",
      description:
        "Month-over-month payroll cost trend showing net pay, bonuses, and deductions over multiple months. Use for 'how has our payroll changed?' or 'salary cost trend'.",
      schema: z.object({
        months: z.number().int().min(2).max(12).optional().describe("How many months to look back (default 6, max 12)"),
      }),
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTENDANCE TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getAttendanceSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      const { start, end, label } = resolveRange(input)
      const records = await Attendance.find({
        org_id: ctx.orgId,
        date: { $gte: start, $lte: end },
      })
        .select("status hoursWorked userId")
        .lean()

      const byStatus: Record<string, number> = {}
      let totalHours = 0
      for (const rec of records) {
        const status = String(rec.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
        totalHours += Number(rec.hoursWorked || 0)
      }

      const presentCount = (byStatus["present"] || 0) + (byStatus["late"] || 0) + (byStatus["half_day"] || 0)
      const absenceCount = byStatus["absent"] || 0
      const attendanceRate =
        records.length > 0 ? Number(((presentCount / records.length) * 100).toFixed(1)) : null

      // Find chronic absentees (absent more than 2x in period)
      const absenceByUser: Record<string, number> = {}
      for (const rec of records) {
        if (rec.status === "absent") {
          const uid = String(rec.userId || "unknown")
          absenceByUser[uid] = (absenceByUser[uid] || 0) + 1
        }
      }
      const highAbsenceCount = Object.values(absenceByUser).filter((count) => count > 2).length

      return JSON.stringify({
        period: label,
        totalAttendanceRecords: records.length,
        presentOrPartial: presentCount,
        absent: absenceCount,
        attendanceRatePercent: attendanceRate,
        totalHoursLogged: Number(totalHours.toFixed(1)),
        avgHoursPerRecord: records.length > 0 ? Number((totalHours / records.length).toFixed(1)) : 0,
        employeesWithHighAbsences: highAbsenceCount,
        breakdown: byStatus,
      })
    },
    {
      name: "get_attendance_summary",
      description:
        "Attendance overview: present, absent, late, half-day counts, total hours logged, attendance rate, and employees with high absences. Use for 'attendance this week/month' or 'absenteeism rate'.",
      schema: dateRangeSchema,
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // TASK TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getMyTaskSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

      const tasks = await Task.find({
        org_id: ctx.orgId,
        assigned_to: ctx.userId,
        createdAt: { $gte: start, $lte: end },
      })
        .select("status priority due_date completed_at title is_ai_generated")
        .lean()

      const totalTasks = tasks.length
      const completedTasks = tasks.filter((task) => task.status === "completed").length
      const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
      const pendingTasks = tasks.filter((task) => task.status === "pending").length
      const cancelledTasks = tasks.filter((task) => task.status === "cancelled").length
      const overdueTasks = tasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.due_date &&
          new Date(task.due_date).getTime() < Date.now(),
      ).length
      const aiGeneratedTasks = tasks.filter((task) => task.is_ai_generated).length

      const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 }
      tasks.forEach((task) => {
        const priority = String(task.priority || "medium")
        byPriority[priority] = (byPriority[priority] || 0) + 1
      })

      const dueSoon = tasks
        .filter((task) => task.due_date && new Date(task.due_date).getTime() >= Date.now())
        .sort((a, b) => Number(new Date(a.due_date || 0)) - Number(new Date(b.due_date || 0)))
        .slice(0, 5)
        .map((task) => ({
          title: task.title,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date?.toISOString().split("T")[0] || null,
        }))

      return JSON.stringify({
        period: label,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        cancelledTasks,
        overdueTasks,
        aiGeneratedTasks,
        priorityBreakdown: byPriority,
        dueSoon,
      })
    },
    {
      name: "get_my_task_summary",
      description:
        "Tasks assigned to the current logged-in user: completed, pending, in-progress, overdue, and upcoming tasks. Use for 'my tasks', 'what do I have to do?', or 'my pending work'.",
      schema: dateRangeSchema,
    },
  )

  const getTaskSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const filter: any = {
        org_id: ctx.orgId,
        createdAt: { $gte: start, $lte: end },
      }
      if (input.userId) filter.assigned_to = String(input.userId)
      if (input.status) filter.status = String(input.status)
      if (input.priority) filter.priority = String(input.priority)

      const tasks = await Task.find(filter)
        .select("assigned_to status priority due_date completed_at title is_ai_generated")
        .lean()

      const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 }
      tasks.forEach((task) => {
        const priority = String(task.priority || "medium")
        byPriority[priority] = (byPriority[priority] || 0) + 1
      })

      const overdueTasks = tasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.due_date &&
          new Date(task.due_date).getTime() < Date.now(),
      )

      const topPending = tasks
        .filter((task) => task.status !== "completed" && task.status !== "cancelled")
        .sort((a, b) => Number(new Date(a.due_date || 0)) - Number(new Date(b.due_date || 0)))
        .slice(0, 5)
        .map((task) => ({
          title: task.title,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date?.toISOString().split("T")[0] || null,
        }))

      return JSON.stringify({
        period: label,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
        pendingTasks: tasks.filter((t) => t.status === "pending").length,
        cancelledTasks: tasks.filter((t) => t.status === "cancelled").length,
        overdueTasks: overdueTasks.length,
        aiGeneratedTasks: tasks.filter((t) => t.is_ai_generated).length,
        priorityBreakdown: byPriority,
        topPendingTasks: topPending,
      })
    },
    {
      name: "get_task_summary",
      description:
        "Task overview for the organization or a specific user: counts by status, priority, and overdue items. Use for 'org-wide task progress', 'overdue tasks', or team task stats.",
      schema: dateRangeSchema.extend({
        userId: z.string().optional().describe("Optional user ID to filter tasks assigned to a specific person."),
        status: z
          .enum(["pending", "in_progress", "completed", "cancelled"])
          .optional()
          .describe("Filter by task status."),
        priority: z
          .enum(["low", "medium", "high", "urgent"])
          .optional()
          .describe("Filter by task priority."),
      }),
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE & KPI TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getPerformanceSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      const filter: any = { ...orgFilter }
      if (input.period) filter.period = input.period
      if (input.userId) filter.user_id = input.userId

      const performances = await Performance.find(filter)
        .select("user_id period overall_score attendance_score feedback_score status")
        .limit(100)
        .lean()

      if (!performances.length) {
        return JSON.stringify({
          message: `No performance records found${input.period ? ` for period ${input.period}` : ""}.`,
        })
      }

      const avgScore =
        performances.reduce((sum, p) => sum + Number(p.overall_score || 0), 0) / performances.length

      const byStatus: Record<string, number> = {}
      for (const p of performances) {
        const s = String(p.status || "unknown")
        byStatus[s] = (byStatus[s] || 0) + 1
      }

      const topPerformers = [...performances]
        .sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
        .slice(0, 5)

      const userIds = topPerformers.map((p) => p.user_id).filter(Boolean)
      const users = await User.find({ _id: { $in: userIds }, ...orgFilter })
        .select("firstName lastName")
        .lean()
      const nameById = new Map(users.map((u) => [String(u._id), `${u.firstName || ""} ${u.lastName || ""}`.trim()]))

      return JSON.stringify({
        period: input.period || "all",
        totalRecords: performances.length,
        avgOverallScore: Number(avgScore.toFixed(1)),
        byStatus,
        topPerformers: topPerformers.map((p) => ({
          name: nameById.get(String(p.user_id)) || "Unknown",
          overallScore: p.overall_score,
          period: p.period,
        })),
      })
    },
    {
      name: "get_performance_summary",
      description:
        "Employee performance scores for a given period: average score, top performers, and status breakdown. Use for 'performance results', 'who are the top performers?', or 'average KPI scores'.",
      schema: z.object({
        period: z.string().optional().describe("Performance period e.g. '2026-Q1' or '2026-01'. Leave blank for all."),
        userId: z.string().optional().describe("Filter to a specific employee."),
      }),
    },
  )

  const getKpiList = tool(
    async () => {
      assertOrgId(ctx.orgId)

      const kpis = await KPI.find({ ...orgFilter })
        .select("name category weight target unit description")
        .lean()

      return JSON.stringify({
        totalKpis: kpis.length,
        kpis: kpis.map((k) => ({
          name: k.name,
          category: k.category || "General",
          weight: k.weight,
          target: k.target,
          unit: k.unit,
          description: k.description || "",
        })),
      })
    },
    {
      name: "get_kpi_list",
      description:
        "List all configured KPIs for this company including name, category, weight, target, and unit. Use for 'what KPIs do we track?' or 'show me our performance metrics'.",
      schema: emptyArgsSchema,
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // MEETINGS TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getMeetingSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

      const meetings = await Meeting.find({
        ...orgFilter,
        created_at: { $gte: start, $lte: end },
      })
        .select("title status meeting_type scheduled_at ai_processed ai_summary actual_start_time actual_end_time organizer_id")
        .lean()

      const byStatus: Record<string, number> = {}
      const byType: Record<string, number> = {}
      for (const m of meetings) {
        const status = String(m.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
        const type = String(m.meeting_type || "unknown")
        byType[type] = (byType[type] || 0) + 1
      }

      const aiProcessed = meetings.filter((m) => m.ai_processed).length
      const upcoming = meetings
        .filter((m) => m.status === "scheduled" && m.scheduled_at && new Date(m.scheduled_at) >= new Date())
        .sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())
        .slice(0, 5)
        .map((m) => ({
          title: m.title,
          scheduledAt: m.scheduled_at ? new Date(m.scheduled_at).toISOString() : null,
          type: m.meeting_type,
        }))

      return JSON.stringify({
        period: label,
        totalMeetings: meetings.length,
        byStatus,
        byType,
        aiProcessedCount: aiProcessed,
        upcomingMeetings: upcoming,
      })
    },
    {
      name: "get_meeting_summary",
      description:
        "Meeting statistics: total meetings, status breakdown (scheduled/completed/cancelled), types, AI-processed count, and upcoming meetings. Use for 'how many meetings this month?', 'upcoming meetings', or 'meeting activity'.",
      schema: dateRangeSchema,
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // PDP TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getPdpSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)

      const filter: any = { ...orgFilter }
      if (input.period) filter.period = input.period
      if (input.status) filter.status = input.status

      const pdps = await PDP.find(filter)
        .select("user_id status overallProgress period")
        .limit(200)
        .lean()

      if (!pdps.length) {
        return JSON.stringify({ message: "No PDPs found for the specified criteria." })
      }

      const byStatus: Record<string, number> = {}
      for (const p of pdps) {
        const s = String(p.status || "unknown")
        byStatus[s] = (byStatus[s] || 0) + 1
      }

      const avgProgress =
        pdps.reduce((sum, p) => sum + Number(p.overallProgress || 0), 0) / pdps.length

      return JSON.stringify({
        period: input.period || "all",
        totalPdps: pdps.length,
        avgProgressPercent: Number(avgProgress.toFixed(1)),
        byStatus,
        approvedCount: byStatus["approved"] || 0,
        pendingReviewCount: byStatus["submitted"] || 0,
        draftCount: byStatus["draft"] || 0,
      })
    },
    {
      name: "get_pdp_summary",
      description:
        "Personal Development Plan (PDP) overview: total PDPs, average progress, and breakdown by status (draft/submitted/approved/completed). Use for 'PDP progress', 'how many PDPs are pending review?', or 'development plan status'.",
      schema: z.object({
        period: z.string().optional().describe("Filter by PDP period e.g. '2026-Q1'. Leave blank for all."),
        status: z
          .enum(["draft", "submitted", "approved", "rejected", "completed"])
          .optional()
          .describe("Filter by PDP status."),
      }),
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // FEEDBACK TOOLS
  // ─────────────────────────────────────────────────────────────────────────────

  const getFeedbackSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

      const feedbacks = await Feedback.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("feedback_type rating status anonymous")
        .lean()

      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      let totalRating = 0
      let ratedCount = 0

      for (const f of feedbacks) {
        const type = String(f.feedback_type || "unknown")
        byType[type] = (byType[type] || 0) + 1
        const status = String(f.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
        if (f.rating) {
          totalRating += Number(f.rating)
          ratedCount++
        }
      }

      return JSON.stringify({
        period: label,
        totalFeedbackSubmissions: feedbacks.length,
        avgRating: ratedCount > 0 ? Number((totalRating / ratedCount).toFixed(2)) : null,
        anonymousCount: feedbacks.filter((f) => f.anonymous).length,
        byType,
        byStatus,
      })
    },
    {
      name: "get_feedback_summary",
      description:
        "Feedback statistics: total submissions, average rating, feedback types (360/upward/peer/downward), and anonymous count. Use for 'how much feedback has been given?', 'average feedback score', or 'feedback activity'.",
      schema: dateRangeSchema,
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // ALERTS TOOL
  // ─────────────────────────────────────────────────────────────────────────────

  const getActiveAlerts = tool(
    async () => {
      assertOrgId(ctx.orgId)

      const alerts = await Alert.find({
        ...orgFilter,
        resolved: { $ne: true },
      })
        .select("type severity message createdAt metadata")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()

      const bySeverity: Record<string, number> = {}
      const byType: Record<string, number> = {}
      for (const a of alerts) {
        const sev = String(a.severity || "low")
        bySeverity[sev] = (bySeverity[sev] || 0) + 1
        const type = String(a.type || "unknown")
        byType[type] = (byType[type] || 0) + 1
      }

      return JSON.stringify({
        totalActiveAlerts: alerts.length,
        bySeverity,
        byType,
        recentAlerts: alerts.slice(0, 10).map((a) => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
          createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : null,
        })),
      })
    },
    {
      name: "get_active_alerts",
      description:
        "Current unresolved system alerts by severity and type (contract expiry, low performance, attendance anomalies, incomplete PDPs, etc.). Use for 'what alerts are active?', 'urgent issues', or 'what needs attention?'.",
      schema: emptyArgsSchema,
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // BUSINESS SNAPSHOT (multi-domain summary)
  // ─────────────────────────────────────────────────────────────────────────────

  const getBusinessSnapshot = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const now = new Date()

      // Run core queries in parallel for speed
      const [sales, invoices, employees, leaveRequests, tasks, attendance, alerts, machines, clients] = await Promise.all([
        StockSale.find({ ...orgFilter, createdAt: { $gte: start, $lte: end } })
          .select("quantitySold soldPrice")
          .lean(),
        StockInvoice.find({ ...orgFilter, status: "issued", createdAt: { $gte: start, $lte: end } })
          .select("subTotal")
          .lean(),
        User.countDocuments({ ...orgFilter, status: "active" }),
        LeaveRequest.countDocuments({ org_id: ctx.orgId, status: "pending" }),
        Task.countDocuments({ org_id: ctx.orgId, status: { $in: ["pending", "in_progress"] }, due_date: { $lt: now } }),
        Attendance.find({ org_id: ctx.orgId, date: { $gte: start, $lte: end } }).select("status").lean(),
        Alert.countDocuments({ ...orgFilter, resolved: { $ne: true }, severity: { $in: ["high", "critical"] } }),
        InstalledMachine.countDocuments({ ...orgFilter, isActive: true }),
        StockClient.countDocuments({ ...orgFilter }),
      ])

      const totalRevenue = sales.reduce(
        (sum, s) => sum + Number(s.quantitySold || 0) * Number(s.soldPrice || 0), 0,
      )
      const unpaidInvoiceValue = invoices.reduce((sum, i) => sum + Number(i.subTotal || 0), 0)
      const presentCount = attendance.filter((a) => ["present", "late", "half_day"].includes(String(a.status))).length
      const attendanceRate = attendance.length > 0 ? Number(((presentCount / attendance.length) * 100).toFixed(1)) : null

      return JSON.stringify({
        period: label,
        sales: {
          transactions: sales.length,
          totalRevenue: Number(totalRevenue.toFixed(2)),
        },
        finance: {
          unpaidInvoicesValue: Number(unpaidInvoiceValue.toFixed(2)),
        },
        workforce: {
          activeEmployees: employees,
          pendingLeaveRequests: leaveRequests,
          overdueTaskCount: tasks,
          attendanceRatePercent: attendanceRate,
        },
        clients: {
          savedClientProfiles: clients,
          activeInstalledMachines: machines,
        },
        alerts: {
          highOrCriticalCount: alerts,
        },
        scope: "All figures are limited to your company (org) only.",
      })
    },
    {
      name: "get_business_snapshot",
      description:
        "A quick cross-department overview combining sales revenue, unpaid invoices, active employees, pending leave, overdue tasks, attendance rate, clients, installed machines, and critical alerts. Use for 'give me a business summary', 'company overview', 'how are we doing?', or 'dashboard summary'.",
      schema: dateRangeSchema,
    },
  )

  const getClientDirectory = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const q = String((input as any).query || "").trim().toLowerCase()
      const limit = Math.min(Math.max(Number((input as any).limit || 20), 1), 80)
      const filter: Record<string, unknown> = { ...orgFilter }
      if (q) {
        filter.$or = [
          { sourceName: new RegExp(escapeRegex(q), "i") },
          { legalName: new RegExp(escapeRegex(q), "i") },
          { sourceLocation: new RegExp(escapeRegex(q), "i") },
          { sourceNumber: new RegExp(escapeRegex(q), "i") },
          { contactPerson: new RegExp(escapeRegex(q), "i") },
          { "contacts.name": new RegExp(escapeRegex(q), "i") },
          { "contacts.role": new RegExp(escapeRegex(q), "i") },
          { "contacts.phone": new RegExp(escapeRegex(q), "i") },
          { "contacts.email": new RegExp(escapeRegex(q), "i") },
        ]
      }
      const [clients, groups, total] = await Promise.all([
        StockClient.find(filter)
          .select(
            "sourceName sourceNumber sourceLocation legalName contactPerson email contacts groupIds",
          )
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean(),
        StockClientGroup.find(orgFilter).select("name memberKeys").lean(),
        StockClient.countDocuments(filter),
      ])
      return JSON.stringify({
        matched: clients.length,
        totalMatching: total,
        clients: clients.map((c: any) => {
          const key = normalizeClientKey(
            c.sourceName,
            c.sourceNumber,
            c.sourceLocation,
          )
          const actives = (c.contacts || []).filter((contact: any) => contact?.isActive)
          return {
            name: c.legalName || c.sourceName,
            facilityNumber: c.sourceNumber,
            location: c.sourceLocation,
            primaryContact: c.contactPerson,
            email: c.email,
            activeContacts: actives.length
              ? actives.map((contact: any) => ({
                  role: contact.role,
                  name: contact.name,
                  phone: contact.phone,
                  email: contact.email,
                }))
              : undefined,
            contacts: (c.contacts || []).map((contact: any) => ({
              role: contact.role,
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              isActive: Boolean(contact.isActive),
            })),
            groups: groups
              .filter((g: any) => (g.memberKeys || []).includes(key))
              .map((g: any) => g.name),
          }
        }),
      })
    },
    {
      name: "get_client_directory",
      description:
        "Search company clients/facilities including multi-role contacts (doctor, lab tech, etc.) and group membership. Use for 'list clients', 'find hospital X contacts', 'who is the lab technician at Y?'.",
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe("Optional name, location, contact, phone, or email search"),
        limit: z.number().optional().describe("Max results (default 20)"),
      }),
    },
  )

  const getClientGroupsSummary = tool(
    async () => {
      assertOrgId(ctx.orgId)
      const groups = await StockClientGroup.find(orgFilter).lean()
      return JSON.stringify({
        groupCount: groups.length,
        groups: groups.map((g: any) => ({
          name: g.name,
          description: g.description || "",
          memberCount: Array.isArray(g.memberKeys) ? g.memberKeys.length : 0,
        })),
      })
    },
    {
      name: "get_client_groups_summary",
      description:
        "List client groups (e.g. Private, Public) and member counts for this company. Use for 'what client groups do we have?', 'how many private clients?'.",
      schema: emptyArgsSchema,
    },
  )

  const getClientHistory = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const query = String((input as any).query || "").trim()
      const limit = Math.min(Math.max(Number((input as any).limit || 25), 1), 60)
      if (!query) {
        return JSON.stringify({
          error: "Provide a client/facility name or phone number in query.",
        })
      }

      const regex = new RegExp(escapeRegex(query), "i")
      const clients = await StockClient.find({
        ...orgFilter,
        $or: [
          { sourceName: regex },
          { legalName: regex },
          { sourceNumber: regex },
          { contactPerson: regex },
          { "contacts.name": regex },
          { "contacts.phone": regex },
        ],
      })
        .select(
          "sourceName sourceNumber sourceLocation legalName contactPerson email contacts",
        )
        .limit(8)
        .lean()

      const phoneCandidates = new Set<string>()
      for (const client of clients as any[]) {
        if (client.sourceNumber) phoneCandidates.add(String(client.sourceNumber))
        for (const contact of client.contacts || []) {
          if (contact?.phone) phoneCandidates.add(String(contact.phone))
        }
      }
      if (/^\+?\d[\d\s-]{6,}$/.test(query)) phoneCandidates.add(query)

      const phoneRegexes = Array.from(phoneCandidates)
        .map((phone) => phone.replace(/\D/g, ""))
        .filter((digits) => digits.length >= 7)
        .map((digits) => new RegExp(escapeRegex(digits.slice(-9))))

      const conversationFilter: Record<string, unknown> = {
        ...orgFilter,
        $or: [{ clientName: regex }, { clientPhone: regex }, { note: regex }],
      }
      if (phoneRegexes.length > 0) {
        ;(conversationFilter.$or as any[]).push(
          ...phoneRegexes.map((phoneRegex) => ({ clientPhone: phoneRegex })),
        )
      }

      const callFilter: Record<string, unknown> = { ...orgFilter }
      if (phoneRegexes.length > 0) {
        callFilter.$or = phoneRegexes.map((phoneRegex) => ({
          phoneNumber: phoneRegex,
        }))
      } else {
        callFilter.phoneNumber = regex
      }

      const [conversations, callLogs, quotations, invoices, machines, tickets] =
        await Promise.all([
          ClientConversation.find(conversationFilter)
            .select(
              "clientName clientPhone note status followUpDate roomName createdAt quotation_id",
            )
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),
          CallLog.find(callFilter)
            .select(
              "phoneNumber direction status durationSeconds notes createdAt",
            )
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),
          StockQuotation.find({
            ...orgFilter,
            $or: [
              { "client.name": regex },
              { "client.number": regex },
              { "client.location": regex },
            ],
          })
            .select("quotationNumber client status subTotal createdAt")
            .sort({ createdAt: -1 })
            .limit(15)
            .lean(),
          StockInvoice.find({
            ...orgFilter,
            $or: [
              { "client.name": regex },
              { "client.number": regex },
              { "client.location": regex },
            ],
          })
            .select("invoiceNumber client status subTotal createdAt")
            .sort({ createdAt: -1 })
            .limit(15)
            .lean(),
          InstalledMachine.find({
            ...orgFilter,
            isActive: true,
            $or: [
              { "client.name": regex },
              { "client.number": regex },
              { "client.location": regex },
            ],
          })
            .select(
              "productName serialNumber client status nextServiceDate installationLocation",
            )
            .limit(20)
            .lean(),
          Ticket.find({
            ...orgFilter,
            $or: [
              { title: regex },
              { description: regex },
              { callerName: regex },
              { callerPhone: regex },
            ],
          })
            .select(
              "title status callerName callerPhone resolutionType createdAt resolvedDate machine_id",
            )
            .sort({ createdAt: -1 })
            .limit(15)
            .lean(),
        ])

      return JSON.stringify({
        query,
        matchedClients: (clients as any[]).map((c) => ({
          name: c.legalName || c.sourceName,
          number: c.sourceNumber,
          location: c.sourceLocation,
          contactPerson: c.contactPerson,
          contacts: c.contacts || [],
        })),
        conversations: (conversations as any[]).map((row) => ({
          clientName: row.clientName,
          clientPhone: row.clientPhone,
          status: row.status,
          note: row.note,
          followUpDate: row.followUpDate,
          room: row.roomName,
          date: row.createdAt,
        })),
        callLogs: (callLogs as any[]).map((row) => ({
          phoneNumber: row.phoneNumber,
          direction: row.direction,
          status: row.status,
          durationSeconds: row.durationSeconds,
          notes: row.notes,
          date: row.createdAt,
        })),
        quotations: (quotations as any[]).map((row) => ({
          number: row.quotationNumber,
          client: row.client?.name,
          status: row.status,
          amount: row.subTotal,
          date: row.createdAt,
        })),
        invoices: (invoices as any[]).map((row) => ({
          number: row.invoiceNumber,
          client: row.client?.name,
          status: row.status,
          amount: row.subTotal,
          date: row.createdAt,
        })),
        installedMachines: (machines as any[]).map((row) => ({
          product: row.productName,
          serial: row.serialNumber,
          client: row.client?.name,
          status: row.status,
          nextServiceDate: row.nextServiceDate,
          location: row.installationLocation || row.client?.location,
        })),
        tickets: (tickets as any[]).map((row) => ({
          title: row.title,
          status: row.status,
          callerName: row.callerName,
          callerPhone: row.callerPhone,
          resolutionType: row.resolutionType,
          date: row.createdAt,
          resolvedDate: row.resolvedDate,
        })),
      })
    },
    {
      name: "get_client_history",
      description:
        "Full client/facility history: CRM conversation notes, call logs, quotations, invoices, installed machines, and service tickets. Use for 'client history', 'what did we discuss with X?', 'follow-ups for hospital Y', 'activity for client Z'.",
      schema: z.object({
        query: z
          .string()
          .describe("Client/facility name or phone number to look up"),
        limit: z
          .number()
          .optional()
          .describe("Max conversation/call rows (default 25)"),
      }),
    },
  )

  const getInstalledMachinesSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const status = String((input as any).status || "").trim()
      const query = String((input as any).query || "").trim()
      const limit = Math.min(Math.max(Number((input as any).limit || 50), 1), 150)
      const filter: Record<string, unknown> = { ...orgFilter, isActive: true }
      if (status) filter.status = status
      if (query) {
        const regex = new RegExp(escapeRegex(query), "i")
        filter.$or = [
          { productName: regex },
          { serialNumber: regex },
          { installationLocation: regex },
          { attendant: regex },
          { "client.name": regex },
          { "client.number": regex },
          { "client.location": regex },
          { "client.contactPerson": regex },
        ]
      }
      const [machines, total] = await Promise.all([
        InstalledMachine.find(filter)
          .select(
            "productName serialNumber client status installationLocation nextServiceDate attendant attendantNumber installationDate warrantyUntil",
          )
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean(),
        InstalledMachine.countDocuments(filter),
      ])
      const byStatus: Record<string, number> = {}
      for (const m of machines as any[]) {
        const s = String(m.status || "active")
        byStatus[s] = (byStatus[s] || 0) + 1
      }
      return JSON.stringify({
        matched: machines.length,
        totalMatching: total,
        byStatus,
        machines: (machines as any[]).map((m) => ({
          product: m.productName,
          serial: m.serialNumber,
          client: m.client?.name,
          clientPhone: m.client?.number,
          clientLocation: m.client?.location,
          location: m.installationLocation || m.client?.location,
          status: m.status,
          nextServiceDate: m.nextServiceDate,
          installationDate: m.installationDate,
          warrantyUntil: m.warrantyUntil,
          attendant: m.attendant,
          attendantPhone: m.attendantNumber,
        })),
      })
    },
    {
      name: "get_installed_machines_summary",
      description:
        "Search installed machines by facility, serial, product, attendant, or status. Use for 'how many installed machines?', 'machines at hospital X', 'machines needing service', 'find serial Y'.",
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe("Facility, product, serial, attendant, or location search"),
        status: z
          .enum(["active", "maintenance", "ended", "installation_pending"])
          .optional()
          .describe("Optional status filter"),
        limit: z.number().optional().describe("Max machines to return (default 50)"),
      }),
    },
  )

  const getMachineTicketsSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const query = String((input as any).query || "").trim()
      const status = String((input as any).status || "").trim()
      const limit = Math.min(Math.max(Number((input as any).limit || 30), 1), 80)
      const filter: Record<string, unknown> = { ...orgFilter }
      if (status) filter.status = status
      if (query) {
        const regex = new RegExp(escapeRegex(query), "i")
        filter.$or = [
          { title: regex },
          { description: regex },
          { callerName: regex },
          { callerPhone: regex },
        ]
      }
      const [tickets, total] = await Promise.all([
        Ticket.find(filter)
          .select(
            "title description status callerName callerPhone resolutionType resolutionNote machine_id createdAt resolvedDate quotationNumber",
          )
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean(),
        Ticket.countDocuments(filter),
      ])

      const machineIds = Array.from(
        new Set(
          (tickets as any[])
            .map((ticket) => String(ticket.machine_id || ""))
            .filter(Boolean),
        ),
      )
      const machines = machineIds.length
        ? await InstalledMachine.find({
            ...orgFilter,
            _id: { $in: machineIds },
          })
            .select("productName serialNumber client")
            .lean()
        : []
      const machineMap = new Map(
        (machines as any[]).map((machine) => [String(machine._id), machine]),
      )

      const byStatus: Record<string, number> = {}
      for (const ticket of tickets as any[]) {
        const s = String(ticket.status || "Open")
        byStatus[s] = (byStatus[s] || 0) + 1
      }

      return JSON.stringify({
        matched: tickets.length,
        totalMatching: total,
        byStatus,
        tickets: (tickets as any[]).map((ticket) => {
          const machine = machineMap.get(String(ticket.machine_id || ""))
          return {
            title: ticket.title,
            status: ticket.status,
            callerName: ticket.callerName,
            callerPhone: ticket.callerPhone,
            resolutionType: ticket.resolutionType,
            resolutionNote: ticket.resolutionNote,
            quotationNumber: ticket.quotationNumber,
            date: ticket.createdAt,
            resolvedDate: ticket.resolvedDate,
            machine: machine
              ? {
                  product: machine.productName,
                  serial: machine.serialNumber,
                  client: machine.client?.name,
                }
              : undefined,
          }
        }),
      })
    },
    {
      name: "get_machine_tickets_summary",
      description:
        "Service tickets for installed machines: open/closed status, callers, linked machine/facility, and resolutions. Use for 'open tickets', 'machine issues', 'service tickets for hospital X'.",
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe("Optional search by title, caller, phone, or description"),
        status: z
          .string()
          .optional()
          .describe("Optional ticket status filter e.g. Open, Resolved"),
        limit: z.number().optional().describe("Max tickets (default 30)"),
      }),
    },
  )

  const getDispatchSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const invoices = await StockInvoice.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("invoiceNumber client subTotal status dispatch")
        .lean()
      const byDispatch: Record<string, number> = {}
      for (const inv of invoices as any[]) {
        const s = String(inv.dispatch?.status || "not_assigned")
        byDispatch[s] = (byDispatch[s] || 0) + 1
      }
      return JSON.stringify({
        period: label,
        invoiceCount: invoices.length,
        byDispatchStatus: byDispatch,
        pendingDelivery: (invoices as any[]).filter((i) =>
          ["not_assigned", "assigned", "packing", "packed", "dispatched"].includes(
            String(i.dispatch?.status || "not_assigned"),
          ),
        ).length,
      })
    },
    {
      name: "get_dispatch_summary",
      description:
        "Dispatch pipeline for company invoices: counts by dispatch status and pending deliveries. Use for 'dispatch status', 'pending deliveries', 'how many packed?'.",
      schema: dateRangeSchema,
    },
  )

  const getPaymentsAndExpensesSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const [payments, expenses] = await Promise.all([
        StockInvoicePayment.find({
          ...orgFilter,
          createdAt: { $gte: start, $lte: end },
        })
          .select("amount paymentMethod")
          .lean(),
        StockExpense.find({
          ...orgFilter,
          createdAt: { $gte: start, $lte: end },
        })
          .select("amount purpose")
          .lean(),
      ])
      const paymentTotal = payments.reduce((s, p: any) => s + Number(p.amount || 0), 0)
      const expenseTotal = expenses.reduce((s, e: any) => s + Number(e.amount || 0), 0)
      return JSON.stringify({
        period: label,
        payments: { count: payments.length, total: Number(paymentTotal.toFixed(2)) },
        expenses: { count: expenses.length, total: Number(expenseTotal.toFixed(2)) },
        net: Number((paymentTotal - expenseTotal).toFixed(2)),
      })
    },
    {
      name: "get_payments_and_expenses_summary",
      description:
        "Company payments received and expenses for a period. Use for 'how much did we collect?', 'expenses this month?', 'cash in vs out'.",
      schema: dateRangeSchema,
    },
  )

  const getComplaintsSummary = tool(
    async () => {
      assertOrgId(ctx.orgId)
      const complaints = await ClientComplaint.find(orgFilter)
        .select("status priority category createdAt")
        .limit(100)
        .lean()
      const byStatus: Record<string, number> = {}
      for (const c of complaints as any[]) {
        const s = String(c.status || "open")
        byStatus[s] = (byStatus[s] || 0) + 1
      }
      return JSON.stringify({
        total: complaints.length,
        byStatus,
      })
    },
    {
      name: "get_complaints_summary",
      description:
        "Client complaints summary for this company by status. Use for 'open complaints', 'customer issues'.",
      schema: emptyArgsSchema,
    },
  )

  const getMyLeave = tool(
    async () => {
      assertOrgId(ctx.orgId)
      const year = new Date().getUTCFullYear()
      const [balance, requests] = await Promise.all([
        LeaveBalance.findOne({ org_id: ctx.orgId, user_id: ctx.userId, year }).lean(),
        LeaveRequest.find({ org_id: ctx.orgId, user_id: ctx.userId }).sort({ createdAt: -1 }).limit(12).lean(),
      ])
      return JSON.stringify({
        year,
        balance: balance
          ? {
              annualRemaining: Number(balance.annual_total || 0) - Number(balance.annual_used || 0),
              annualTotal: balance.annual_total,
              sickRemaining: Number(balance.sick_total || 0) - Number(balance.sick_used || 0),
              sickTotal: balance.sick_total,
              unpaidUsed: balance.unpaid_used,
            }
          : { message: "No leave balance on file yet. Applying for leave will create one." },
        recentRequests: requests.map((req) => ({
          type: req.type,
          status: req.status,
          startDate: req.startDate ? new Date(req.startDate).toISOString().split("T")[0] : null,
          endDate: req.endDate ? new Date(req.endDate).toISOString().split("T")[0] : null,
          reason: req.reason || "",
        })),
      })
    },
    {
      name: "get_my_leave",
      description:
        "The current user's leave balance and recent leave requests. Use for 'how many leave days do I have?', 'is my leave approved?', or 'show my leave requests'.",
      schema: emptyArgsSchema,
    },
  )

  const getMyFieldWork = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const startKey = start.toISOString().split("T")[0]
      const endKey = end.toISOString().split("T")[0]
      const [planners, visits, quotes] = await Promise.all([
        SalesPlanner.find({
          org_id: ctx.orgId,
          userId: ctx.userId,
          date: { $gte: startKey, $lte: endKey },
        })
          .select("date status visits projectedExpenses")
          .lean(),
        SalesVisit.find({
          org_id: ctx.orgId,
          userId: ctx.userId,
          $or: [
            { visitDate: { $gte: startKey, $lte: endKey } },
            { checkInAt: { $gte: start, $lte: end } },
          ],
        })
          .select("clientName outcome visitDate checkInAt followUpDate")
          .sort({ checkInAt: -1 })
          .limit(40)
          .lean(),
        SalesQuote.find({
          org_id: ctx.orgId,
          userId: ctx.userId,
          createdAt: { $gte: start, $lte: end },
        })
          .select("quoteNumber clientName status grandTotal createdAt")
          .lean(),
      ])
      const plannerByStatus: Record<string, number> = {}
      for (const plan of planners) {
        const status = String(plan.status || "pending")
        plannerByStatus[status] = (plannerByStatus[status] || 0) + 1
      }
      const quoteByStatus: Record<string, number> = {}
      let quoteValue = 0
      for (const quote of quotes) {
        const status = String(quote.status || "draft")
        quoteByStatus[status] = (quoteByStatus[status] || 0) + 1
        quoteValue += Number(quote.grandTotal || 0)
      }
      return JSON.stringify({
        period: label,
        planners: {
          count: planners.length,
          byStatus: plannerByStatus,
          sample: planners.slice(0, 8).map((plan) => ({
            date: plan.date,
            status: plan.status,
            visitCount: plan.visits?.length || 0,
          })),
        },
        visits: {
          count: visits.length,
          sample: visits.slice(0, 10).map((visit) => ({
            clientName: visit.clientName,
            outcome: visit.outcome || "Logged",
            date: visit.visitDate || (visit.checkInAt ? new Date(visit.checkInAt).toISOString().split("T")[0] : null),
            followUpDate: visit.followUpDate ? new Date(visit.followUpDate).toISOString().split("T")[0] : null,
          })),
        },
        quotes: {
          count: quotes.length,
          totalValue: Number(quoteValue.toFixed(2)),
          byStatus: quoteByStatus,
        },
      })
    },
    {
      name: "get_my_field_work",
      description:
        "This sales person's planners, logged visits, and quotations for a period. Use for 'what's on my planner?', 'how many visits did I log?', or 'which quotes are pending?'.",
      schema: dateRangeSchema,
    },
  )

  if (ctx.role === "sales_rep") {
    return [
      getMyLeave,
      getMyFieldWork,
      getInventorySummary,
      getTopProducts,
      getClientDirectory,
      getInstalledMachinesSummary,
      getMyTaskSummary,
    ]
  }

  return [
    getSalesSummary,
    getTopProducts,
    getInventorySummary,
    getInvoiceSummary,
    getQuotationSummary,
    getSalesByCustomer,
    getSalesPerformanceTrend,
    getProductCategoryPerformance,
    getClientDirectory,
    getClientGroupsSummary,
    getClientHistory,
    getInstalledMachinesSummary,
    getMachineTicketsSummary,
    getDispatchSummary,
    getPaymentsAndExpensesSummary,
    getComplaintsSummary,
    getEmployeeSummary,
    searchEmployees,
    getLeaveSummary,
    getLeaveBalance,
    getMyLeave,
    getPayrollSummary,
    getPayrollTrend,
    getAttendanceSummary,
    getMyTaskSummary,
    getTaskSummary,
    getPerformanceSummary,
    getKpiList,
    getMeetingSummary,
    getPdpSummary,
    getFeedbackSummary,
    getActiveAlerts,
    getBusinessSnapshot,
  ]
}