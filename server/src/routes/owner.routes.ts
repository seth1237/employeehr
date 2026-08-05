import { Router } from "express"
import { OwnerController } from "../controllers/ownerController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

// All owner routes require authentication
router.use(authMiddleware)

// Get all companies
router.get("/companies", OwnerController.getAllCompanies)

// Platform SaaS insights
router.get("/insights", OwnerController.getPlatformInsights)

// Get single company details
router.get("/companies/:companyId", OwnerController.getCompanyDetails)

// Freeze a company
router.post("/companies/:companyId/freeze", (req, res) => {
  req.body.companyId = req.params.companyId
  OwnerController.freezeCompany(req as any, res)
})

// Unfreeze a company
router.post("/companies/:companyId/unfreeze", (req, res) => {
  req.body.companyId = req.params.companyId
  OwnerController.unfreezeCompany(req as any, res)
})

// Update company enabled pages
router.put("/companies/:companyId/pages", (req, res) => {
  req.body.companyId = req.params.companyId
  OwnerController.updateCompanyPages(req as any, res)
})

// User activity logs across all organizations
import { ActivityController } from "../controllers/activityController"
router.get("/user-activity", ActivityController.getOwnerActivitySummary)

export default router
