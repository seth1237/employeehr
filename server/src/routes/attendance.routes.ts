import { Router } from "express"
import { AttendanceController } from "../controllers/attendanceController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.get("/my-attendance", AttendanceController.getMyAttendance)
router.post("/check-in", AttendanceController.checkIn)
router.post("/check-out", AttendanceController.checkOut)

// Get organization attendance records (Admin/HR/Manager)
router.get("/", roleMiddleware("company_admin", "hr", "manager"), AttendanceController.getAllAttendance)

// Get attendance records
router.get("/:userId", AttendanceController.getAttendanceRecords)

// Mark attendance (Manager or Admin)
router.post("/", roleMiddleware("manager", "company_admin", "hr"), AttendanceController.markAttendance)

export default router
