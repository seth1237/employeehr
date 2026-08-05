import { Router } from "express"
import { PDPController } from "../controllers/pdpController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get PDPs
router.get("/", PDPController.getPDPs)
router.get("/:pdpId", PDPController.getPDPById)

// Create PDP
router.post("/", PDPController.createPDP)

// Update PDP
router.put("/:pdpId", PDPController.updatePDP)

// Update goal progress
router.put("/:pdpId/goals/:goalId", PDPController.updateGoalProgress)

// Submit PDP for approval
router.post("/:pdpId/submit", PDPController.submitPDP)

// Manager approval/rejection
router.post("/:pdpId/approve", roleMiddleware("manager", "company_admin"), PDPController.approvePDP)
router.post("/:pdpId/reject", roleMiddleware("manager", "company_admin"), PDPController.rejectPDP)

// Journal entries
router.post("/:pdpId/journal", PDPController.addJournalEntry)

// Reviews
router.post("/:pdpId/reviews", PDPController.addReview)

// Habit tracking
router.put("/:pdpId/habits/:habitId/progress", PDPController.updateHabitProgress)

// Skill tracking
router.put("/:pdpId/skills/:skillId/progress", PDPController.updateSkillProgress)

export default router
