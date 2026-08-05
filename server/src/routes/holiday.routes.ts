import express from "express"
import { HolidayController } from "../controllers/holidayController"
import { authMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = express.Router()

// All routes require authentication and tenant isolation
router.use(authMiddleware)
router.use(tenantIsolation)

router.post("/sync", HolidayController.syncHolidays)
router.get("/", HolidayController.getHolidays)

export default router
