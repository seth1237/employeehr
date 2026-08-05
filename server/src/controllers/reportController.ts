import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Report } from "../models/Report"
import { User } from "../models/User"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"
import { StockEntry } from "../models/StockEntry"
import { StockSale } from "../models/StockSale"
import { MachineService } from "../models/MachineService"
import { StockProduct } from "../models/StockProduct"
import { InstalledMachine } from "../models/InstalledMachine"
import { LeaveRequest } from "../models/LeaveRequest"
import { Attendance } from "../models/Attendance"
import { Payroll } from "../models/Payroll"
import { Performance } from "../models/Performance"
import { Meeting } from "../models/Meeting"

export class ReportController {
  // ---- NEW: Full aggregated reports summary across all modules ----
  static async getFullReportSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) return res.status(400).json({ success: false, message: "Organization context required" })
      const org_id = req.org_id
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

      // ---- HR ----
      const [totalUsers, newUsersThisMonth, newUsersLastMonth] = await Promise.all([
        User.countDocuments({ org_id }),
        User.countDocuments({ org_id, createdAt: { $gte: startOfMonth } }),
        User.countDocuments({ org_id, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      ])
      const usersByDept = await User.aggregate([
        { $match: { org_id } },
        { $group: { _id: { $ifNull: ["$department", "Unassigned"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])

      // ---- LEAVE ----
      const [leavePending, leaveApproved, leaveRejected, leaveThisMonth] = await Promise.all([
        LeaveRequest.countDocuments({ org_id, status: "pending" }),
        LeaveRequest.countDocuments({ org_id, status: "approved" }),
        LeaveRequest.countDocuments({ org_id, status: "rejected" }),
        LeaveRequest.countDocuments({ org_id, createdAt: { $gte: startOfMonth } }),
      ])
      const leaveByType = await LeaveRequest.aggregate([
        { $match: { org_id } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])

      // ---- ATTENDANCE ----
      const [presentCount, absentCount, lateCount] = await Promise.all([
        Attendance.countDocuments({ org_id, status: "present", date: { $gte: startOfMonth } }),
        Attendance.countDocuments({ org_id, status: "absent", date: { $gte: startOfMonth } }),
        Attendance.countDocuments({ org_id, status: "late", date: { $gte: startOfMonth } }),
      ])
      const attendanceTotal = presentCount + absentCount + lateCount
      const attendanceRate = attendanceTotal > 0 ? Math.round((presentCount / attendanceTotal) * 100) : 0

      // ---- PAYROLL ----
      const payrollMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      const payrollThisMonth = await Payroll.aggregate([
        { $match: { org_id, month: payrollMonth } },
        { $group: { _id: null, totalNetPay: { $sum: "$net_pay" }, count: { $sum: 1 }, totalBase: { $sum: "$base_salary" } } },
      ])
      const payrollStats = payrollThisMonth[0] || { totalNetPay: 0, count: 0, totalBase: 0 }
      const payrollByStatus = await Payroll.aggregate([
        { $match: { org_id, month: payrollMonth } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])

      // ---- PERFORMANCE ----
      const perfStats = await Performance.aggregate([
        { $match: { org_id } },
        { $group: { _id: null, avgScore: { $avg: "$overall_score" }, count: { $sum: 1 } } },
      ])
      const avgPerformance = perfStats[0]?.avgScore ? Number(perfStats[0].avgScore.toFixed(1)) : 0
      const perfByStatus = await Performance.aggregate([
        { $match: { org_id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])

      // ---- STOCK ----
      const [totalProducts, outOfStockProducts, invoicesMonth, invoicesLastMonth, quotationsMonth] = await Promise.all([
        StockProduct.countDocuments({ org_id }),
        StockProduct.countDocuments({ org_id, currentQuantity: { $lte: 0 } }),
        StockInvoice.find({ org_id, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }).select("subTotal status").lean(),
        StockInvoice.find({ org_id, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).select("subTotal").lean(),
        StockQuotation.countDocuments({ org_id, createdAt: { $gte: startOfMonth } }),
      ])
      const revenueThisMonth = invoicesMonth.reduce((s: number, inv: any) => s + Number(inv.subTotal || 0), 0)
      const revenueLastMonth = invoicesLastMonth.reduce((s: number, inv: any) => s + Number(inv.subTotal || 0), 0)
      const revenueGrowth = revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : revenueThisMonth > 0 ? 100 : 0
      const outstandingInvoices = invoicesMonth.filter((inv: any) => inv.status === "issued").length

      // Revenue 6-month trend
      const revenueTrend = await StockInvoice.aggregate([
        { $match: { org_id, createdAt: { $gte: startOfYear } } },
        { $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$subTotal" },
          count: { $sum: 1 },
        }},
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])

      // ---- MEETINGS ----
      const [meetingsMonth, meetingsLastMonth, totalMeetings] = await Promise.all([
        Meeting.countDocuments({ org_id, createdAt: { $gte: startOfMonth } }),
        Meeting.countDocuments({ org_id, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
        Meeting.countDocuments({ org_id }),
      ])

      // ---- SUBMITTED REPORTS ----
      const [reportsPending, reportsApproved, reportsSubmitted] = await Promise.all([
        Report.countDocuments({ org_id, status: "submitted" }),
        Report.countDocuments({ org_id, status: "approved" }),
        Report.countDocuments({ org_id, createdAt: { $gte: startOfMonth } }),
      ])
      const reportsByType = await Report.aggregate([
        { $match: { org_id, status: { $in: ["submitted", "approved"] } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      const topContributors = await Report.aggregate([
        { $match: { org_id, status: { $in: ["submitted", "approved"] } } },
        { $group: { _id: "$user_id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", let: { uid: { $toObjectId: "$_id" } }, pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$uid"] } } }, { $project: { firstName: 1, lastName: 1, email: 1 } }], as: "user" } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      ])

      return res.status(200).json({
        success: true,
        data: {
          period: { month: payrollMonth, startOfMonth, endOfMonth },
          hr: { totalUsers, newUsersThisMonth, newUsersLastMonth, usersByDept },
          leave: { leavePending, leaveApproved, leaveRejected, leaveThisMonth, leaveByType },
          attendance: { presentCount, absentCount, lateCount, attendanceRate, attendanceTotal },
          payroll: { ...payrollStats, payrollByStatus },
          performance: { avgPerformance, count: perfStats[0]?.count || 0, perfByStatus },
          stock: { totalProducts, outOfStockProducts, revenueThisMonth, revenueLastMonth, revenueGrowth, outstandingInvoices, quotationsMonth, revenueTrend, invoiceCount: invoicesMonth.length },
          meetings: { meetingsMonth, meetingsLastMonth, totalMeetings },
          reports: { reportsPending, reportsApproved, reportsSubmitted, reportsByType, topContributors },
        },
      })
    } catch (error: any) {
      console.error("getFullReportSummary error:", error)
      return res.status(500).json({ success: false, message: "Failed to generate full report summary", error: error.message })
    }
  }

  // Create or update draft report
  static async saveReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id, type, title, content, tags } = req.body

      if (!type || !title || !content) {
        return res.status(400).json({ success: false, message: "type, title, and content are required" })
      }

      if (!["daily", "weekly", "monthly", "quarterly", "annual"].includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid report type" })
      }

      let report

      if (report_id) {
        // Update existing draft
        report = await Report.findOne({
          _id: report_id,
          org_id: req.org_id,
          user_id: req.user.userId,
          status: "draft",
        })

        if (!report) {
          return res.status(404).json({ success: false, message: "Draft report not found" })
        }

        report.type = type
        report.title = title
        report.content = content
        report.tags = tags || []
        await report.save()
      } else {
        // Create new draft
        report = await Report.create({
          org_id: req.org_id,
          user_id: req.user.userId,
          type,
          title,
          content,
          tags: tags || [],
          status: "draft",
        })
      }

      res.status(200).json({
        success: true,
        message: "Report saved as draft",
        data: report,
      })
    } catch (error) {
      console.error("Save report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to save report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // General dashboard-style summary for reports page
  static async getGeneralReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const org_id = req.org_id

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      // Revenue today
      const invoicesToday = await StockInvoice.find({ org_id, createdAt: { $gte: startOfToday, $lte: endOfToday } }).select('subTotal').lean()
      const revenueToday = invoicesToday.reduce((s: number, inv: any) => s + Number(inv.subTotal || 0), 0)

      // Revenue this month
      const invoicesMonth = await StockInvoice.find({ org_id, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }).select('subTotal').lean()
      const revenueThisMonth = invoicesMonth.reduce((s: number, inv: any) => s + Number(inv.subTotal || 0), 0)

      // Outstanding invoices
      const outstandingInvoices = await StockInvoice.countDocuments({ org_id, status: 'issued' })

      // Quotations sent (this month)
      const quotationsSent = await StockQuotation.countDocuments({ org_id, createdAt: { $gte: startOfMonth, $lte: endOfMonth } })

      // Service jobs
      const openServiceJobs = await MachineService.countDocuments({ org_id, $or: [{ completedDate: null }, { completedDate: { $exists: false } }] })
      const completedServiceJobs = await MachineService.countDocuments({ org_id, completedDate: { $exists: true, $ne: null } })

      // Machines due for preventive maintenance (nextServiceDate within 30 days)
      const in30 = new Date()
      in30.setDate(in30.getDate() + 30)
      const machinesDueForPM = await InstalledMachine.countDocuments({ org_id, nextServiceDate: { $exists: true, $ne: null, $lte: in30 } })

      // Low stock items
      const lowStockCountAgg: any = await StockProduct.aggregate([
        { $match: { org_id } },
        { $project: { isLow: { $lte: ['$currentQuantity', '$minAlertQuantity'] } } },
        { $match: { isLow: true } },
        { $count: 'count' },
      ])
      const lowStockItems = (lowStockCountAgg[0] && lowStockCountAgg[0].count) || 0

      return res.status(200).json({
        success: true,
        data: {
          revenueToday,
          revenueThisMonth,
          outstandingInvoices,
          quotationsSent,
          openServiceJobs,
          completedServiceJobs,
          machinesDueForPM,
          lowStockItems,
        },
      })
    } catch (error: any) {
      console.error('Get general report error:', error)
      return res.status(500).json({ success: false, message: 'Failed to generate general report', error: error.message || String(error) })
    }
  }

  // Submit report for approval
  static async submitReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id } = req.body

      if (!report_id) {
        return res.status(400).json({ success: false, message: "report_id is required" })
      }

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
        user_id: req.user.userId,
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      report.status = "submitted"
      report.submitted_at = new Date()
      await report.save()

      res.status(200).json({
        success: true,
        message: "Report submitted for approval",
        data: report,
      })
    } catch (error) {
      console.error("Submit report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to submit report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get user's reports (drafts and submitted)
  static async getUserReports(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { type, status } = req.query

      let filter: any = {
        org_id: req.org_id,
        user_id: req.user.userId,
      }

      if (type) filter.type = type
      if (status) filter.status = status

      const reports = await Report.find(filter).sort({ created_at: -1 }).populate("user_id", "firstName lastName email")

      res.status(200).json({
        success: true,
        data: reports,
        count: reports.length,
      })
    } catch (error) {
      console.error("Get user reports error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch reports",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get single report
  static async getReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { report_id } = req.params

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
      })
        .populate("user_id", "firstName lastName email")
        .populate("approved_by", "firstName lastName email")

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      res.status(200).json({
        success: true,
        data: report,
      })
    } catch (error) {
      console.error("Get report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Get all submitted reports
  static async getAllSubmittedReports(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { type, status, user_id } = req.query

      let filter: any = {
        org_id: req.org_id,
        status: { $in: ["submitted", "approved", "rejected"] },
      }

      if (type) filter.type = type
      if (status) filter.status = status
      if (user_id) filter.user_id = user_id

      const reports = await Report.find(filter)
        .sort({ submitted_at: -1 })
        .populate("user_id", "firstName lastName email")
        .populate("approved_by", "firstName lastName email")

      res.status(200).json({
        success: true,
        data: reports,
        count: reports.length,
      })
    } catch (error) {
      console.error("Get all reports error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch reports",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Approve report
  static async approveReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id } = req.body

      if (!report_id) {
        return res.status(400).json({ success: false, message: "report_id is required" })
      }

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      report.status = "approved"
      report.approved_at = new Date()
      report.approved_by = req.user.userId
      await report.save()

      res.status(200).json({
        success: true,
        message: "Report approved",
        data: report,
      })
    } catch (error) {
      console.error("Approve report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to approve report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Reject report
  static async rejectReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id, reason } = req.body

      if (!report_id) {
        return res.status(400).json({ success: false, message: "report_id is required" })
      }

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      report.status = "rejected"
      report.rejection_reason = reason || "No reason provided"
      report.approved_by = req.user.userId
      report.approved_at = new Date()
      await report.save()

      res.status(200).json({
        success: true,
        message: "Report rejected",
        data: report,
      })
    } catch (error) {
      console.error("Reject report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to reject report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete draft report
  static async deleteReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id } = req.params

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
        user_id: req.user.userId,
        status: "draft",
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Draft report not found" })
      }

      await Report.deleteOne({ _id: report_id })

      res.status(200).json({
        success: true,
        message: "Report deleted",
      })
    } catch (error) {
      console.error("Delete report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Get report analytics
  static async getReportAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { type, month } = req.query

      let filter: any = { org_id: req.org_id }
      if (type) filter.type = type

      // Get counts by status
      const statusCounts = await Report.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])

      // Get counts by type
      const typeCounts = await Report.aggregate([
        { $match: filter },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ])

      // Get counts by user (top submitters)
      const topSubmitters = await Report.aggregate([
        { $match: { ...filter, status: "submitted" } },
        { $group: { _id: "$user_id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
      ])

      res.status(200).json({
        success: true,
        data: {
          status_summary: statusCounts,
          type_summary: typeCounts,
          top_submitters: topSubmitters,
        },
      })
    } catch (error) {
      console.error("Get report analytics error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Monthly invoice/quotation/stock movement summary
  static async getMonthlyInvoiceSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { startDate, endDate, include } = req.query

      const org_id = req.org_id

      const start = startDate ? new Date(String(startDate)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const end = endDate ? new Date(String(endDate)) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)

      const includeSet = new Set<string>((String(include || "quotations,invoices,stock")).split(",").map((s) => s.trim()))

      const rows: Array<{ date: Date; type: string; reference: string }> = []

      if (includeSet.has("quotations")) {
        const quotations = await StockQuotation.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("quotationNumber createdAt").lean()
        quotations.forEach((q: any) => rows.push({ date: q.createdAt, type: "quotation", reference: q.quotationNumber }))
      }

      if (includeSet.has("invoices")) {
        const invoices = await StockInvoice.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("invoiceNumber createdAt quotationNumber").lean()
        invoices.forEach((inv: any) => rows.push({ date: inv.createdAt, type: "invoice", reference: inv.invoiceNumber }))
      }

      if (includeSet.has("stock")) {
        const entries = await StockEntry.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("_id createdAt").lean()
        entries.forEach((e: any) => rows.push({ date: e.createdAt, type: "stock_entry", reference: String(e._id) }))

        const sales = await StockSale.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("receiptNumber createdAt").lean()
        sales.forEach((s: any) => rows.push({ date: s.createdAt, type: "stock_sale", reference: s.receiptNumber }))
      }

      // Sort by date
      rows.sort((a, b) => a.date.getTime() - b.date.getTime())

      res.status(200).json({ success: true, data: rows })
    } catch (error) {
      console.error("Get monthly invoice summary error:", error)
      res.status(500).json({ success: false, message: "Failed to fetch monthly summary", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  // Admin: Download CSV for monthly invoice/quotation/stock movement summary
  static async downloadMonthlyInvoiceSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { startDate, endDate, include } = req.query
      const org_id = req.org_id
      const start = startDate ? new Date(String(startDate)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const end = endDate ? new Date(String(endDate)) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      const includeSet = new Set<string>((String(include || "quotations,invoices,stock")).split(",").map((s) => s.trim()))

      const rows: Array<{ date: Date; type: string; reference: string }> = []

      if (includeSet.has("quotations")) {
        const quotations = await StockQuotation.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("quotationNumber createdAt").lean()
        quotations.forEach((q: any) => rows.push({ date: q.createdAt, type: "quotation", reference: q.quotationNumber }))
      }

      if (includeSet.has("invoices")) {
        const invoices = await StockInvoice.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("invoiceNumber createdAt quotationNumber").lean()
        invoices.forEach((inv: any) => rows.push({ date: inv.createdAt, type: "invoice", reference: inv.invoiceNumber }))
      }

      if (includeSet.has("stock")) {
        const entries = await StockEntry.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("_id createdAt").lean()
        entries.forEach((e: any) => rows.push({ date: e.createdAt, type: "stock_entry", reference: String(e._id) }))
        const sales = await StockSale.find({ org_id, createdAt: { $gte: start, $lt: end } }).select("receiptNumber createdAt").lean()
        sales.forEach((s: any) => rows.push({ date: s.createdAt, type: "stock_sale", reference: s.receiptNumber }))
      }

      // Sort
      rows.sort((a, b) => a.date.getTime() - b.date.getTime())

      // Build CSV
      const header = ["date", "type", "reference"]
      const lines = [header.join(",")]
      rows.forEach((r) => {
        const date = new Date(r.date).toISOString()
        const ref = String(r.reference || "")
        lines.push([`"${date}"`, r.type, `"${ref}"`].join(","))
      })
      const csv = lines.join("\n")

      const filename = `monthly-summary-${start.toISOString().slice(0,7)}.csv`
      res.setHeader("Content-Type", "text/csv;charset=utf-8")
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
      res.send(csv)
    } catch (error) {
      console.error("Download monthly invoice summary error:", error)
      res.status(500).json({ success: false, message: "Failed to generate CSV", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  // Generate summary from previous reports
  static async generateSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { fromType, toType } = req.body

      if (!fromType || !toType) {
        return res.status(400).json({ success: false, message: "fromType and toType are required" })
      }

      const validTypes = ["daily", "weekly", "monthly", "quarterly", "annual"]
      if (!validTypes.includes(fromType) || !validTypes.includes(toType)) {
        return res.status(400).json({ success: false, message: "Invalid report types" })
      }

      // Get approved reports of the source type from the last period
      const daysLookback = getDateRangeForType(fromType)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysLookback)

      const sourceReports = await Report.find({
        org_id: req.org_id,
        user_id: req.user.userId,
        type: fromType,
        status: "approved",
        approved_at: { $gte: startDate },
      }).sort({ submitted_at: -1 })

      if (sourceReports.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No approved ${fromType} reports found in the period`,
        })
      }

      // Generate summary using simple aggregation
      const summaryContent = generateSummaryText(sourceReports, fromType, toType)
      const summaryTitle = generateSummaryTitle(toType)

      res.status(200).json({
        success: true,
        data: {
          summary: summaryContent,
          title: summaryTitle,
          basedOnReportIds: sourceReports.map((r) => r._id),
          sourceReportsCount: sourceReports.length,
        },
      })
    } catch (error) {
      console.error("Generate summary error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate summary",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

// Helper functions for summary generation
function getDateRangeForType(type: string): number {
  switch (type) {
    case "daily":
      return 1
    case "weekly":
      return 7
    case "monthly":
      return 30
    case "quarterly":
      return 90
    case "annual":
      return 365
    default:
      return 7
  }
}

function generateSummaryTitle(toType: string): string {
  const now = new Date()
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  switch (toType) {
    case "weekly":
      return `Weekly Report - Week of ${now.toLocaleDateString()}`
    case "monthly":
      return `Monthly Report - ${monthNames[now.getMonth()]} ${now.getFullYear()}`
    case "quarterly": {
      const quarter = Math.floor(now.getMonth() / 3) + 1
      return `Quarterly Report Q${quarter} ${now.getFullYear()}`
    }
    case "annual":
      return `Annual Report - ${now.getFullYear()}`
    default:
      return "Summary Report"
  }
}

function generateSummaryText(reports: any[], fromType: string, toType: string): string {
  const reportCount = reports.length
  const allContent = reports.map((r) => r.content).join("\n\n---\n\n")

  // Extract key points and highlights
  const keyPoints = extractKeyPoints(reports)
  const metrics = extractMetrics(reports)

  let summary = `# ${toType.charAt(0).toUpperCase() + toType.slice(1)} Summary\n\n`
  summary += `**Generated from ${reportCount} ${fromType} report(s)**\n\n`

  if (keyPoints.length > 0) {
    summary += `## Key Highlights\n`
    keyPoints.forEach((point) => {
      summary += `- ${point}\n`
    })
    summary += "\n"
  }

  if (Object.keys(metrics).length > 0) {
    summary += `## Metrics\n`
    Object.entries(metrics).forEach(([key, value]) => {
      summary += `- **${key}:** ${value}\n`
    })
    summary += "\n"
  }

  summary += `## Detailed Summary\n\n${allContent}`

  return summary
}

function extractKeyPoints(reports: any[]): string[] {
  const points: string[] = []

  // Look for common keywords indicating key achievements or activities
  const keywords = [
    "completed",
    "achieved",
    "delivered",
    "launched",
    "accomplished",
    "finished",
    "success",
    "milestone",
  ]

  reports.forEach((report) => {
    const content = report.content.toLowerCase()
    keywords.forEach((keyword) => {
      if (content.includes(keyword)) {
        // Extract sentences containing the keyword
        const sentences = report.content.split(/[.!?]+/)
        sentences.forEach((sentence) => {
          if (
            sentence.toLowerCase().includes(keyword) &&
            sentence.trim().length > 10 &&
            !points.includes(sentence.trim())
          ) {
            points.push(sentence.trim())
          }
        })
      }
    })
  })

  return points.slice(0, 5) // Return top 5 key points
}

function extractMetrics(reports: any[]): Record<string, string | number> {
  const metrics: Record<string, string | number> = {}
  const numberPattern = /(\d+(?:\.\d+)?)\s*(hours|days|items|tasks|projects|meetings|calls)?/gi

  let totalHours = 0
  let totalItems = 0
  let meetingCount = 0

  reports.forEach((report) => {
    const matches = report.content.matchAll(numberPattern)
    Array.from(matches).forEach((match) => {
      const number = parseFloat(match[1])
      const unit = (match[2] || "").toLowerCase()

      if (unit.includes("hour")) totalHours += number
      if (unit.includes("item") || unit.includes("task")) totalItems += number
      if (report.content.toLowerCase().includes("meeting")) meetingCount++
    })
  })

  if (totalHours > 0) metrics["Total Hours Worked"] = totalHours
  if (totalItems > 0) metrics["Total Items Completed"] = totalItems
  if (meetingCount > 0) metrics["Meetings/Calls"] = meetingCount

  return metrics
}
