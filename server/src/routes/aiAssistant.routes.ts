import { Router } from "express"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { AiAssistantController } from "../controllers/aiAssistantController"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.get("/status", AiAssistantController.getStatus)
router.post("/chat", AiAssistantController.chat)

export default router
