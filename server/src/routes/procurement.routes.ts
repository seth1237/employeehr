import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { SupplierController } from "../controllers/procurement/SupplierController"
import { PurchaseRequestController } from "../controllers/procurement/PurchaseRequestController"
import { PurchaseOrderController } from "../controllers/procurement/PurchaseOrderController"
import { RfqController } from "../controllers/procurement/RfqController"
import { GrnController } from "../controllers/procurement/GrnController"
import { PurchaseReturnController } from "../controllers/procurement/PurchaseReturnController"
import { SupplierInvoiceController } from "../controllers/procurement/SupplierInvoiceController"
import { PaymentController } from "../controllers/procurement/PaymentController"
import { ContractController } from "../controllers/procurement/ContractController"
import { BudgetController } from "../controllers/procurement/BudgetController"

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// ================= SUPPLIERS =================
router.get("/suppliers", SupplierController.getSuppliers)
router.get("/suppliers/:id", SupplierController.getSupplierById)
router.post("/suppliers", SupplierController.createSupplier)
router.put("/suppliers/:id", SupplierController.updateSupplier)
router.patch("/suppliers/:id/performance", SupplierController.updatePerformance)

// ================= BUDGETS =================
router.get("/budgets", BudgetController.getBudgets)
router.get("/budgets/:id", BudgetController.getBudgetById)
router.post("/budgets", BudgetController.createBudget)
router.put("/budgets/:id", BudgetController.updateBudget)

// ================= PURCHASE REQUESTS (PR) =================
router.get("/pr", PurchaseRequestController.getRequests)
router.get("/pr/:id", PurchaseRequestController.getRequestById)
router.post("/pr", PurchaseRequestController.createRequest)
router.post("/pr/:id/submit", PurchaseRequestController.submitForApproval)
router.post("/pr/:id/approve", PurchaseRequestController.processApproval)

// ================= RFQ & QUOTATIONS =================
router.get("/rfq", RfqController.getRfqs)
router.get("/rfq/:id", RfqController.getRfqById)
router.post("/rfq", RfqController.createRfq)
router.post("/rfq/:id/publish", RfqController.publishRfq)
// Quotations for an RFQ
router.get("/rfq/:id/quotations", RfqController.getQuotationsForRfq)
router.post("/rfq/:id/quotations", RfqController.submitQuotation)
router.post("/rfq/evaluate", RfqController.evaluateQuotations)
router.post("/rfq/:id/award", RfqController.awardQuotation)

// ================= PURCHASE ORDERS (PO) =================
router.get("/po", PurchaseOrderController.getOrders)
router.get("/po/:id", PurchaseOrderController.getOrderById)
router.post("/po", PurchaseOrderController.createOrder)
router.put("/po/:id", PurchaseOrderController.updateOrder)
router.post("/po/:id/approve", PurchaseOrderController.approveOrder)
router.post("/po/:id/send", PurchaseOrderController.sendOrder)

// ================= GOODS RECEIPT NOTES (GRN) =================
router.get("/grn", GrnController.getGrns)
router.get("/grn/:id", GrnController.getGrnById)
router.post("/grn", GrnController.createGrn)
router.post("/grn/:id/submit-inspection", GrnController.submitForInspection)
router.post("/grn/:id/inspect", GrnController.processInspection)

// ================= PURCHASE RETURNS =================
router.get("/returns", PurchaseReturnController.getReturns)
router.get("/returns/:id", PurchaseReturnController.getReturnById)
router.post("/returns", PurchaseReturnController.createReturn)
router.post("/returns/:id/approve", PurchaseReturnController.approveReturn)
router.post("/returns/:id/dispatch", PurchaseReturnController.dispatchToSupplier)
router.post("/returns/:id/resolve", PurchaseReturnController.resolveReturn)

// ================= SUPPLIER INVOICES (AP) =================
router.get("/invoices", SupplierInvoiceController.getInvoices)
router.get("/invoices/:id", SupplierInvoiceController.getInvoiceById)
router.post("/invoices", SupplierInvoiceController.createInvoice)
router.post("/invoices/:id/match", SupplierInvoiceController.performThreeWayMatch)
router.post("/invoices/:id/approve", SupplierInvoiceController.approveForPayment)

// ================= PAYMENTS =================
router.get("/payments", PaymentController.getPayments)
router.get("/payments/:id", PaymentController.getPaymentById)
router.post("/payments", PaymentController.createPayment)
router.post("/payments/:id/process", PaymentController.processPayment)

// ================= CONTRACTS =================
router.get("/contracts", ContractController.getContracts)
router.get("/contracts/:id", ContractController.getContractById)
router.post("/contracts", ContractController.createContract)
router.put("/contracts/:id", ContractController.updateContract)

export default router
