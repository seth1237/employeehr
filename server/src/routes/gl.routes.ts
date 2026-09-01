import express from "express";
import { GLController } from "../controllers/GLController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.use(authMiddleware);

// Chart of Accounts
router.get("/accounts", GLController.getAccounts);
router.post("/accounts", GLController.createAccount);

// Journal Entries
router.get("/journals", GLController.getJournalEntries);
router.post("/journals", GLController.postJournalEntry);

// Reports / Ledger
router.get("/trial-balance", GLController.getTrialBalance);
router.get("/profit-and-loss", GLController.getProfitAndLoss);
router.get("/balance-sheet", GLController.getBalanceSheet);
router.get("/ledger", GLController.getGeneralLedger);

export default router;
