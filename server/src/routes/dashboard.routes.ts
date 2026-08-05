import { Router } from "express"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { DashboardController } from "../controllers/dashboardController"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Admin/HR/Manager Dashboard Stats
router.get("/stats", roleMiddleware("company_admin", "admin", "hr", "manager"), DashboardController.getAdminStats)

export default router
