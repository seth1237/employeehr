import express from "express"
import { FeedbackSurveyController } from "../controllers/feedbackSurveyController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"

const router = express.Router()

// ==================== PUBLIC ROUTES (No Auth) ====================
// IMPORTANT: Public routes MUST come before protected routes with similar patterns
router.get("/public/:poolId", FeedbackSurveyController.getPublicPool)
router.post("/public/:poolId/submit", FeedbackSurveyController.submitFeedback)

// Public survey routes (direct survey access without pools)
router.get("/survey/:surveyToken", FeedbackSurveyController.getPublicSurvey)
router.post("/survey/:surveyToken/submit", FeedbackSurveyController.submitPublicSurvey)

// ==================== ADMIN ROUTES (Protected) ====================
router.post(
    "/",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.createSurvey
)
router.get(
    "/",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.getSurveys
)
router.get(
    "/:surveyId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.getSurveyDetails
)
router.put(
    "/:surveyId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.updateSurvey
)
router.delete(
    "/:surveyId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.deleteSurvey
)

// Pool routes under survey
router.post(
    "/:surveyId/pools",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.createPool
)
router.get(
    "/:surveyId/pools/:poolId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.getPoolDetails
)
router.put(
    "/:surveyId/pools/:poolId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.updatePool
)
router.get(
    "/:surveyId/pools/:poolId/responses",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.getPoolResponses
)
router.delete(
    "/:surveyId/pools/:poolId",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.deletePool
)

// Generate public token for survey (protected)
router.post(
    "/:surveyId/generate-token",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.generatePublicToken
)

// Get survey responses (protected)
router.get(
    "/:surveyId/responses",
    authMiddleware,
    orgMiddleware,
    roleMiddleware("company_admin", "hr", "super_admin"),
    FeedbackSurveyController.getSurveyResponses
)

export default router
