import { Router } from "express"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { EtimsController } from "../controllers/etimsController"

const router = Router()

// All eTIMS routes are protected and tenant isolated
router.use(authMiddleware, orgMiddleware, tenantIsolation)
router.use(roleMiddleware("company_admin", "admin", "hr", "manager")) // restrict to authorized roles

// Configuration
router.get("/config", EtimsController.getConfig)
router.post("/config", EtimsController.saveConfig)
router.post("/init-device", EtimsController.initializeDevice)

// Dashboard & Logs
router.get("/stats", EtimsController.getDashboardStats)
router.get("/logs", EtimsController.getLogs)

// Operations
router.post("/submit-invoice", EtimsController.submitInvoice)
router.post("/validate-customer", EtimsController.validateCustomer)

export default router
