import { Router } from "express"
import { AlertController } from "../controllers/alertController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get alerts
router.get("/", AlertController.getAlerts)
router.get("/summary", AlertController.getAlertSummary)
router.get("/inbox", AlertController.getInbox)

// Mark as read
router.patch("/:alertId/read", AlertController.markAsRead)

// Dismiss
router.patch("/:alertId/dismiss", AlertController.dismissAlert)
router.delete("/:alertId", AlertController.deleteAlert)
router.patch("/type/:alert_type/dismiss-all", AlertController.dismissAllOfType)

// Generate alerts (typically called by a cron job or manually by admin)
router.post("/generate/contracts", AlertController.generateContractAlerts)
router.post("/generate/pdp", AlertController.generatePDPAlerts)
router.post("/generate/task-overload", AlertController.generateTaskOverloadAlerts)

export default router
