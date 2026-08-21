import { Router } from "express"
import { SmsWebhookController } from "../controllers/smsWebhookController"

const router = Router()

// Onfon pushes DLR as GET; Africa's Talking style callbacks often POST.
router.get("/dlr", SmsWebhookController.deliveryReport)
router.post("/dlr", SmsWebhookController.deliveryReport)
router.get("/onfon/dlr", SmsWebhookController.deliveryReport)
router.post("/onfon/dlr", SmsWebhookController.deliveryReport)

export default router
