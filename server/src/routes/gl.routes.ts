import express from "express";
import { GLController } from "../controllers/GLController";
import { FinanceController } from "../controllers/FinanceController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.use(authMiddleware);

router.get("/accounts", GLController.getAccounts);
router.post("/accounts", GLController.createAccount);

router.get("/journals", GLController.getJournalEntries);
router.post("/journals", GLController.postJournalEntry);
router.post("/journals/:id/reverse", FinanceController.reverseJournal);

router.get("/trial-balance", GLController.getTrialBalance);
router.get("/profit-and-loss", GLController.getProfitAndLoss);
router.get("/balance-sheet", GLController.getBalanceSheet);
router.get("/ledger", GLController.getGeneralLedger);
router.get("/inquiry", FinanceController.accountInquiry);
router.get("/cash-flow", FinanceController.cashFlow);
router.get("/financial-pack", FinanceController.financialPack);
router.get("/account-reconciliation", FinanceController.accountReconciliation);

router.get("/currencies", FinanceController.listCurrencies);
router.post("/currencies", FinanceController.saveCurrency);
router.get("/periods", FinanceController.listPeriods);
router.post("/periods/status", FinanceController.setPeriodStatus);
router.get("/budgets", FinanceController.listBudgets);
router.post("/budgets", FinanceController.saveBudget);
router.get("/budgets/vs-actual", FinanceController.budgetVsActual);

router.get("/assets", FinanceController.listAssets);
router.post("/assets", FinanceController.saveAsset);
router.post("/assets/depreciate", FinanceController.runDepreciation);
router.post("/assets/:id/dispose", FinanceController.disposeAsset);
router.post("/assets/:id/transfer", FinanceController.transferAsset);

router.get("/withholding", FinanceController.listWithholding);
router.post("/withholding", FinanceController.saveWithholding);
router.get("/vat", FinanceController.vatReport);
router.get("/tax-reports", FinanceController.taxReports);
router.post("/payroll-journal", FinanceController.postPayrollJournal);

router.get("/cogs", FinanceController.cogsReport);
router.post("/stock-adjustments", FinanceController.stockAdjustment);
router.get("/inventory-reconciliation", FinanceController.inventoryReconciliation);

router.post("/bank-statements", FinanceController.importBankStatement);
router.get("/bank-statements", FinanceController.listStatements);
router.get("/audit-logs", FinanceController.listAuditLogs);

router.get("/payables/bills", FinanceController.listPayablesBills);
router.post("/payables/bills", FinanceController.savePayablesBill);
router.post("/payables/bills/:id/pay", FinanceController.payPayablesBill);
router.get("/payables/credit-notes", FinanceController.listPayablesCreditNotes);
router.post("/payables/credit-notes", FinanceController.savePayablesCreditNote);
router.get("/payables/creditors", FinanceController.payablesCreditors);
router.get("/payables/aging", FinanceController.payablesAging);
router.get("/payables/statement", FinanceController.payablesStatement);

export default router;
