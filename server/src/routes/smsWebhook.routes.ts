import { Router } from "express"
import { SmsWebhookController } from "../controllers/smsWebhookController"

const router = Router()

router.post("/dlr", SmsWebhookController.deliveryReport)

export default router
