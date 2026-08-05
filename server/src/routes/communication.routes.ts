import { Router } from "express"
import { CommunicationController } from "../controllers/communicationController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Protected routes (require authentication)
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get applicants by job and status (Admin/HR only)
router.get("/applicants", roleMiddleware("company_admin", "hr"), CommunicationController.getApplicantsByStatus)

// Get sent emails history (Admin/HR only)
router.get("/sent", roleMiddleware("company_admin", "hr"), CommunicationController.getSentEmails)

// Send bulk email (Admin/HR only)
router.post("/send-bulk-email", roleMiddleware("company_admin", "hr"), CommunicationController.sendBulkEmail)

export default router
