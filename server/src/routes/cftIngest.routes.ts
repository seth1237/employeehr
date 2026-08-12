import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { CftIngestController } from "../controllers/cftIngestController"

const router = Router()

router.use(authMiddleware)
router.get("/status", CftIngestController.status)
router.post("/run", CftIngestController.runNow)

export default router
