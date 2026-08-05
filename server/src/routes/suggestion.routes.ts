import { Router } from "express"
import { SuggestionController } from "../controllers/suggestionController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.get("/", SuggestionController.getSuggestions)
router.post("/", SuggestionController.createSuggestion)
router.patch("/:suggestionId/upvote", SuggestionController.upvoteSuggestion)
router.patch("/:suggestionId/status", SuggestionController.updateSuggestionStatus)
router.put("/:suggestionId/respond", SuggestionController.respondToSuggestion)

export default router
