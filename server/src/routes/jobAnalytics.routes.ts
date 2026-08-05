import { Router } from "express"
import { JobAnalyticsController } from "../controllers/jobAnalyticsController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Protected routes (require authentication)
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get analytics overview for all jobs
router.get("/overview", roleMiddleware("company_admin", "hr"), JobAnalyticsController.getAnalyticsOverview)

// Get analytics for specific job
router.get("/job/:jobId", roleMiddleware("company_admin", "hr"), JobAnalyticsController.getJobAnalytics)

// Track job view
router.post("/track-view/:jobId", JobAnalyticsController.trackJobView)

export default router
