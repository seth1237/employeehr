import { Router } from "express"
import { ApplicationFormController } from "../controllers/applicationFormController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Public route: fetch form for a job (used on public careers page)
router.get("/job/:jobId", ApplicationFormController.getFormByJobId)

// Protected routes (require authentication)
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Create form (Admin/HR only)
router.post("/", roleMiddleware("company_admin", "hr"), ApplicationFormController.createForm)

// Get all forms
router.get("/", ApplicationFormController.getAllForms)

// Update form (Admin/HR only)
router.put("/:formId", roleMiddleware("company_admin", "hr"), ApplicationFormController.updateForm)

// Delete form (Admin/HR only)
router.delete("/:formId", roleMiddleware("company_admin", "hr"), ApplicationFormController.deleteForm)

export default router
