import { Router } from "express"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { SalesController } from "../controllers/salesController"
import { uploadVisitPhoto } from "../middleware/upload.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.get("/dashboard", roleMiddleware("sales_rep"), SalesController.getDashboard)
router.get("/report", roleMiddleware("sales_rep"), SalesController.getTodayReport)
router.patch("/report", roleMiddleware("sales_rep"), SalesController.updateTodayReport)
router.post("/report/start", roleMiddleware("sales_rep"), SalesController.startDay)
router.post("/report/end", roleMiddleware("sales_rep"), SalesController.endDay)
router.post("/report/:id/submit", roleMiddleware("sales_rep"), SalesController.submitReport)
router.post(
  "/visits",
  roleMiddleware("sales_rep"),
  uploadVisitPhoto.single("photo"),
  SalesController.createVisit,
)
router.get("/categories", roleMiddleware("sales_rep"), SalesController.getCategories)
router.get("/stock", roleMiddleware("sales_rep"), SalesController.searchStock)
router.get("/clients/search", roleMiddleware("sales_rep"), SalesController.searchClients)
router.get("/clients/options", roleMiddleware("sales_rep"), SalesController.getClientOptions)
router.get("/clients", roleMiddleware("sales_rep"), SalesController.listMyClients)
router.post("/clients", roleMiddleware("sales_rep"), SalesController.createClient)
router.get("/clients/:id", roleMiddleware("sales_rep"), SalesController.getClientBook)
router.post("/clients/:id/contacts", roleMiddleware("sales_rep"), SalesController.addClientContact)
router.post("/clients/:id/activity", roleMiddleware("sales_rep"), SalesController.logClientActivity)
router.post("/activity", roleMiddleware("sales_rep"), SalesController.logClientActivity)
router.get("/quotes", roleMiddleware("sales_rep"), SalesController.listQuotes)
router.post("/quotes", roleMiddleware("sales_rep"), SalesController.createQuote)
router.patch("/quotes/:id", roleMiddleware("sales_rep"), SalesController.updateQuote)
router.post("/quotes/:id/submit", roleMiddleware("sales_rep"), SalesController.submitQuote)
router.post("/quotes/:id/downloaded", roleMiddleware("sales_rep"), SalesController.markQuoteDownloaded)
router.get("/history", roleMiddleware("sales_rep"), SalesController.getHistory)

router.get("/planner", roleMiddleware("sales_rep"), SalesController.getPlanners)
router.post("/planner", roleMiddleware("sales_rep"), SalesController.createPlanner)

router.get("/admin", roleMiddleware("company_admin", "admin", "hr"), SalesController.adminList)
router.get("/admin/visits", roleMiddleware("company_admin", "admin", "hr"), SalesController.adminListVisits)
router.post(
  "/admin/visits/:id/revoke",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminRevokeVisit,
)
router.patch(
  "/admin/reports/:id",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminUpdateReport,
)
router.patch(
  "/admin/quotes/:id",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminUpdateQuote,
)
router.post(
  "/admin/reports/:id/review",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminReviewReport,
)
router.post(
  "/admin/quotes/:id/review",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminReviewQuote,
)

router.get("/admin/planner", roleMiddleware("company_admin", "admin", "hr"), SalesController.adminGetPlanners)
router.patch(
  "/admin/planner/:id/review",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminReviewPlanner,
)
router.get(
  "/admin/performance",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminGetPerformance,
)
router.patch(
  "/admin/performance/:userId",
  roleMiddleware("company_admin", "admin", "hr"),
  SalesController.adminSetTarget,
)

export default router
