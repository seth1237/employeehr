import express from "express"
import { authMiddleware } from "../middleware/auth"
import { BranchTransferController } from "../controllers/branchTransferController"

const router = express.Router()

router.use(authMiddleware)

router.get("/context", (req, res) => {
  BranchTransferController.context(req as any, res)
})
router.get("/catalog/products", (req, res) => {
  BranchTransferController.products(req as any, res)
})
router.get("/catalog/assets", (req, res) => {
  BranchTransferController.assets(req as any, res)
})
router.get("/catalog/employees", (req, res) => {
  BranchTransferController.employees(req as any, res)
})
router.get("/", (req, res) => {
  BranchTransferController.list(req as any, res)
})
router.post("/", (req, res) => {
  BranchTransferController.create(req as any, res)
})
router.get("/:id/pdf", (req, res) => {
  BranchTransferController.pdf(req as any, res)
})
router.get("/:id", (req, res) => {
  BranchTransferController.getById(req as any, res)
})
router.put("/:id", (req, res) => {
  BranchTransferController.update(req as any, res)
})
router.post("/:id/issue", (req, res) => {
  BranchTransferController.issue(req as any, res)
})
router.post("/:id/receive", (req, res) => {
  BranchTransferController.receive(req as any, res)
})
router.post("/:id/cancel", (req, res) => {
  BranchTransferController.cancel(req as any, res)
})

export default router
