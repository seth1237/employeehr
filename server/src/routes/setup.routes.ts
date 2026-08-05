import { Router } from "express"
import { SetupController } from "../controllers/setupController"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get setup progress
router.get("/progress", SetupController.getSetupProgress)

// Update specific setup step
router.post("/step", roleMiddleware("company_admin", "hr"), SetupController.updateSetupStep)

// Complete setup
router.post("/complete", roleMiddleware("company_admin", "hr"), SetupController.completeSetup)

// Skip setup
router.post("/skip", roleMiddleware("company_admin", "hr"), SetupController.skipSetup)

// Reset setup (admin only - for testing)
router.post("/reset", roleMiddleware("company_admin"), SetupController.resetSetup)

export default router
