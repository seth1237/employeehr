import { Router } from "express"
import { DebitNoteController } from "../controllers/debitNoteController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

router.get(
  "/invoices-for-debit-note",
  authMiddleware,
  DebitNoteController.getInvoicesForDebitNote,
)
router.get("/reasons", authMiddleware, DebitNoteController.getReasons)
router.post("/", authMiddleware, DebitNoteController.createDebitNote)
router.get("/", authMiddleware, DebitNoteController.getAllDebitNotes)
router.get("/:id", authMiddleware, DebitNoteController.getDebitNote)
router.post("/:id/issue", authMiddleware, DebitNoteController.issueDebitNote)
router.get("/:id/pdf", authMiddleware, DebitNoteController.generateDebitNotePdf)
router.delete("/:id", authMiddleware, DebitNoteController.deleteDebitNote)

export default router
