import { Router } from "express"
import { ExhibitionController } from "../controllers/exhibitionController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// Exhibition management
router.post("/", ExhibitionController.createExhibition)
router.get("/", ExhibitionController.getExhibitions)
router.get("/:id", ExhibitionController.getExhibition)
router.put("/:id", ExhibitionController.updateExhibition)

// Leads
router.get("/leads/all", ExhibitionController.getAllLeads)
router.post("/:id/collect", ExhibitionController.collectLead)
router.post("/:id/import-leads", ExhibitionController.bulkImportLeads)
router.get("/:id/leads", ExhibitionController.getExhibitionLeads)
router.put("/:id/leads/:leadId", ExhibitionController.updateLead)
router.post("/:id/leads/delete", ExhibitionController.deleteLeads)

export default router
