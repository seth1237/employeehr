import { Router } from "express"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { PosController } from "../controllers/posController"

const router = Router()
const POS_ROLES = ["pos_cashier", "company_admin", "admin", "hr", "super_admin"] as const

router.use(authMiddleware, orgMiddleware, tenantIsolation, roleMiddleware(...POS_ROLES))

router.get("/bootstrap", PosController.bootstrap)
router.get("/catalog", PosController.catalog)
router.post("/lookup", PosController.lookup)
router.post("/hold", PosController.hold)
router.get("/holds", PosController.listHolds)
router.post("/holds/:id/resume", PosController.resumeHold)
router.post("/checkout", PosController.checkout)
router.get("/sales", PosController.listSales)
router.get("/sales/:id", PosController.getSale)
router.post("/mpesa/stk", PosController.stkPush)

export default router
