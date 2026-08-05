import express from "express"
import { authMiddleware } from "../middleware/auth"
import { BranchController } from "../controllers/branchController"

const router = express.Router()

// Require authentication for all branch routes
router.use(authMiddleware)

// Get all branches
router.get("/", (req, res) => {
  BranchController.getAllBranches(req as any, res)
})

// Get branch by ID
router.get("/:id", (req, res) => {
  BranchController.getBranchById(req as any, res)
})

// Create branch
router.post("/", (req, res) => {
  BranchController.createBranch(req as any, res)
})

// Update branch
router.put("/:id", (req, res) => {
  BranchController.updateBranch(req as any, res)
})

// Allocate branch to admin
router.post("/allocate", (req, res) => {
  BranchController.allocateBranchToAdmin(req as any, res)
})

// Remove manager from branch
router.post("/:id/remove-manager", (req, res) => {
  BranchController.removeBranchManager(req as any, res)
})

// Delete/Deactivate branch
router.delete("/:id", (req, res) => {
  BranchController.deleteBranch(req as any, res)
})

// Get branch analytics
router.get("/:branchId/analytics", (req, res) => {
  BranchController.getBranchAnalytics(req as any, res)
})

export default router
