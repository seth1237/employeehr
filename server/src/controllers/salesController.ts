import type { Response } from "express"
import { Types } from "mongoose"
import type { AuthenticatedRequest } from "../middleware/auth"
import { SalesDailyReport } from "../models/SalesDailyReport"
import { SalesVisit } from "../models/SalesVisit"
import { SalesQuote } from "../models/SalesQuote"
import { StockQuotation } from "../models/StockQuotation"
import { StockProduct } from "../models/StockProduct"
import { StockClient, DEFAULT_CONTACT_ROLES } from "../models/StockClient"
import { StockClientGroup } from "../models/StockClientGroup"
import { StockCategory } from "../models/StockCategory"
import { SalesClientActivity } from "../models/SalesClientActivity"
import { User } from "../models/User"
import { createOrUpdateStockClient } from "../services/stockClientSave.service"
import { SalesPlanner } from "../models/SalesPlanner"
import { Company } from "../models/Company"
import { StockInvoice } from "../models/StockInvoice"
import { SalesRepTarget } from "../models/SalesRepTarget"
import {
  currentPeriods,
  inPeriod,
  invoiceAmount,
  isGeneratedInvoice,
  type PeriodKind,
  type PeriodWindow,
} from "../lib/sales-periods"
const VAT_RATE = 16
const ADMIN_ROLES = new Set(["company_admin", "admin", "hr", "super_admin"])

function isAdminRole(role?: string) {
  return Boolean(role && ADMIN_ROLES.has(role))
}

function moneyPct(actual: number, target: number) {
  if (!target || target <= 0) return null
  return Math.round((actual / target) * 100)
}

function summarizeSales(
  invoices: Array<{ status?: string; createdAt?: Date; grandTotal?: number; subTotal?: number }>,
  window: PeriodWindow,
  target: number,
) {
  const rows = invoices.filter((invoice) => isGeneratedInvoice(invoice) && inPeriod(invoice.createdAt, window))
  const actual = rows.reduce((sum, invoice) => sum + invoiceAmount(invoice), 0)
  return {
    label: window.label,
    actual,
    target,
    count: rows.length,
    percent: moneyPct(actual, target),
  }
}

function plannerDayBudget(plan: any) {
  const visits = Array.isArray(plan?.visits) ? plan.visits : []
  if (plan?.budget && (plan.budget.transport != null || plan.budget.nightOut != null || plan.budget.nightOutAmount != null)) {
    const transport = Number(plan.budget.transport || 0)
    const nightOut = Boolean(plan.budget.nightOut)
    const nightOutAmount = nightOut ? Number(plan.budget.nightOutAmount || 0) : 0
    return {
      transport,
      nightOut,
      nightOutAmount,
      total: transport + nightOutAmount,
      visitCount: visits.length,
    }
  }
  let transport = 0
  let nightOuts = 0
  for (const visit of visits) {
    transport += Number(visit?.expenses?.transport || 0)
    if (visit?.expenses?.nightOut || visit?.nightOut) nightOuts += 1
  }
  return {
    transport,
    nightOut: nightOuts > 0,
    nightOutAmount: 0,
    total: transport,
    visitCount: visits.length,
  }
}

function summarizeExpenses(planners: any[], window: PeriodWindow) {
  const lines: Array<{
    date: string
    clientName: string
    transport: number
    nightOut: boolean
    nightOutAmount: number
    total: number
  }> = []
  let transport = 0
  let nightOuts = 0
  let nightOutAmount = 0
  let visitCount = 0
  for (const plan of planners) {
    if (!inPeriod(plan.date, window)) continue
    const day = plannerDayBudget(plan)
    transport += day.transport
    nightOutAmount += day.nightOutAmount
    visitCount += day.visitCount
    if (day.nightOut) nightOuts += 1
    if (day.total > 0 || day.nightOut) {
      lines.push({
        date: String(plan.date || ""),
        clientName: `${day.visitCount} visit${day.visitCount === 1 ? "" : "s"}`,
        transport: day.transport,
        nightOut: day.nightOut,
        nightOutAmount: day.nightOutAmount,
        total: day.total,
      })
    }
  }
  return {
    label: window.label,
    transport,
    nightOuts,
    nightOutAmount,
    total: transport + nightOutAmount,
    visitCount,
    lines,
  }
}

function performanceForUser(
  invoices: any[],
  planners: any[],
  target: { weeklyAmount?: number; monthlyAmount?: number; quarterlyAmount?: number } | null,
  periods: Record<PeriodKind, PeriodWindow>,
) {
  const weeklyTarget = Number(target?.weeklyAmount || 0)
  const monthlyTarget = Number(target?.monthlyAmount || 0)
  const quarterlyTarget = Number(target?.quarterlyAmount || 0)
  return {
    sales: {
      weekly: summarizeSales(invoices, periods.weekly, weeklyTarget),
      monthly: summarizeSales(invoices, periods.monthly, monthlyTarget),
      quarterly: summarizeSales(invoices, periods.quarterly, quarterlyTarget),
    },
    expenses: {
      weekly: summarizeExpenses(planners, periods.weekly),
      monthly: summarizeExpenses(planners, periods.monthly),
      quarterly: summarizeExpenses(planners, periods.quarterly),
    },
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function parseGps(value: unknown) {
  if (!value || typeof value !== "object") return undefined
  const raw = value as { lat?: unknown; lng?: unknown; accuracy?: unknown }
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  const accuracy = Number(raw.accuracy)
  return {
    lat,
    lng,
    ...(Number.isFinite(accuracy) ? { accuracy } : {}),
  }
}

function parseInterestCategories(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item: any) => ({
      categoryId: String(item.categoryId || "").trim(),
      categoryName: String(item.categoryName || "").trim(),
      note: String(item.note || "").trim() || undefined,
    }))
    .filter((item: { categoryId: string; categoryName: string }) => item.categoryId && item.categoryName)
}

function isVisitLocked(visit: { status?: string } | null | undefined) {
  return visit?.status !== "unlocked"
}

function applyVisitFields(visit: any, body: any, extras: Record<string, unknown> = {}) {
  visit.clientPhone = String(body?.clientPhone || "").trim() || undefined
  visit.customer_id = String(body?.customer_id || "").trim() || undefined
  visit.plannerId = String(body?.plannerId || "").trim() || undefined
  visit.personMet = String(body?.personMet || "").trim() || undefined
  visit.personRole = String(body?.personRole || "").trim() || undefined
  visit.personPhone = String(body?.personPhone || "").trim() || undefined
  visit.personEmail = String(body?.personEmail || "").trim() || undefined
  visit.visitType = body?.visitType || visit.visitType || "scheduled"
  visit.purpose = String(body?.purpose || "").trim() || undefined
  visit.outcome = String(body?.outcome || "").trim() || undefined
  visit.outcomeDetail = String(body?.outcomeDetail || "").trim() || undefined
  visit.interestCategories = parseInterestCategories(body?.interestCategories)
  visit.gps = parseGps(body?.gps) || visit.gps
  visit.nextAction = String(body?.nextAction || "").trim() || undefined
  visit.followUpDate = body?.followUpDate ? new Date(body.followUpDate) : visit.followUpDate
  visit.notes = String(body?.notes || "").trim() || undefined
  visit.quote_id = String(body?.quote_id || "").trim() || undefined
  Object.assign(visit, extras)
  return visit
}

function visitCarriedOutDate(visit: any, reportDate?: string) {
  return String(visit?.visitDate || reportDate || toDateKey(visit?.checkInAt) || "").slice(0, 10)
}

function endOfLocalDay(dateKey: string) {
  return new Date(`${dateKey}T23:59:59.999`)
}

function toDateKey(value: Date | string | undefined) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function mapGps(gps: any) {
  const lat = Number(gps?.lat)
  const lng = Number(gps?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const accuracy = Number(gps?.accuracy)
  return {
    lat,
    lng,
    ...(Number.isFinite(accuracy) ? { accuracy } : {}),
  }
}

function hoursBetween(start?: Date | string | null, end?: Date | string | null) {
  if (!start || !end) return 0
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return ms > 0 ? Number((ms / 3_600_000).toFixed(2)) : 0
}

function expectedWorkdays(window: PeriodWindow, todayKey: string) {
  const days: string[] = []
  const cursor = new Date(window.from)
  while (cursor < window.to) {
    const key = toDateKey(cursor)
    const weekday = cursor.getDay()
    if (weekday !== 0 && weekday !== 6 && key <= todayKey) days.push(key)
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function serializePeriod(window: PeriodWindow, todayKey: string) {
  return {
    label: window.label,
    from: toDateKey(window.from),
    to: toDateKey(window.to),
    workdays: expectedWorkdays(window, todayKey),
  }
}

function summarizeAttendance(
  days: Array<{ date: string; startAt?: string | null; endAt?: string | null; hours: number; visitCount: number; startGps?: unknown; endGps?: unknown }>,
  workdays: string[],
) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  let present = 0
  let closed = 0
  let incomplete = 0
  let withLocation = 0
  let hours = 0
  let visits = 0
  for (const key of workdays) {
    const day = byDate.get(key)
    if (day?.startAt) {
      present += 1
      hours += Number(day.hours || 0)
      if (day.endAt) closed += 1
      else incomplete += 1
    }
    if (day?.startGps || day?.endGps) withLocation += 1
    visits += Number(day?.visitCount || 0)
  }
  const expected = workdays.length
  return {
    expected,
    present,
    closed,
    incomplete,
    absent: Math.max(expected - present, 0),
    withLocation,
    hours: Number(hours.toFixed(2)),
    visits,
    rate: expected > 0 ? Math.round((present / expected) * 100) : null,
  }
}

async function ensureTodayReport(org_id: string, userId: string, date: string) {
  const existing = await SalesDailyReport.findOne({ org_id, userId, date })
  if (existing) return existing
  return SalesDailyReport.create({
    org_id,
    userId,
    date,
    dayType: "working_day",
    status: "open",
  })
}

function computeQuoteTotals(items: Array<{
  quantity: number
  unitPrice: number
  taxRate?: number
  taxable?: boolean
}>) {
  return items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity || 0)
      const price = Number(item.unitPrice || 0)
      const base = qty * price
      const rate = item.taxable === false ? 0 : Number(item.taxRate || VAT_RATE)
      const taxAmount = Number(((base * rate) / 100).toFixed(2))
      acc.subTotal += Number(base.toFixed(2))
      acc.taxTotal += taxAmount
      acc.grandTotal += Number((base + taxAmount).toFixed(2))
      acc.items.push({
        taxRate: rate,
        taxAmount,
        lineTotal: Number((base + taxAmount).toFixed(2)),
      })
      return acc
    },
    { subTotal: 0, taxTotal: 0, grandTotal: 0, items: [] as Array<{ taxRate: number; taxAmount: number; lineTotal: number }> },
  )
}

function mapSalesClient(c: any, extra: Record<string, unknown> = {}) {
  return {
    _id: String(c._id),
    name: c.sourceName || c.legalName || "Client",
    legalName: c.legalName || c.sourceName || "",
    phone: c.sourceNumber || "",
    location: c.sourceLocation || "",
    contactPerson: c.contactPerson || "",
    email: c.email || "",
    contacts: Array.isArray(c.contacts) ? c.contacts : [],
    createdBy: c.createdBy,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    ...extra,
  }
}

function startOfLocalDay(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000`)
}

async function nextQuoteNumber(org_id: string) {
  const prefix = `SRQ-${new Date().getFullYear()}-`
  const latest = await SalesQuote.findOne({ org_id, quoteNumber: new RegExp(`^${prefix}`) })
    .sort({ quoteNumber: -1 })
    .select("quoteNumber")
    .lean()
  const last = Number(String(latest?.quoteNumber || "").split("-").pop() || 0)
  return `${prefix}${String(last + 1).padStart(4, "0")}`
}

export class SalesController {
  static async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const date = String(req.query.date || "").trim() || new Date().toISOString().slice(0, 10)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 6)
      const weekStartKey = weekStart.toISOString().slice(0, 10)

      const report = await ensureTodayReport(org_id, userId, date)
      const dayStart = startOfLocalDay(date)
      const dayEnd = endOfLocalDay(date)
      const [visits, quotes, followUps, revisionQuotes, staleQuotes, myClients, callsToday, recentActivities, todayPlanner, upcomingPlanners] =
        await Promise.all([
          SalesVisit.find({ org_id, userId, $or: [{ visitDate: date }, { report_id: String(report._id) }] }).sort({ checkInAt: -1 }).lean(),
          StockQuotation.find({ org_id, createdBy: userId }).sort({ createdAt: -1 }).limit(40).lean(),
          SalesVisit.find({
            org_id,
            userId,
            followUpDate: { $lte: dayEnd },
            outcome: { $in: ["follow-up needed", "quote requested"] },
          })
            .sort({ followUpDate: 1 })
            .limit(20)
            .lean(),
          StockQuotation.find({ org_id, createdBy: userId, status: "cancelled" }).sort({ updatedAt: -1 }).limit(10).lean(),
          StockQuotation.find({
            org_id,
            createdBy: userId,
            status: "draft",
            approvedAt: { $exists: true, $ne: null },
            $or: [{ convertedInvoiceId: { $exists: false } }, { convertedInvoiceId: null }, { convertedInvoiceId: "" }],
          })
            .sort({ approvedAt: 1 })
            .limit(10)
            .lean(),
          StockClient.find({ org_id, createdBy: userId }).sort({ updatedAt: -1 }).limit(8).lean(),
          SalesClientActivity.countDocuments({
            org_id,
            userId,
            type: "call",
            createdAt: { $gte: dayStart, $lte: dayEnd },
          }),
          SalesClientActivity.find({ org_id, userId }).sort({ createdAt: -1 }).limit(8).lean(),
          SalesPlanner.findOne({ org_id, userId, date }).lean(),
          SalesPlanner.find({
            org_id,
            userId,
            date: { $gt: date },
            status: { $in: ["pending", "approved"] },
          })
            .sort({ date: 1 })
            .limit(5)
            .lean(),
        ])

      const activityFollowUps = await SalesClientActivity.find({
        org_id,
        userId,
        followUpDate: { $lte: dayEnd },
        type: { $in: ["call", "follow_up", "note"] },
      })
        .sort({ followUpDate: 1 })
        .limit(10)
        .lean()

      const weekQuotes = quotes.filter((q) => toDateKey(q.createdAt) >= weekStartKey)
      const pipeline = {
        draft: quotes.filter((q) => q.status === "draft" && !q.approvedAt).length,
        submitted: quotes.filter((q) => q.status === "pending_approval").length,
        approved: quotes.filter((q) => q.status === "draft" && Boolean(q.approvedAt)).length,
        downloaded: quotes.filter((q) => q.status === "converted").length,
        rejected: quotes.filter((q) => q.status === "cancelled").length,
      }

      const myClientsCount = await StockClient.countDocuments({ org_id, createdBy: userId })
      const mapStockQuote = (q: any) => ({
        ...q,
        quoteNumber: q.quotationNumber,
        clientName: q.client?.name,
        clientPhone: q.client?.number,
        rejectionReason: q.status === "cancelled" ? "Rejected by admin" : undefined,
      })

      return res.status(200).json({
        success: true,
        data: {
          date,
          report,
          visits,
          reminders: {
            followUpsDue: [
              ...followUps,
              ...activityFollowUps.map((item) => ({
                _id: String(item._id),
                clientName: item.clientName,
                clientPhone: item.clientPhone,
                customer_id: item.customer_id,
                followUpDate: item.followUpDate,
                outcome: item.outcome || item.type,
                source: "activity",
              })),
            ],
            quotesNeedingRevision: revisionQuotes.map(mapStockQuote),
            quotesAwaitingDownload: staleQuotes.map(mapStockQuote),
          },
          kpis: {
            visitsToday: visits.length,
            plannedVisits: Number(todayPlanner?.visits?.length || report.plannedVisits || 0),
            quotesThisWeek: weekQuotes.length,
            quotesSubmitted: quotes.filter((q) => q.status !== "cancelled").length,
            quotesApproved: quotes.filter((q) => Boolean(q.approvedAt) || q.status === "converted").length,
            quoteValueThisWeek: weekQuotes.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0),
            myClients: myClientsCount,
            followUpsDue: followUps.length + activityFollowUps.length,
            quotesPending: pipeline.submitted,
            callsToday,
          },
          pipeline,
          myClients: myClients.map((c) => mapSalesClient(c, { mine: true })),
          recentActivities,
          todayPlanner,
          upcomingPlanners,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getTodayReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const date = String(req.query.date || "").trim() || new Date().toISOString().slice(0, 10)
      const report = await ensureTodayReport(org_id, userId, date)
      const visits = await SalesVisit.find({
        org_id,
        userId,
        $or: [{ visitDate: date }, { report_id: String(report._id) }],
      })
        .sort({ checkInAt: -1 })
        .lean()
      const unique = new Map<string, (typeof visits)[number]>()
      for (const visit of visits) unique.set(String(visit._id), visit)
      return res.status(200).json({ success: true, data: { report, visits: Array.from(unique.values()) } })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load report"
      return res.status(500).json({ success: false, message })
    }
  }

  static async updateTodayReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const date = String(req.body?.date || req.query.date || "").trim() || new Date().toISOString().slice(0, 10)
      const report = await ensureTodayReport(org_id, userId, date)
      if (report.status === "submitted" || report.status === "approved") {
        return res.status(400).json({ success: false, message: "This report is locked. Wait for revision if you need to edit." })
      }

      const allowed = [
        "dayType",
        "plannedVisits",
        "newLeads",
        "ordersCount",
        "ordersValue",
        "expenses",
        "mileage",
        "blockers",
        "notes",
      ] as const
      for (const key of allowed) {
        if (req.body?.[key] !== undefined) {
          ;(report as any)[key] = req.body[key]
        }
      }
      await report.save()
      return res.status(200).json({ success: true, data: report })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update report"
      return res.status(500).json({ success: false, message })
    }
  }

  static async startDay(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const date = String(req.body?.date || "").trim() || new Date().toISOString().slice(0, 10)
      const report = await ensureTodayReport(org_id, userId, date)
      if (!report.dayStartAt) {
        report.dayStartAt = new Date()
        const gps = parseGps(req.body?.gps)
        if (gps) report.dayStartGps = gps
        await report.save()
      }
      return res.status(200).json({ success: true, data: report })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start day"
      return res.status(500).json({ success: false, message })
    }
  }

  static async endDay(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const date = String(req.body?.date || "").trim() || new Date().toISOString().slice(0, 10)
      const report = await ensureTodayReport(org_id, userId, date)
      report.dayEndAt = new Date()
      const gps = parseGps(req.body?.gps)
      if (gps) report.dayEndGps = gps
      await report.save()
      return res.status(200).json({ success: true, data: report })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to end day"
      return res.status(500).json({ success: false, message })
    }
  }

  static async submitReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const report = await SalesDailyReport.findOne({ _id: req.params.id, org_id, userId })
      if (!report) return res.status(404).json({ success: false, message: "Report not found" })
      report.status = "submitted"
      report.submittedAt = new Date()
      await report.save()
      return res.status(200).json({ success: true, data: report })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit report"
      return res.status(500).json({ success: false, message })
    }
  }

  static async createVisit(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const clientName = String(req.body?.clientName || "").trim()
      if (!clientName) {
        return res.status(400).json({ success: false, message: "Client name is required" })
      }
      const date = String(req.body?.date || "").trim() || new Date().toISOString().slice(0, 10)
      const plannerId = String(req.body?.plannerId || "").trim()
      const planner = plannerId
        ? await SalesPlanner.findOne({ _id: plannerId, org_id, userId })
        : await SalesPlanner.findOne({ org_id, userId, date })
      if (plannerId && !planner) {
        return res.status(400).json({ success: false, message: "Planner not found" })
      }
      if (!planner) {
        return res.status(400).json({
          success: false,
          message: "Plan this day first. Visit reports can only be filled after the planner is approved.",
        })
      }
      if (planner.status !== "approved") {
        return res.status(400).json({
          success: false,
          message:
            planner.status === "pending"
              ? "This planner is waiting for admin approval. You can complete visits after it is approved."
              : planner.status === "rejected"
                ? "This planner was sent back. Edit it and send it again. Visit reports open after approval."
                : "This planner is not approved, so visits cannot be completed.",
        })
      }
      const report = await ensureTodayReport(org_id, userId, date)

      const existing = await SalesVisit.findOne({
        org_id,
        userId,
        clientName: new RegExp(`^${escapeRegex(clientName)}$`, "i"),
        $or: [
          ...(plannerId ? [{ plannerId }] : []),
          { visitDate: date },
          { report_id: String(report._id) },
        ],
      })
      if (existing && isVisitLocked(existing)) {
        return res.status(400).json({
          success: false,
          message: "This visit report is locked. Ask an admin to revoke it before you can edit.",
        })
      }

      if (existing) {
        applyVisitFields(existing, req.body, {
          clientName,
          visitDate: date,
          report_id: String(report._id),
          status: "locked",
          revokedAt: undefined,
          revokedBy: undefined,
          revokeNote: undefined,
        })
        await existing.save()
        return res.status(200).json({ success: true, data: existing })
      }

      const visit = await SalesVisit.create({
        org_id,
        report_id: String(report._id),
        userId,
        clientName,
        visitDate: date,
        status: "locked",
        checkInAt: new Date(),
      })
      applyVisitFields(visit, req.body, { clientName, visitDate: date, status: "locked" })
      await visit.save()

      return res.status(201).json({ success: true, data: visit })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log visit"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      const categories = await StockCategory.find({ org_id }).sort({ name: 1 }).select("_id name").lean()
      return res.status(200).json({
        success: true,
        data: categories.map((category) => ({
          _id: String(category._id),
          name: category.name,
        })),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load categories"
      return res.status(500).json({ success: false, message })
    }
  }

  static async searchStock(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      const q = String(req.query.q || "").trim()
      const inStockOnly = req.query.inStockOnly !== "0"
      const filter: Record<string, unknown> = { org_id, isActive: { $ne: false } }
      if (q) {
        const rx = new RegExp(escapeRegex(q), "i")
        filter.$or = [{ name: rx }, { category: rx }]
      }
      if (inStockOnly) filter.currentQuantity = { $gt: 0 }

      const products = await StockProduct.find(filter)
        .sort({ name: 1 })
        .limit(40)
        .select("_id name sellingPrice currentQuantity taxable taxRate category")
        .lean()

      return res.status(200).json({
        success: true,
        data: products.map((p) => ({
          _id: String(p._id),
          name: p.name,
          sellingPrice: Number(p.sellingPrice || 0),
          currentQuantity: Number(p.currentQuantity || 0),
          taxable: Boolean(p.taxable),
          taxRate: Number(p.taxRate || VAT_RATE),
        })),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to search stock"
      return res.status(500).json({ success: false, message })
    }
  }

  static async searchClients(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      const q = String(req.query.q || "").trim()
      const filter: Record<string, unknown> = { org_id }
      if (q) {
        const rx = new RegExp(escapeRegex(q), "i")
        filter.$or = [
          { sourceName: rx },
          { legalName: rx },
          { sourceNumber: rx },
          { contactPerson: rx },
          { email: rx },
        ]
      }
      const clients = await StockClient.find(filter)
        .sort({ updatedAt: -1 })
        .limit(30)
        .select("sourceName legalName sourceNumber sourceLocation contactPerson email createdBy contacts")
        .lean()
      return res.status(200).json({
        success: true,
        data: clients.map((c) =>
          mapSalesClient(c, { mine: String(c.createdBy) === String(req.user?.userId) }),
        ),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to search clients"
      return res.status(500).json({ success: false, message })
    }
  }

  static async listMyClients(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const q = String(req.query.q || "").trim()
      const createdFilter: Record<string, unknown> = { org_id, createdBy: userId }
      if (q) {
        const rx = new RegExp(escapeRegex(q), "i")
        createdFilter.$or = [{ sourceName: rx }, { legalName: rx }, { sourceNumber: rx }, { contactPerson: rx }]
      }

      const [created, visits, quotes, activities] = await Promise.all([
        StockClient.find(createdFilter).sort({ updatedAt: -1 }).limit(200).lean(),
        SalesVisit.find({ org_id, userId }).select("customer_id clientName clientPhone checkInAt").sort({ checkInAt: -1 }).limit(200).lean(),
        StockQuotation.find({ org_id, createdBy: userId }).select("client createdAt status grandTotal").sort({ createdAt: -1 }).limit(200).lean(),
        SalesClientActivity.find({ org_id, userId }).select("customer_id clientName clientPhone createdAt type outcome").sort({ createdAt: -1 }).limit(200).lean(),
      ])

      const createdIds = new Set(created.map((c) => String(c._id)))
      const createdByPhone = new Map(
        created.map((c) => [String(c.sourceNumber || "").trim(), String(c._id)]),
      )
      const createdByName = new Map(
        created.map((c) => [String(c.sourceName || c.legalName || "").trim().toLowerCase(), String(c._id)]),
      )
      const quoteClientId = (quote: any) => {
        const phone = String(quote.client?.number || "").trim()
        const name = String(quote.client?.name || "").trim().toLowerCase()
        return createdByPhone.get(phone) || createdByName.get(name) || ""
      }
      const engagedIds = [
        ...new Set(
          [...visits, ...activities]
            .map((row) => String(row.customer_id || ""))
            .filter((id) => Types.ObjectId.isValid(id) && !createdIds.has(id)),
        ),
      ]

      const engaged = engagedIds.length
        ? await StockClient.find({ org_id, _id: { $in: engagedIds } }).lean()
        : []

      const lastTouch = new Map<string, { at: Date; type: string }>()
      const bump = (id: string, at: Date, type: string) => {
        if (!id) return
        const current = lastTouch.get(id)
        if (!current || at > current.at) lastTouch.set(id, { at, type })
      }
      for (const visit of visits) bump(String(visit.customer_id || ""), new Date(visit.checkInAt), "visit")
      for (const quote of quotes) bump(quoteClientId(quote), new Date(quote.createdAt), `quote:${quote.status}`)
      for (const activity of activities) bump(String(activity.customer_id || ""), new Date(activity.createdAt), activity.type)

      const visitCounts = new Map<string, number>()
      for (const visit of visits) {
        const id = String(visit.customer_id || "")
        if (id) visitCounts.set(id, (visitCounts.get(id) || 0) + 1)
      }

      return res.status(200).json({
        success: true,
        data: {
          created: created.map((c) => {
            const id = String(c._id)
            return mapSalesClient(c, {
              mine: true,
              lastTouch: lastTouch.get(id) || null,
              visitCount: visitCounts.get(id) || 0,
            })
          }),
          engaged: engaged.map((c) => {
            const id = String(c._id)
            return mapSalesClient(c, {
              mine: false,
              lastTouch: lastTouch.get(id) || null,
              visitCount: visitCounts.get(id) || 0,
            })
          }),
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load clients"
      return res.status(500).json({ success: false, message })
    }
  }

  static async createClient(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const sourceName = String(req.body?.name || req.body?.sourceName || "").trim()
      const sourceNumber = String(req.body?.phone || req.body?.sourceNumber || "").trim()
      const sourceLocation = String(req.body?.location || req.body?.sourceLocation || "").trim()
      const contactPerson = String(req.body?.contactPerson || "").trim()
      const contactPersonRole =
        String(req.body?.contactPersonRole || "").trim() === "Other"
          ? String(req.body?.contactPersonCustomRole || "").trim()
          : String(req.body?.contactPersonRole || "").trim()

      if (!sourceName || !sourceNumber || !sourceLocation) {
        return res.status(400).json({
          success: false,
          message: "Client name, phone number, and county are required",
        })
      }
      if (contactPerson && !contactPersonRole) {
        return res.status(400).json({
          success: false,
          message: "Select a role for the contact person, or leave the name blank",
        })
      }

      const profile = await createOrUpdateStockClient({
        org_id,
        actorId: userId,
        sourceName,
        sourceNumber,
        sourceLocation,
        legalName: sourceName,
        contactPerson: contactPerson || undefined,
        contactPersonRole: contactPersonRole || undefined,
        email: String(req.body?.email || "").trim() || undefined,
      })

      return res.status(200).json({
        success: true,
        data: mapSalesClient(profile, { mine: String(profile.createdBy) === userId }),
        message: "Client saved",
      })
    } catch (error: any) {
      const status = Number(error?.status) || (error?.code === 11000 ? 409 : 500)
      const message =
        error?.code === 11000
          ? "A client with this name, phone, and county already exists"
          : error instanceof Error
            ? error.message
            : "Failed to create client"
      return res.status(status).json({ success: false, message })
    }
  }

  static async getClientOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const [groups, clients] = await Promise.all([
        StockClientGroup.find({ org_id }).select("name").sort({ name: 1 }).lean(),
        StockClient.find({ org_id }).select("contacts.role").lean(),
      ])
      const fromContacts = clients.flatMap((client) =>
        (client.contacts || [])
          .map((contact: any) => String(contact?.role || "").trim())
          .filter(Boolean),
      )
      const roles = Array.from(new Set([...DEFAULT_CONTACT_ROLES, ...fromContacts])).sort((a, b) =>
        a.localeCompare(b),
      )
      const counties = Array.from(
        new Set(groups.map((group) => String(group.name || "").trim()).filter(Boolean)),
      )

      return res.status(200).json({ success: true, data: { roles, counties } })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load client options"
      return res.status(500).json({ success: false, message })
    }
  }

  static async addClientContact(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      if (!Types.ObjectId.isValid(String(req.params.id))) {
        return res.status(400).json({ success: false, message: "Invalid client" })
      }

      const name = String(req.body?.name || req.body?.contactPerson || "").trim()
      const role =
        String(req.body?.role || req.body?.contactPersonRole || "").trim() === "Other"
          ? String(req.body?.customRole || req.body?.contactPersonCustomRole || "").trim()
          : String(req.body?.role || req.body?.contactPersonRole || "").trim()
      const phone = String(req.body?.phone || "").trim()
      const email = String(req.body?.email || "").trim()

      if (!name || !role) {
        return res.status(400).json({ success: false, message: "Contact name and role are required" })
      }

      const client = await StockClient.findOne({ _id: req.params.id, org_id })
      if (!client) return res.status(404).json({ success: false, message: "Client not found" })

      const contacts = Array.isArray(client.contacts) ? [...client.contacts] : []
      const duplicate = contacts.find(
        (contact: any) =>
          String(contact?.name || "").trim().toLowerCase() === name.toLowerCase() &&
          String(contact?.role || "").trim().toLowerCase() === role.toLowerCase(),
      )
      if (duplicate) {
        if (phone) duplicate.phone = phone
        if (email) duplicate.email = email
      } else {
        contacts.push({
          role,
          name,
          phone: phone || undefined,
          email: email || undefined,
          isActive: true,
        } as any)
      }
      client.contacts = contacts as any
      const activeNames = contacts
        .filter((contact: any) => contact?.isActive)
        .map((contact: any) => contact.name)
        .filter(Boolean)
      client.contactPerson = activeNames.join("; ") || name
      if (email && !client.email) client.email = email
      client.updatedBy = userId
      client.markModified("contacts")
      await client.save()

      return res.status(200).json({
        success: true,
        message: "Contact saved on this facility",
        data: mapSalesClient(client.toObject(), { mine: String(client.createdBy) === userId }),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add contact"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getClientBook(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      if (!Types.ObjectId.isValid(String(req.params.id))) {
        return res.status(400).json({ success: false, message: "Invalid client" })
      }

      const client = await StockClient.findOne({ _id: req.params.id, org_id }).lean()
      if (!client) return res.status(404).json({ success: false, message: "Client not found" })

      const id = String(client._id)
      const nameRx = new RegExp(`^${escapeRegex(client.sourceName || client.legalName || "")}$`, "i")
      const [visits, quotes, activities] = await Promise.all([
        SalesVisit.find({
          org_id,
          userId,
          $or: [{ customer_id: id }, { clientName: nameRx }],
        })
          .sort({ checkInAt: -1 })
          .limit(40)
          .lean(),
        StockQuotation.find({
          org_id,
          createdBy: userId,
          $or: [{ "client.name": nameRx }, { "client.number": client.sourceNumber }],
        })
          .sort({ createdAt: -1 })
          .limit(40)
          .lean(),
        SalesClientActivity.find({
          org_id,
          userId,
          $or: [{ customer_id: id }, { clientName: nameRx }],
        })
          .sort({ createdAt: -1 })
          .limit(40)
          .lean(),
      ])

      const timeline = [
        ...visits.map((item) => ({
          _id: String(item._id),
          kind: "visit" as const,
          at: item.checkInAt,
          title: item.visitType,
          detail: item.outcome || item.purpose || "",
          notes: item.notes,
        })),
        ...quotes.map((item) => ({
          _id: String(item._id),
          kind: "quote" as const,
          at: item.createdAt,
          title: item.quotationNumber || item.quoteNumber,
          detail: `${item.status} · KES ${Number(item.grandTotal || 0).toLocaleString("en-KE")}`,
          notes: item.notes,
        })),
        ...activities.map((item) => ({
          _id: String(item._id),
          kind: item.type,
          at: item.createdAt,
          title: item.type === "call" ? "Call" : item.type === "note" ? "Note" : "Follow-up",
          detail: item.outcome || item.purpose || "",
          notes: item.notes,
        })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

      return res.status(200).json({
        success: true,
        data: {
          client: mapSalesClient(client, { mine: String(client.createdBy) === userId }),
          visits,
          quotes,
          activities,
          timeline,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load client book"
      return res.status(500).json({ success: false, message })
    }
  }

  static async logClientActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      let clientName = String(req.body?.clientName || "").trim()
      let clientPhone = String(req.body?.clientPhone || "").trim()
      let customerId = String(req.body?.customer_id || req.params.id || "").trim()

      if (customerId && Types.ObjectId.isValid(customerId)) {
        const client = await StockClient.findOne({ _id: customerId, org_id }).lean()
        if (client) {
          clientName = clientName || client.sourceName || client.legalName || "Client"
          clientPhone = clientPhone || client.sourceNumber || ""
        }
      }

      if (!clientName) {
        return res.status(400).json({ success: false, message: "Client name is required" })
      }

      const type = String(req.body?.type || "call").trim()
      if (!["call", "note", "follow_up"].includes(type)) {
        return res.status(400).json({ success: false, message: "type must be call, note, or follow_up" })
      }

      const activity = await SalesClientActivity.create({
        org_id,
        userId,
        customer_id: customerId || undefined,
        clientName,
        clientPhone: clientPhone || undefined,
        type,
        purpose: String(req.body?.purpose || "").trim() || undefined,
        outcome: String(req.body?.outcome || "").trim() || undefined,
        notes: String(req.body?.notes || "").trim() || undefined,
        followUpDate: req.body?.followUpDate ? new Date(req.body.followUpDate) : undefined,
        durationSeconds: Number.isFinite(Number(req.body?.durationSeconds))
          ? Number(req.body.durationSeconds)
          : undefined,
      })

      return res.status(201).json({ success: true, data: activity })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log activity"
      return res.status(500).json({ success: false, message })
    }
  }

  static async listQuotes(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const quotes = await StockQuotation.find({ org_id, createdBy: userId }).sort({ createdAt: -1 }).limit(80).lean()
      return res.status(200).json({ success: true, data: quotes })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load quotes"
      return res.status(500).json({ success: false, message })
    }
  }

  static async createQuote(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const clientName = String(req.body?.clientName || "").trim()
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : []
      if (!clientName) return res.status(400).json({ success: false, message: "Client name is required" })
      if (rawItems.length === 0) return res.status(400).json({ success: false, message: "Add at least one product" })

      const totals = computeQuoteTotals(rawItems)
      const items = rawItems.map((item: any, index: number) => ({
        productId: String(item.productId || ""),
        productName: String(item.productName || "Product"),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        taxRate: totals.items[index].taxRate,
        taxAmount: totals.items[index].taxAmount,
        lineTotal: totals.items[index].lineTotal,
        availableQtySnapshot: Number(item.availableQtySnapshot || 0),
      }))

      const date = String(req.body?.date || "").trim() || new Date().toISOString().slice(0, 10)
      const report = await ensureTodayReport(org_id, userId, date)
      const quote = await SalesQuote.create({
        org_id,
        userId,
        report_id: String(report._id),
        visit_id: String(req.body?.visit_id || "").trim() || undefined,
        quoteNumber: await nextQuoteNumber(org_id),
        clientName,
        clientPhone: String(req.body?.clientPhone || "").trim() || undefined,
        customer_id: String(req.body?.customer_id || "").trim() || undefined,
        items,
        subTotal: totals.subTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        status: "draft",
        notes: String(req.body?.notes || "").trim() || undefined,
      })

      return res.status(201).json({ success: true, data: quote })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create quote"
      return res.status(500).json({ success: false, message })
    }
  }

  static async updateQuote(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const quote = await SalesQuote.findOne({ _id: req.params.id, org_id, userId })
      if (!quote) return res.status(404).json({ success: false, message: "Quote not found" })
      if (!["draft", "rejected"].includes(quote.status)) {
        return res.status(400).json({ success: false, message: "Only draft or rejected quotes can be edited" })
      }

      if (Array.isArray(req.body?.items)) {
        const totals = computeQuoteTotals(req.body.items)
        quote.items = req.body.items.map((item: any, index: number) => ({
          productId: String(item.productId || ""),
          productName: String(item.productName || "Product"),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          taxRate: totals.items[index].taxRate,
          taxAmount: totals.items[index].taxAmount,
          lineTotal: totals.items[index].lineTotal,
          availableQtySnapshot: Number(item.availableQtySnapshot || 0),
        }))
        quote.subTotal = totals.subTotal
        quote.taxTotal = totals.taxTotal
        quote.grandTotal = totals.grandTotal
      }
      if (req.body?.clientName) quote.clientName = String(req.body.clientName).trim()
      if (req.body?.clientPhone !== undefined) quote.clientPhone = String(req.body.clientPhone || "").trim()
      if (req.body?.notes !== undefined) quote.notes = String(req.body.notes || "").trim()
      if (quote.status === "rejected") quote.status = "draft"
      await quote.save()
      return res.status(200).json({ success: true, data: quote })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update quote"
      return res.status(500).json({ success: false, message })
    }
  }

  static async submitQuote(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const quote = await SalesQuote.findOne({ _id: req.params.id, org_id, userId })
      if (!quote) return res.status(404).json({ success: false, message: "Quote not found" })
      if (!quote.items.length) {
        return res.status(400).json({ success: false, message: "Add products before submitting" })
      }
      quote.status = "submitted"
      quote.submittedAt = new Date()
      await quote.save()
      return res.status(200).json({ success: true, data: quote })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit quote"
      return res.status(500).json({ success: false, message })
    }
  }

  static async markQuoteDownloaded(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const quote = await SalesQuote.findOne({ _id: req.params.id, org_id, userId })
      if (!quote) return res.status(404).json({ success: false, message: "Quote not found" })
      if (quote.status !== "approved" && quote.status !== "downloaded") {
        return res.status(400).json({ success: false, message: "Quote is not approved yet" })
      }
      quote.status = "downloaded"
      quote.downloadedAt = new Date()
      quote.downloadedBy = userId
      await quote.save()
      return res.status(200).json({ success: true, data: quote })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to mark downloaded"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const periods = currentPeriods()
      const quarterFrom = periods.quarterly.from
      const [reports, visits, quotes, invoices, planners, target] = await Promise.all([
        SalesDailyReport.find({ org_id, userId }).sort({ date: -1 }).limit(30).lean(),
        SalesVisit.find({ org_id, userId }).sort({ checkInAt: -1 }).limit(80).lean(),
        StockQuotation.find({ org_id, createdBy: userId }).sort({ createdAt: -1 }).limit(40).lean(),
        StockInvoice.find({
          org_id,
          createdBy: userId,
          status: { $in: ["issued", "paid", "pending_approval"] },
          createdAt: { $gte: quarterFrom },
        })
          .sort({ createdAt: -1 })
          .lean(),
        SalesPlanner.find({
          org_id,
          userId,
          status: "approved",
          date: { $gte: toDateKey(quarterFrom) },
        })
          .sort({ date: -1 })
          .lean(),
        SalesRepTarget.findOne({ org_id, userId }).lean(),
      ])
      const performance = performanceForUser(invoices, planners, target, periods)
      return res.status(200).json({
        success: true,
        data: {
          reports,
          visits,
          quotes,
          invoices: invoices.slice(0, 20).map((invoice) => ({
            _id: String(invoice._id),
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.client?.name,
            grandTotal: invoiceAmount(invoice),
            status: invoice.status,
            createdAt: invoice.createdAt,
          })),
          sales: performance.sales,
          expenses: performance.expenses,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load history"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminList(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const role = req.user?.role
      if (!org_id || !isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const status = String(req.query.status || "").trim()
      const reportFilter: Record<string, unknown> = { org_id }
      const quoteFilter: Record<string, unknown> = { org_id }
      if (status === "pending") {
        reportFilter.status = "submitted"
        quoteFilter.status = "submitted"
      }

      const [reports, quotes] = await Promise.all([
        SalesDailyReport.find(reportFilter).sort({ date: -1, updatedAt: -1 }).limit(80).lean(),
        SalesQuote.find(quoteFilter).sort({ createdAt: -1 }).limit(80).lean(),
      ])
      const reportIds = reports.map((r) => String(r._id))
      const visits = reportIds.length
        ? await SalesVisit.find({ org_id, report_id: { $in: reportIds } }).sort({ checkInAt: -1 }).lean()
        : []
      const visitsByReport = new Map<string, typeof visits>()
      for (const visit of visits) {
        const key = String(visit.report_id)
        const list = visitsByReport.get(key) || []
        list.push(visit)
        visitsByReport.set(key, list)
      }
      const userIds = [
        ...new Set([
          ...reports.map((r) => String(r.userId)),
          ...quotes.map((q) => String(q.userId)),
        ]),
      ].filter((id) => Types.ObjectId.isValid(id))
      const users = userIds.length
        ? await User.find({ _id: { $in: userIds }, org_id }).select("firstName lastName email").lean()
        : []
      const userMap = new Map(
        users.map((u) => [
          String(u._id),
          `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Rep",
        ]),
      )

      return res.status(200).json({
        success: true,
        data: {
          reports: reports.map((r) => ({
            ...r,
            repName: userMap.get(String(r.userId)) || "Rep",
            visits: visitsByReport.get(String(r._id)) || [],
          })),
          quotes: quotes.map((q) => ({ ...q, repName: userMap.get(String(q.userId)) || "Rep" })),
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load sales reports"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminListVisits(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const from = String(req.query.from || "").trim()
      const to = String(req.query.to || "").trim()
      const q = String(req.query.q || "").trim().toLowerCase()
      const reportFilter: Record<string, unknown> = { org_id }
      if (from || to) {
        const dateFilter: Record<string, string> = {}
        if (from) dateFilter.$gte = from
        if (to) dateFilter.$lte = to
        reportFilter.date = dateFilter
      }

      const reports = from || to
        ? await SalesDailyReport.find(reportFilter).sort({ date: -1 }).limit(200).lean()
        : []
      const visits = from || to
        ? reports.length
          ? await SalesVisit.find({
              org_id,
              report_id: { $in: reports.map((report) => String(report._id)) },
            })
              .sort({ checkInAt: -1 })
              .lean()
          : []
        : await SalesVisit.find({ org_id }).sort({ checkInAt: -1 }).limit(400).lean()
      const reportIdsForLookup = [
        ...new Set([
          ...reports.map((report) => String(report._id)),
          ...visits.map((visit) => String(visit.report_id || "")).filter(Boolean),
        ]),
      ].filter((id) => Types.ObjectId.isValid(id))
      const reportDocs = reportIdsForLookup.length
        ? await SalesDailyReport.find({ org_id, _id: { $in: reportIdsForLookup } })
            .select("date status")
            .lean()
        : reports
      const reportMap = new Map(reportDocs.map((report) => [String(report._id), report]))

      const userIds = [...new Set(visits.map((visit) => String(visit.userId)).filter(Boolean))]
      const validUserIds = userIds.filter((id) => Types.ObjectId.isValid(id))
      const users = validUserIds.length
        ? await User.find({ _id: { $in: validUserIds }, org_id }).select("firstName lastName email").lean()
        : []
      const userMap = new Map(
        users.map((user) => [
          String(user._id),
          `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Rep",
        ]),
      )

      const data = visits
        .map((visit) => {
          const report = reportMap.get(String(visit.report_id))
          return {
            ...visit,
            repName: userMap.get(String(visit.userId)) || "Rep",
            visitDate: visitCarriedOutDate(visit, report?.date),
            reportDate: visitCarriedOutDate(visit, report?.date),
            reportStatus: report?.status || "open",
            status: visit.status === "unlocked" ? "unlocked" : "locked",
          }
        })
        .filter((visit) => {
          if (!q) return true
          const haystack = [
            visit.repName,
            visit.clientName,
            visit.purpose,
            visit.outcome,
            visit.outcomeDetail,
            visit.personMet,
            visit.notes,
            ...(visit.interestCategories || []).map((item: any) => `${item.categoryName} ${item.note || ""}`),
          ]
            .join(" ")
            .toLowerCase()
          return haystack.includes(q)
        })

      return res.status(200).json({ success: true, data })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load visit reports"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminRevokeVisit(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const visit = await SalesVisit.findOne({ _id: req.params.id, org_id })
      if (!visit) return res.status(404).json({ success: false, message: "Visit report not found" })
      visit.status = "unlocked"
      visit.revokedAt = new Date()
      visit.revokedBy = userId
      visit.revokeNote = String(req.body?.note || "").trim() || undefined
      await visit.save()
      return res.status(200).json({ success: true, data: visit })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to revoke visit report"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminUpdateReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const report = await SalesDailyReport.findOne({ _id: req.params.id, org_id })
      if (!report) return res.status(404).json({ success: false, message: "Report not found" })
      const allowed = ["plannedVisits", "newLeads", "ordersCount", "ordersValue", "expenses", "mileage", "blockers", "notes", "dayType"] as const
      for (const key of allowed) {
        if (req.body?.[key] !== undefined) (report as any)[key] = req.body[key]
      }
      await report.save()
      return res.status(200).json({ success: true, data: report })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update report"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminUpdateQuote(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const quote = await SalesQuote.findOne({ _id: req.params.id, org_id })
      if (!quote) return res.status(404).json({ success: false, message: "Quote not found" })

      if (Array.isArray(req.body?.items) && req.body.items.length > 0) {
        const totals = computeQuoteTotals(req.body.items)
        quote.items = req.body.items.map((item: any, index: number) => ({
          productId: String(item.productId || ""),
          productName: String(item.productName || "Product"),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          taxRate: totals.items[index].taxRate,
          taxAmount: totals.items[index].taxAmount,
          lineTotal: totals.items[index].lineTotal,
          availableQtySnapshot: Number(item.availableQtySnapshot || 0),
        }))
        quote.subTotal = totals.subTotal
        quote.taxTotal = totals.taxTotal
        quote.grandTotal = totals.grandTotal
      }
      if (req.body?.clientName) quote.clientName = String(req.body.clientName).trim()
      if (req.body?.clientPhone !== undefined) quote.clientPhone = String(req.body.clientPhone || "").trim()
      if (req.body?.notes !== undefined) quote.notes = String(req.body.notes || "").trim()
      await quote.save()
      return res.status(200).json({ success: true, data: quote })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update quote"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminReviewReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const action = String(req.body?.action || "").trim()
      const report = await SalesDailyReport.findOne({ _id: req.params.id, org_id })
      if (!report) return res.status(404).json({ success: false, message: "Report not found" })
      if (action === "approve") report.status = "approved"
      else if (action === "revision") report.status = "revision_requested"
      else return res.status(400).json({ success: false, message: "action must be approve or revision" })
      report.reviewedAt = new Date()
      report.reviewedBy = userId
      report.reviewNote = String(req.body?.note || "").trim() || undefined
      await report.save()
      return res.status(200).json({ success: true, data: report })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to review report"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminReviewQuote(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const action = String(req.body?.action || "").trim()
      const quote = await SalesQuote.findOne({ _id: req.params.id, org_id })
      if (!quote) return res.status(404).json({ success: false, message: "Quote not found" })
      if (action === "approve") {
        quote.status = "approved"
        quote.rejectionReason = undefined
      } else if (action === "reject") {
        quote.status = "rejected"
        quote.rejectionReason = String(req.body?.note || "").trim() || "Sent back for revision"
      } else {
        return res.status(400).json({ success: false, message: "action must be approve or reject" })
      }
      quote.reviewedAt = new Date()
      quote.reviewedBy = userId
      await quote.save()
      return res.status(200).json({ success: true, data: quote })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to review quote"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getPlanners(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const planners = await SalesPlanner.find({ org_id, userId }).sort({ date: -1 }).lean()
      return res.status(200).json({ success: true, data: planners })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load planners"
      return res.status(500).json({ success: false, message })
    }
  }

  static async createPlanner(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const { date, visits, projectedExpenses, budget } = req.body
      if (!date) return res.status(400).json({ success: false, message: "Date is required" })

      let planner = await SalesPlanner.findOne({ org_id, userId, date })
      if (planner && planner.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "This planner is approved and cannot be changed.",
        })
      }
      
      if (!planner) {
        planner = new SalesPlanner({ org_id, userId, date })
      }
      planner.visits = (Array.isArray(visits) ? visits : []).map((visit: any) => {
        return {
          clientName: String(visit.clientName || "").trim(),
          clientId: String(visit.clientId || "").trim() || undefined,
          reason: String(visit.reason || "").trim(),
          customReason: String(visit.customReason || "").trim() || undefined,
          expectedOutcome: String(visit.expectedOutcome || "").trim() || undefined,
          location: String(visit.location || "").trim() || undefined,
          notes: String(visit.notes || "").trim() || undefined,
          interestCategories: Array.isArray(visit.interestCategories)
            ? visit.interestCategories.map((item: any) => String(item).trim()).filter(Boolean)
            : [],
          expenses: { transport: 0, nightOut: false },
        }
      })
      const company = await Company.findById(org_id).select("salesNightOutAmount")
      const nightOutRate = Number(company?.salesNightOutAmount ?? 3000)
      const transport = Math.max(0, Number(budget?.transport ?? projectedExpenses ?? 0))
      const nightOut = Boolean(budget?.nightOut)
      const nightOutAmount = nightOut ? Math.max(0, nightOutRate) : 0
      planner.budget = { transport, nightOut, nightOutAmount }
      planner.projectedExpenses = transport + nightOutAmount
      planner.status = "pending"
      planner.set("adminNotes", undefined)
      await planner.save()

      return res.status(201).json({ success: true, data: planner })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save planner"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminGetPlanners(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const status = req.query.status as string
      const match: any = { org_id }
      if (status) match.status = status

      const planners = await SalesPlanner.find(match)
        .sort({ date: -1 })
        .lean()
      
      return res.status(200).json({ success: true, data: planners })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load planners"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminReviewPlanner(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const { id } = req.params
      const { action, note } = req.body
      const planner = await SalesPlanner.findOne({ _id: id, org_id })
      if (!planner) return res.status(404).json({ success: false, message: "Planner not found" })
      
      if (action === "approve") {
        planner.status = "approved"
        planner.adminNotes = note ? String(note) : undefined
      } else if (action === "reject") {
        planner.status = "rejected"
        planner.adminNotes = note ? String(note) : "Rejected by admin"
      } else {
        return res.status(400).json({ success: false, message: "Action must be approve or reject" })
      }

      await planner.save()
      return res.status(200).json({ success: true, data: planner })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to review planner"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminGetPerformance(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const periods = currentPeriods()
      const todayKey = toDateKey(new Date())
      const periodMeta = {
        weekly: serializePeriod(periods.weekly, todayKey),
        monthly: serializePeriod(periods.monthly, todayKey),
        quarterly: serializePeriod(periods.quarterly, todayKey),
      }
      const reps = await User.find({ org_id, role: "sales_rep" })
        .select("firstName lastName email status")
        .sort({ firstName: 1, lastName: 1 })
        .lean()
      const userIds = reps.map((rep) => String(rep._id))
      const quarterFromKey = toDateKey(periods.quarterly.from)
      const [targets, invoices, planners, reports, visits] = await Promise.all([
        SalesRepTarget.find({ org_id, userId: { $in: userIds } }).lean(),
        userIds.length
          ? StockInvoice.find({
              org_id,
              createdBy: { $in: userIds },
              status: { $in: ["issued", "paid", "pending_approval"] },
              createdAt: { $gte: periods.quarterly.from },
            }).lean()
          : Promise.resolve([]),
        userIds.length
          ? SalesPlanner.find({
              org_id,
              userId: { $in: userIds },
              status: "approved",
              date: { $gte: quarterFromKey },
            }).lean()
          : Promise.resolve([]),
        userIds.length
          ? SalesDailyReport.find({
              org_id,
              userId: { $in: userIds },
              date: { $gte: quarterFromKey },
            })
              .select("userId date dayStartAt dayEndAt dayStartGps dayEndGps")
              .lean()
          : Promise.resolve([]),
        userIds.length
          ? SalesVisit.find({
              org_id,
              userId: { $in: userIds },
              $or: [
                { visitDate: { $gte: quarterFromKey } },
                { checkInAt: { $gte: periods.quarterly.from } },
              ],
            })
              .select("userId clientName visitDate checkInAt gps")
              .sort({ checkInAt: 1 })
              .lean()
          : Promise.resolve([]),
      ])
      const targetByUser = new Map(targets.map((row) => [String(row.userId), row]))
      const invoicesByUser = new Map<string, typeof invoices>()
      for (const invoice of invoices) {
        const key = String(invoice.createdBy)
        const list = invoicesByUser.get(key) || []
        list.push(invoice)
        invoicesByUser.set(key, list)
      }
      const plannersByUser = new Map<string, typeof planners>()
      for (const plan of planners) {
        const key = String(plan.userId)
        const list = plannersByUser.get(key) || []
        list.push(plan)
        plannersByUser.set(key, list)
      }
      const daysByUser = new Map<string, Map<string, any>>()
      const ensureDay = (userId: string, date: string) => {
        if (!daysByUser.has(userId)) daysByUser.set(userId, new Map())
        const byDate = daysByUser.get(userId)!
        if (!byDate.has(date)) {
          byDate.set(date, {
            date,
            startAt: null,
            endAt: null,
            hours: 0,
            startGps: null,
            endGps: null,
            visitCount: 0,
            visits: [] as Array<{ clientName: string; at?: Date; gps: ReturnType<typeof mapGps> }>,
          })
        }
        return byDate.get(date)
      }
      for (const report of reports) {
        const day = ensureDay(String(report.userId), String(report.date))
        day.startAt = report.dayStartAt || null
        day.endAt = report.dayEndAt || null
        day.startGps = mapGps(report.dayStartGps)
        day.endGps = mapGps(report.dayEndGps)
        day.hours = hoursBetween(report.dayStartAt, report.dayEndAt)
      }
      for (const visit of visits) {
        const date = String(visit.visitDate || toDateKey(visit.checkInAt) || "")
        if (!date) continue
        const day = ensureDay(String(visit.userId), date)
        day.visitCount += 1
        day.visits.push({
          clientName: String(visit.clientName || "Visit"),
          at: visit.checkInAt,
          gps: mapGps(visit.gps),
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          periods: periodMeta,
          reps: reps.map((rep) => {
            const userId = String(rep._id)
            const target = targetByUser.get(userId) || null
            const performance = performanceForUser(
              invoicesByUser.get(userId) || [],
              plannersByUser.get(userId) || [],
              target,
              periods,
            )
            const days = Array.from(daysByUser.get(userId)?.values() || []).sort((a, b) =>
              String(b.date).localeCompare(String(a.date)),
            )
            const locations = days.flatMap((day) => {
              const points: Array<{
                date: string
                kind: "start" | "end" | "visit"
                label: string
                at?: Date | string | null
                gps: { lat: number; lng: number }
              }> = []
              if (day.startGps) {
                points.push({ date: day.date, kind: "start", label: "Start day", at: day.startAt, gps: day.startGps })
              }
              for (const visit of day.visits) {
                if (!visit.gps) continue
                points.push({
                  date: day.date,
                  kind: "visit",
                  label: visit.clientName,
                  at: visit.at,
                  gps: visit.gps,
                })
              }
              if (day.endGps) {
                points.push({ date: day.date, kind: "end", label: "End day", at: day.endAt, gps: day.endGps })
              }
              return points
            })
            return {
              userId,
              name: `${rep.firstName || ""} ${rep.lastName || ""}`.trim() || rep.email || "Rep",
              email: rep.email,
              status: rep.status,
              weeklyAmount: Number(target?.weeklyAmount || 0),
              monthlyAmount: Number(target?.monthlyAmount || 0),
              quarterlyAmount: Number(target?.quarterlyAmount || 0),
              sales: performance.sales,
              expenses: performance.expenses,
              attendance: {
                weekly: summarizeAttendance(days, periodMeta.weekly.workdays),
                monthly: summarizeAttendance(days, periodMeta.monthly.workdays),
                quarterly: summarizeAttendance(days, periodMeta.quarterly.workdays),
              },
              days,
              locations,
            }
          }),
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load performance"
      return res.status(500).json({ success: false, message })
    }
  }

  static async adminSetTarget(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id || !isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admins only" })
      }
      const userId = String(req.params.userId || "").trim()
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "Invalid sales rep" })
      }
      const rep = await User.findOne({ _id: userId, org_id, role: "sales_rep" }).select("_id")
      if (!rep) {
        return res.status(404).json({ success: false, message: "Sales rep not found" })
      }
      const weeklyAmount = Math.max(0, Number(req.body?.weeklyAmount || 0))
      const monthlyAmount = Math.max(0, Number(req.body?.monthlyAmount || 0))
      const quarterlyAmount = Math.max(0, Number(req.body?.quarterlyAmount || 0))
      const target = await SalesRepTarget.findOneAndUpdate(
        { org_id, userId },
        {
          org_id,
          userId,
          weeklyAmount,
          monthlyAmount,
          quarterlyAmount,
          setBy: req.user?.userId,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      return res.status(200).json({ success: true, data: target })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save target"
      return res.status(500).json({ success: false, message })
    }
  }
}
