import { Router } from "express"
import { ComplaintController } from "../controllers/complaintController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get all complaints with filters
router.get("/", ComplaintController.getComplaints)

// Get complaint stats
router.get("/stats", ComplaintController.getComplaintStats)

// Create new complaint
router.post("/", ComplaintController.createComplaint)

// Get single complaint
router.get("/:complaintId", ComplaintController.getComplaint)

// Update complaint
router.put("/:complaintId", ComplaintController.updateComplaint)

// Assign complaint to employee
router.patch("/:complaintId/assign", ComplaintController.assignComplaint)

// Add internal note
router.post("/:complaintId/notes", ComplaintController.addInternalNote)

// Add communication/response
router.post("/:complaintId/communicate", ComplaintController.addCommunication)

// Resolve complaint
router.patch("/:complaintId/resolve", ComplaintController.resolveComplaint)

// Close complaint
router.patch("/:complaintId/close", ComplaintController.closeComplaint)

export default router
