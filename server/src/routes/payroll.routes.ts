import { Router } from "express"
import { PayrollController } from "../controllers/PayrollController"
import { authMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router: Router = Router()

router.use(authMiddleware, tenantIsolation)

router.get("/my-payslips", PayrollController.getMyPayslips)
router.get("/payslip/:id", PayrollController.getPayslipDetails)

// Admin/HR routes
router.post("/generate", roleMiddleware("company_admin", "hr"), PayrollController.generate)
router.post("/generate-bulk", roleMiddleware("company_admin", "hr"), PayrollController.generateBulk)
router.post("/mark-month-paid", roleMiddleware("company_admin", "hr"), PayrollController.markMonthPaid)
router.put("/:id", roleMiddleware("company_admin", "hr"), PayrollController.update)
router.get("/all", roleMiddleware("company_admin", "hr"), PayrollController.getAll)

export default router
