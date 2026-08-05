import { Router } from "express"
import { MessageController } from "../controllers/messageController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get inbox messages
router.get("/inbox", MessageController.getInboxMessages)

// Get sent messages
router.get("/sent", MessageController.getSentMessages)

// Get message by ID
router.get("/:messageId", MessageController.getMessageById)

// Send message
router.post("/send", MessageController.sendMessage)

// Mark message as read
router.put("/:messageId/read", MessageController.markAsRead)

// Reply to message
router.post("/:messageId/reply", MessageController.replyToMessage)

// Delete message
router.delete("/:messageId", MessageController.deleteMessage)

export default router
