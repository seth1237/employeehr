import { Router } from "express"
import { JobApplicationController } from "../controllers/jobApplicationController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { uploadJobApplicationFiles } from "../middleware/upload.middleware"
import type { Request, Response, NextFunction } from "express"

const router = Router()

function handleApplicationUploads(req: Request, res: Response, next: NextFunction) {
  uploadJobApplicationFiles.any()(req, res, (err: any) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: "Document too large" })
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message || "Upload failed" })
    }
    next()
  })
}

// Public routes (no auth required)
router.post("/submit", handleApplicationUploads, JobApplicationController.submitApplication)

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

// Hire applicant → employee + onboarding
router.post(
  "/:applicationId/hire",
  roleMiddleware("company_admin", "hr", "admin"),
  JobApplicationController.hireApplicant,
)

// Add note to application
router.post("/:applicationId/notes", roleMiddleware("company_admin", "hr"), JobApplicationController.addNote)

// Rate application
router.patch("/:applicationId/rating", roleMiddleware("company_admin", "hr"), JobApplicationController.rateApplication)

// Download application file
router.get("/:applicationId/download/:fieldId", roleMiddleware("company_admin", "hr"), JobApplicationController.downloadFile)

export default router
