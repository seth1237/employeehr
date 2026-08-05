import { Router } from "express"
import { MpesaWebhookController } from "../controllers/mpesaWebhookController"

const router = Router()

router.post("/callback", MpesaWebhookController.stkCallback)

export default router
