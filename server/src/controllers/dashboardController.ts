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

export class DashboardController {
  static async getAdminStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }
      const orgId = req.org_id

      // Use .select() to pick only the fields the frontend calculates upon
      const usersRes = await User.find({ org_id: orgId }).select('_id firstName lastName email department status createdAt profilePic')
      const kpisRes = await KPI.find({ org_id: orgId }).select('_id')
      const awardsRes = await Award.find({ org_id: orgId }).select('_id')
      const perfRes = await Performance.find({ org_id: orgId }).select('_id user_id overall_score')
      const attendRes = await Attendance.find({ org_id: orgId }).select('_id date createdAt checkIn checkOut user_id status')
      const leaveRes = await LeaveRequest.find({ org_id: orgId }).select('_id status leave_type createdAt updatedAt user_id user')
      const payrollRes = await Payroll.find({ org_id: orgId }).select('_id status')
      const meetingsRes = await Meeting.find({ org_id: orgId }).select('_id title scheduled_at scheduled_start createdAt organizer_id')
      const reportsRes = await Report.find({ org_id: orgId }).select('_id created_at createdAt user_id')
      const feedbackRes = await Feedback.find({ org_id: orgId }).select('_id')
      const pdpRes = await PDP.find({ org_id: orgId }).select('_id')
      
      const stockInvoicesRes = await StockInvoice.find({ org_id: orgId }).select('_id invoiceNumber number subTotal items dispatch createdAt updatedAt createdBy client clientName buyer quotationId quotationNumber')
      const stockProductsRes = await StockProduct.find({ org_id: orgId }).select('_id name currentQuantity minAlertQuantity')
      const stockQuotationsRes = await StockQuotation.find({ org_id: orgId }).select('_id')

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
