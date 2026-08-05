import { Router } from "express"
import { AwardController } from "../controllers/awardController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get awards
router.get("/", AwardController.getAwards)

// Create award (Admin only)
router.post("/", roleMiddleware("company_admin", "hr"), AwardController.createAward)

// Get nominations
router.get("/nominations/", AwardController.getNominations)

// Create nomination
router.post("/nominations/", AwardController.createNomination)

// Get leaderboard
router.get("/leaderboard/top", AwardController.getLeaderboard)

export default router
