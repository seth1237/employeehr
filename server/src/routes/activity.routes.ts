import { Router } from "express"
import { ActivityController } from "../controllers/activityController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

// Requires authentication to track activity
router.use(authMiddleware)

// Track pulse/view heartbeat
router.post("/track", ActivityController.trackActivity)

export default router
