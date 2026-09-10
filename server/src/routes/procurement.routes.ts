import { Router } from "express"
import { authMiddleware, roleMiddleware } from "../middleware/auth"
import { ProcurementController } from "../controllers/ProcurementController"

const router = Router()

router.use(authMiddleware)

// Suppliers
router.get("/suppliers", ProcurementController.getSuppliers)
router.post("/suppliers", roleMiddleware("company_admin", "admin", "procurement", "finance"), ProcurementController.createSupplier)

// Purchase Requests
router.get("/requests", ProcurementController.getPurchaseRequests)
router.post("/requests", ProcurementController.createPurchaseRequest)
router.patch("/requests/:id/status", roleMiddleware("company_admin", "admin", "procurement"), ProcurementController.updatePurchaseRequestStatus)

// Purchase Orders
router.get("/orders", ProcurementController.getPurchaseOrders)
router.post("/orders", roleMiddleware("company_admin", "admin", "procurement"), ProcurementController.createPurchaseOrder)
router.put("/orders/:id", roleMiddleware("company_admin", "admin", "procurement"), ProcurementController.updatePurchaseOrder)
router.patch("/orders/:id/status", roleMiddleware("company_admin", "admin", "procurement"), ProcurementController.updatePurchaseOrderStatus)

// Goods Receipt Notes (GRN)
router.get("/grns", ProcurementController.getGRNs)
router.post("/grns", roleMiddleware("company_admin", "admin", "procurement", "inventory"), ProcurementController.createGRN)
router.post("/grns/:id/confirm", roleMiddleware("company_admin", "admin", "inventory"), ProcurementController.confirmGRN)

// Supplier Invoices
router.get("/invoices", ProcurementController.getSupplierInvoices)
router.post("/invoices", roleMiddleware("company_admin", "admin", "finance"), ProcurementController.createSupplierInvoice)
router.post("/invoices/:id/post", roleMiddleware("company_admin", "admin", "finance"), ProcurementController.postInvoiceToGL)

router.post("/invoices/:id/pay", roleMiddleware("company_admin", "admin", "finance"), ProcurementController.paySupplierInvoice)

export default router
