import { Router } from "express"
import { OnboardingController } from "../controllers/onboardingController"
import { authMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, tenantIsolation)

router.get(
  "/",
  roleMiddleware("company_admin", "admin", "hr", "manager"),
  OnboardingController.list,
)
router.get(
  "/user/:userId",
  roleMiddleware("company_admin", "admin", "hr", "manager"),
  OnboardingController.getByUser,
)
router.post(
  "/",
  roleMiddleware("company_admin", "admin", "hr"),
  OnboardingController.createForUser,
)
router.patch(
  "/:checklistId/tasks/:taskId",
  roleMiddleware("company_admin", "admin", "hr", "manager"),
  OnboardingController.toggleTask,
)

export default router
