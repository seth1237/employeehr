import { Router } from "express"
import { LeaveController } from "../controllers/LeaveController"
import { authMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router: Router = Router()

router.use(authMiddleware, tenantIsolation)

const selfServiceRoles = ["sales_rep", "employee", "manager", "hr", "admin", "company_admin"] as const
router.post("/apply", roleMiddleware(...selfServiceRoles), LeaveController.apply)
router.get("/my-requests", roleMiddleware(...selfServiceRoles), LeaveController.getMyRequests)
router.get("/balance", roleMiddleware(...selfServiceRoles), LeaveController.getBalance)

// Manager routes
router.get("/team-requests", roleMiddleware("manager", "company_admin", "hr"), LeaveController.getTeamRequests)
router.put("/request/:id", roleMiddleware("manager", "company_admin", "hr"), LeaveController.updateStatus)

// Admin/HR routes
router.get("/admin/all", roleMiddleware("company_admin", "hr"), LeaveController.getAllRequests)
router.get(
  "/admin/balances",
  roleMiddleware("company_admin", "hr", "admin"),
  LeaveController.getAllBalances,
)
router.put(
  "/admin/balances/:userId",
  roleMiddleware("company_admin", "hr", "admin"),
  LeaveController.updateBalance,
)
router.get(
  "/admin/calendar",
  roleMiddleware("company_admin", "hr", "admin", "manager"),
  LeaveController.getCalendar,
)

export default router
