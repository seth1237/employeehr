import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { CreditNoteController } from "../controllers/creditNoteController"

const router = Router()

// List invoices available for credit note creation
router.get("/invoices-for-credit-note", authMiddleware, CreditNoteController.getInvoicesForCreditNote)

// Create credit note
router.post("/", authMiddleware, CreditNoteController.createCreditNote)

// Get all credit notes
router.get("/", authMiddleware, CreditNoteController.getAllCreditNotes)

// Get credit note reasons
router.get("/reasons", authMiddleware, CreditNoteController.getCreditNoteReasons)

// Get specific credit note
router.get("/:id", authMiddleware, CreditNoteController.getCreditNote)

// Update credit note (draft only)
router.put("/:id", authMiddleware, CreditNoteController.updateCreditNote)

// Issue credit note (draft -> issued)
router.post("/:id/issue", authMiddleware, CreditNoteController.issueCreditNote)

// Generate PDF for credit note
router.get("/:id/pdf", authMiddleware, CreditNoteController.generateCreditNotePdf)

// Delete credit note (draft only)
router.delete("/:id", authMiddleware, CreditNoteController.deleteCreditNote)

export default router
