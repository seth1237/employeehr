import { Router } from "express"
import { PerformanceController } from "../controllers/performanceController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get all performances for organization (must be before /:userId/:period)
router.get("/", PerformanceController.getOrganizationPerformances)

// Get performance by period
router.get("/:userId/:period", PerformanceController.getPerformanceByPeriod)

// Update KPI score
router.put("/:performanceId/kpi/:kpiId", PerformanceController.updateKPIScore)

export default router
