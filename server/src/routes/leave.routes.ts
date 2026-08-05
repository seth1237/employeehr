import { Router } from "express"
import { LeaveController } from "../controllers/LeaveController"
import { authMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router: Router = Router()

router.use(authMiddleware, tenantIsolation)

router.post("/apply", LeaveController.apply)
router.get("/my-requests", LeaveController.getMyRequests)
router.get("/balance", LeaveController.getBalance)

// Manager routes
router.get("/team-requests", roleMiddleware("manager", "company_admin", "hr"), LeaveController.getTeamRequests)
router.put("/request/:id", roleMiddleware("manager", "company_admin", "hr"), LeaveController.updateStatus)

// Admin/HR routes
router.get("/admin/all", roleMiddleware("company_admin", "hr"), LeaveController.getAllRequests)

export default router
