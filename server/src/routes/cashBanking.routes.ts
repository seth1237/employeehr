import { Router } from "express"
import { CashBankingController } from "../controllers/cashBankingController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

router.get("/overview", authMiddleware, CashBankingController.getOverview)
router.get("/accounts", authMiddleware, CashBankingController.listAccounts)
router.post("/accounts", authMiddleware, CashBankingController.createAccount)
router.patch("/accounts/:id", authMiddleware, CashBankingController.updateAccount)

router.get("/transactions", authMiddleware, CashBankingController.listTransactions)
router.post("/transactions", authMiddleware, CashBankingController.createManualEntry)

router.get("/transfers", authMiddleware, CashBankingController.listTransfers)
router.post("/transfers", authMiddleware, CashBankingController.createTransfer)

router.post("/reconcile", authMiddleware, CashBankingController.reconcileTransactions)
router.post("/sync", authMiddleware, CashBankingController.syncFromOperations)

export default router
