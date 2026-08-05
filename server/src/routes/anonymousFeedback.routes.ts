import express from "express"
import { AnonymousFeedbackController } from "../controllers/anonymousFeedbackController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"

const router = express.Router()

// ==================== ADMIN ROUTES (Protected - Admin Only) ====================
router.post(
    "/pools",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    AnonymousFeedbackController.createFeedbackPool
)
router.get(
    "/pools",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    AnonymousFeedbackController.getFeedbackPools
)
router.get(
    "/pools/:poolId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    AnonymousFeedbackController.getPoolDetails
)
router.post(
    "/pools/:poolId/generate-links",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    AnonymousFeedbackController.generatePoolLinks
)
router.get(
    "/analytics/:employeeId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    AnonymousFeedbackController.getEmployeeFeedbackAnalytics
)
router.delete(
    "/pools/:poolId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    AnonymousFeedbackController.deleteFeedbackPool
)
router.get(
    "/pools/:poolId/responses",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    AnonymousFeedbackController.getPoolResponses
)

// ==================== PUBLIC ROUTES (No Auth Required) ====================
router.post("/public/validate", AnonymousFeedbackController.validateFeedbackToken)
router.post("/public/members", AnonymousFeedbackController.getPoolMembersPublic)
router.post("/public/submit", AnonymousFeedbackController.submitFeedback)
router.post("/public/progress", AnonymousFeedbackController.getFeedbackProgress)

export default router
