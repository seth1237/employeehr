import { Router } from "express"
import { ReportController } from "../controllers/reportController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Protected routes - require authentication
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Employee routes
router.post("/save", ReportController.saveReport)
router.post("/submit", ReportController.submitReport)
router.post("/generate-summary", ReportController.generateSummary)
router.get("/my-reports", ReportController.getUserReports)
router.delete("/:report_id", ReportController.deleteReport)

// Admin routes
router.get("/admin/full-summary", roleMiddleware("company_admin", "hr", "manager"), ReportController.getFullReportSummary)
router.get("/admin/all", roleMiddleware("company_admin", "hr"), ReportController.getAllSubmittedReports)
router.post("/admin/approve", roleMiddleware("company_admin", "hr"), ReportController.approveReport)
router.post("/admin/reject", roleMiddleware("company_admin", "hr"), ReportController.rejectReport)
router.get("/admin/analytics", roleMiddleware("company_admin", "hr"), ReportController.getReportAnalytics)
router.get("/admin/monthly-invoice-summary", roleMiddleware("company_admin", "hr"), ReportController.getMonthlyInvoiceSummary)
router.get("/admin/monthly-invoice-summary/download", roleMiddleware("company_admin", "hr"), ReportController.downloadMonthlyInvoiceSummary)
router.get("/general", ReportController.getGeneralReport)
router.get("/:report_id", ReportController.getReport)

export default router
