import { Router } from "express"
import { JobApplicationController } from "../controllers/jobApplicationController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { uploadApplicationFiles } from "../middleware/upload.middleware"

const router = Router()

// Public routes (no auth required)
router.post("/submit", uploadApplicationFiles.any(), JobApplicationController.submitApplication)

// Protected routes (require authentication)
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get all applications (Admin/HR only)
router.get("/", roleMiddleware("company_admin", "hr"), JobApplicationController.getAllApplications)

// Get application statistics
router.get("/stats", roleMiddleware("company_admin", "hr"), JobApplicationController.getApplicationStats)

// Get single application
router.get("/:applicationId", roleMiddleware("company_admin", "hr"), JobApplicationController.getApplicationById)

// Update application status
router.patch("/:applicationId/status", roleMiddleware("company_admin", "hr"), JobApplicationController.updateApplicationStatus)

// Add note to application
router.post("/:applicationId/notes", roleMiddleware("company_admin", "hr"), JobApplicationController.addNote)

// Rate application
router.patch("/:applicationId/rating", roleMiddleware("company_admin", "hr"), JobApplicationController.rateApplication)

// Download application file
router.get("/:applicationId/download/:fieldId", roleMiddleware("company_admin", "hr"), JobApplicationController.downloadFile)

export default router
