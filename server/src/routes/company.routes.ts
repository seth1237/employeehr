import { Router } from "express"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { CompanyController } from "../controllers/companyController"
import { CompanyEmailController } from "../controllers/companyEmailController"
import { DepartmentController } from "../controllers/departmentController"
import { uploadLogo } from "../middleware/upload.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Page access settings
router.get("/page-access", roleMiddleware("company_admin", "hr", "manager"), CompanyController.getPageAccessSettings)
router.post("/page-access", roleMiddleware("company_admin"), CompanyController.updatePageAccessSettings)

// Branding
router.get("/branding", CompanyController.getBranding)
router.post("/branding", roleMiddleware("company_admin", "hr"), uploadLogo.single("logo"), CompanyController.updateBranding)

// Invoice Generation Settings
router.get("/invoice-settings", roleMiddleware("company_admin", "hr"), CompanyController.getInvoiceSettings)
router.post("/invoice-settings", roleMiddleware("company_admin", "hr"), CompanyController.updateInvoiceSettings)

// Dispatch SMS Settings
router.get("/dispatch-sms", roleMiddleware("company_admin", "hr"), CompanyController.getDispatchSmsSettings)
router.post("/dispatch-sms", roleMiddleware("company_admin", "hr"), CompanyController.updateDispatchSmsSettings)

// Stock settings (bypass website quotation approval)
router.get("/stock-settings", roleMiddleware("company_admin", "hr"), CompanyController.getStockSettings)
router.post("/stock-settings", roleMiddleware("company_admin"), CompanyController.updateStockSettings)

// Email Configuration (Admin only)
router.get("/email-config", roleMiddleware("company_admin", "hr"), CompanyEmailController.getEmailConfig)
router.post("/email-config", roleMiddleware("company_admin", "hr"), CompanyEmailController.updateEmailConfig)
router.post("/email-config/verify", roleMiddleware("company_admin", "hr"), CompanyEmailController.verifyEmailConfig)
router.post("/email-config/disable", roleMiddleware("company_admin", "hr"), CompanyEmailController.disableEmailConfig)

// Departments
router.get('/departments', roleMiddleware('company_admin', 'hr', 'manager'), DepartmentController.list)
router.post('/departments', roleMiddleware('company_admin', 'hr'), DepartmentController.create)
router.put('/departments/:id', roleMiddleware('company_admin', 'hr'), DepartmentController.update)
router.delete('/departments/:id', roleMiddleware('company_admin', 'hr'), DepartmentController.remove)

export default router
