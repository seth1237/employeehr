import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { User } from "../models/User"
import { KPI } from "../models/KPI"
import { Award } from "../models/Award"
import { Performance } from "../models/Performance"
import { Attendance } from "../models/Attendance"
import { LeaveRequest } from "../models/LeaveRequest"
import { Payroll } from "../models/Payroll"
import { Meeting } from "../models/Meeting"
import { Report } from "../models/Report"
import { Feedback } from "../models/Feedback"
import { PDP } from "../models/PDP"
import { StockInvoice } from "../models/StockInvoice"
import { StockProduct } from "../models/StockProduct"
import { StockQuotation } from "../models/StockQuotation"

async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`getAdminStats ${label}:`, error)
    return fallback
  }
}

export class DashboardController {
  static async getAdminStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }
      const orgId = req.org_id

      const [
        usersRes,
        kpisRes,
        awardsRes,
        perfRes,
        attendRes,
        leaveRes,
        payrollRes,
        meetingsRes,
        reportsRes,
        feedbackRes,
        pdpRes,
        stockInvoicesRes,
        stockProductsRes,
        stockQuotationsRes,
      ] = await Promise.all([
        safeQuery("users", () => User.find({ org_id: orgId }).select("_id firstName lastName email department status createdAt profilePic").lean(), []),
        safeQuery("kpis", () => KPI.find({ org_id: orgId }).select("_id").lean(), []),
        safeQuery("awards", () => Award.find({ org_id: orgId }).select("_id").lean(), []),
        safeQuery("performances", () => Performance.find({ org_id: orgId }).select("_id user_id overall_score").lean(), []),
        safeQuery("attendance", () => Attendance.find({ org_id: orgId }).select("_id date createdAt checkIn checkOut user_id status").sort({ date: -1 }).limit(2000).lean(), []),
        safeQuery("leave", () => LeaveRequest.find({ org_id: orgId }).select("_id status leave_type createdAt updatedAt user_id user").lean(), []),
        safeQuery("payroll", () => Payroll.find({ org_id: orgId }).select("_id status").lean(), []),
        safeQuery("meetings", () => Meeting.find({ org_id: orgId }).select("_id title scheduled_at scheduled_start createdAt organizer_id").lean(), []),
        safeQuery("reports", () => Report.find({ org_id: orgId }).select("_id created_at createdAt user_id").lean(), []),
        safeQuery("feedback", () => Feedback.find({ org_id: orgId }).select("_id").lean(), []),
        safeQuery("pdps", () => PDP.find({ org_id: orgId }).select("_id").lean(), []),
        safeQuery(
          "invoices",
          () =>
            StockInvoice.find({ org_id: orgId })
              .select("_id invoiceNumber number subTotal items.productId items.productName items.quantity items.lineTotal dispatch createdAt updatedAt createdBy client clientName buyer quotationId quotationNumber")
              .sort({ updatedAt: -1 })
              .limit(400)
              .lean(),
          [],
        ),
        safeQuery("products", () => StockProduct.find({ org_id: orgId }).select("_id name currentQuantity minAlertQuantity").limit(500).lean(), []),
        safeQuery("quotations", () => StockQuotation.find({ org_id: orgId }).select("_id").limit(500).lean(), []),
      ])

      return res.status(200).json({
        success: true,
        data: {
          users: usersRes,
          kpis: kpisRes,
          awards: awardsRes,
          performances: perfRes,
          attendance: attendRes,
          leaveRequests: leaveRes,
          payroll: payrollRes,
          meetings: meetingsRes,
          reports: reportsRes,
          feedback: feedbackRes,
          pdps: pdpRes,
          stockInvoices: stockInvoicesRes,
          stockProducts: stockProductsRes,
          stockQuotations: stockQuotationsRes,
        }
      })
    } catch (error) {
      console.error("Error in getAdminStats:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard stats",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
