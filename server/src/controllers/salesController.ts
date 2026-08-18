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
import { SalesClientActivity } from "../models/SalesClientActivity"
import { User } from "../models/User"
import { createOrUpdateStockClient } from "../services/stockClientSave.service"
import { SalesPlanner } from "../models/SalesPlanner"
const VAT_RATE = 16
const ADMIN_ROLES = new Set(["company_admin", "admin", "hr", "super_admin"])

function isAdminRole(role?: string) {
  return Boolean(role && ADMIN_ROLES.has(role))
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function parseGps(value: any) {
  const lat = Number(value?.lat)
  const lng = Number(value?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(value?.accuracy)) ? Number(value.accuracy) : undefined,
  }
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
      const [visits, quotes, followUps, revisionQuotes, staleQuotes, myClients, callsToday, recentActivities] =
        await Promise.all([
          SalesVisit.find({ org_id, userId, report_id: String(report._id) }).sort({ checkInAt: -1 }).lean(),
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
            plannedVisits: Number(report.plannedVisits || 0),
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
      const visits = await SalesVisit.find({ org_id, userId, report_id: String(report._id) })
        .sort({ checkInAt: -1 })
        .lean()
      return res.status(200).json({ success: true, data: { report, visits } })
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
        report.dayStartGps = parseGps(req.body?.gps)
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
      report.dayEndGps = parseGps(req.body?.gps)
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
      const report = await ensureTodayReport(org_id, userId, date)
      if (report.status === "submitted" || report.status === "approved") {
        return res.status(400).json({ success: false, message: "Today's report is locked" })
      }

      const visit = await SalesVisit.create({
        org_id,
        report_id: String(report._id),
        userId,
        clientName,
        clientPhone: String(req.body?.clientPhone || "").trim() || undefined,
        customer_id: String(req.body?.customer_id || "").trim() || undefined,
        plannerId: String(req.body?.plannerId || "").trim() || undefined,
        personMet: String(req.body?.personMet || "").trim() || undefined,
        personRole: String(req.body?.personRole || "").trim() || undefined,
        personPhone: String(req.body?.personPhone || "").trim() || undefined,
        personEmail: String(req.body?.personEmail || "").trim() || undefined,
        visitType: req.body?.visitType || "scheduled",
        purpose: String(req.body?.purpose || "").trim() || undefined,
        outcome: req.body?.outcome || undefined,
        checkInAt: new Date(),
        gps: parseGps(req.body?.gps),
        nextAction: String(req.body?.nextAction || "").trim() || undefined,
        followUpDate: req.body?.followUpDate ? new Date(req.body.followUpDate) : undefined,
        notes: String(req.body?.notes || "").trim() || undefined,
        quote_id: String(req.body?.quote_id || "").trim() || undefined,
      })

      return res.status(201).json({ success: true, data: visit })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log visit"
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
      const [reports, visits, quotes] = await Promise.all([
        SalesDailyReport.find({ org_id, userId }).sort({ date: -1 }).limit(30).lean(),
        SalesVisit.find({ org_id, userId }).sort({ checkInAt: -1 }).limit(80).lean(),
        StockQuotation.find({ org_id, createdBy: userId }).sort({ createdAt: -1 }).limit(40).lean(),
      ])
      return res.status(200).json({ success: true, data: { reports, visits, quotes } })
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
      const { date, visits, projectedExpenses } = req.body
      if (!date) return res.status(400).json({ success: false, message: "Date is required" })

      let planner = await SalesPlanner.findOne({ org_id, userId, date })
      if (planner && planner.status !== "pending") {
        return res.status(400).json({ success: false, message: "Cannot modify a processed planner" })
      }
      
      if (!planner) {
        planner = new SalesPlanner({ org_id, userId, date })
      }
      planner.visits = visits || []
      planner.projectedExpenses = Number(projectedExpenses || 0)
      planner.status = "pending"
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
}
