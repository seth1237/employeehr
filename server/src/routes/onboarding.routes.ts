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
router.get(
  "/template",
  roleMiddleware("company_admin", "admin", "hr"),
  OnboardingController.getTemplate,
)
router.put(
  "/template",
  roleMiddleware("company_admin", "admin", "hr"),
  OnboardingController.saveTemplate,
)
router.post(
  "/",
  roleMiddleware("company_admin", "admin", "hr"),
  OnboardingController.createForUser,
)
router.patch(
  "/:checklistId/answers",
  roleMiddleware("company_admin", "admin", "hr", "manager"),
  OnboardingController.saveAnswers,
)
router.post(
  "/:checklistId/drop",
  roleMiddleware("company_admin", "admin", "hr"),
  OnboardingController.drop,
)
router.post(
  "/:checklistId/complete",
  roleMiddleware("company_admin", "admin", "hr"),
  OnboardingController.complete,
)
router.patch(
  "/:checklistId/tasks/:taskId",
  roleMiddleware("company_admin", "admin", "hr", "manager"),
  OnboardingController.toggleTask,
)

export default router
