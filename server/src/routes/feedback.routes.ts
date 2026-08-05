import { Router } from "express"
import { FeedbackController } from "../controllers/feedbackController"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get all feedback for organization (Admin/HR/Manager)
router.get("/", roleMiddleware("company_admin", "hr", "manager"), FeedbackController.getAllFeedback)

// Get feedback for user
router.get("/:userId", FeedbackController.getFeedbackForUser)

// Submit feedback
router.post("/", FeedbackController.submitFeedback)

// Get 360 feedback summary
router.get("/:userId/summary", FeedbackController.get360FeedbackSummary)

export default router
