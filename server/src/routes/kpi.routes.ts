import { Router } from "express"
import { KPIController } from "../controllers/kpiController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get all KPIs
router.get("/", KPIController.getAllKPIs)

// Get KPI by ID
router.get("/:kpiId", KPIController.getKPIById)

// Create KPI (Admin only)
router.post("/", roleMiddleware("company_admin", "hr"), KPIController.createKPI)

// Update KPI (Admin only)
router.put("/:kpiId", roleMiddleware("company_admin", "hr"), KPIController.updateKPI)

// Delete KPI (Admin only)
router.delete("/:kpiId", roleMiddleware("company_admin", "hr"), KPIController.deleteKPI)

export default router
