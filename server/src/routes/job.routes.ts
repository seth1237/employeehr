import { Router } from "express"
import { JobController } from "../controllers/jobController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Public routes (no auth required)
router.get("/public/:companyName/:positionIndex", JobController.getPublicJob)
router.get("/public/company/:companyName", JobController.getCompanyPublicJobs)

// Protected routes (require authentication)
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Create job (Admin/HR only)
router.post("/", roleMiddleware("company_admin", "hr"), JobController.createJob)

// Get all jobs for organization
router.get("/", JobController.getAllJobs)

// Get single job by ID
router.get("/:jobId", JobController.getJobById)

// Update job (Admin/HR only)
router.put("/:jobId", roleMiddleware("company_admin", "hr"), JobController.updateJob)

// Delete job (Admin/HR only)
router.delete("/:jobId", roleMiddleware("company_admin", "hr"), JobController.deleteJob)

// Get job statistics
router.get("/stats/overview", roleMiddleware("company_admin", "hr"), JobController.getJobStats)

export default router
