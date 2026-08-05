import { Router } from "express"
import { InvitationController } from "../controllers/invitationController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Public endpoint: accept invitation (no auth required initially)
router.post("/accept", InvitationController.acceptInvitation)

// Protected endpoints
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Send invitations (Admin/HR only)
router.post("/send", roleMiddleware("company_admin", "hr"), InvitationController.sendInvitations)

// Get pending invitations (Admin/HR only)
router.get("/pending", roleMiddleware("company_admin", "hr"), InvitationController.getPendingInvitations)

// Resend invitation (Admin/HR only)
router.post("/resend", roleMiddleware("company_admin", "hr"), InvitationController.resendInvitation)

export default router
