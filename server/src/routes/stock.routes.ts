import { Router } from "express";
import { StockController } from "../controllers/stockController";
import { QuotationController } from "../controllers/stock/quotationController";
import { authMiddleware, orgMiddleware } from "../middleware/auth";
import { tenantIsolation } from "../middleware/tenantIsolation.middleware";
import {
  uploadApplicationFiles,
  uploadProductImage,
  uploadLogo,
} from "../middleware/upload.middleware";
import WarehouseController from "../controllers/warehouseController";
import { InstalledMachineController } from "../controllers/installedMachineController";
import { MachineServiceController } from "../controllers/machineServiceController";
import { TenderController } from "../controllers/tenderController";
import { ClientCrmController } from "../controllers/clientCrmController";

const router = Router();

router.get("/public/products", StockController.publicGetProducts);
router.post("/public/quote-requests", StockController.createWebsiteQuotationRequest);
router.get(
  "/public/quotations/:quotationId/pdf",
  StockController.downloadPublicQuotationPdf,
);
router.get(
  "/public/invoices/:invoiceId/pdf",
  StockController.downloadPublicInvoicePdf,
);
router.post(
  "/public/quotations/:quotationId/request-invoice",
  StockController.requestWebsiteInvoice,
);

router.use(authMiddleware, orgMiddleware, tenantIsolation);

router.post("/categories", StockController.createCategory);
router.get("/categories", StockController.getCategories);
router.get("/categories/:id", StockController.getCategoryById);
router.get("/categories/:id/sales", StockController.getCategorySales);
router.get("/categories/sales", StockController.getAllCategorySales);
router.put("/categories/:id", StockController.updateCategory);
router.delete("/categories/:id", StockController.deleteCategory);

// Quotations
router.post("/quotations", QuotationController.createQuotation);
router.get("/quotations", QuotationController.getQuotations);
router.get("/quotations/:quotationId", QuotationController.getQuotationById);
router.post("/quotations/:quotationId/email", StockController.emailQuotationDocument);
router.put("/quotations/:quotationId", QuotationController.updateQuotation);
router.post(
  "/quotations/:quotationId/approve",
  QuotationController.approveQuotation,
);
router.post("/quotations/:quotationId/reject", QuotationController.rejectQuotation);
router.post(
  "/quotations/:quotationId/convert",
  StockController.convertQuotationToInvoice,
);
router.post(
  "/quotations/:quotationId/followups",
  QuotationController.addQuotationFollowUp,
);
router.get(
  "/quotations/:quotationId/followups",
  QuotationController.getQuotationFollowUps,
);

// Tenders
router.post("/tenders", TenderController.createTender);
router.get("/tenders", TenderController.getTenders);
router.put("/tenders/:tenderId", TenderController.updateTender);
router.post("/tenders/:tenderId/approve", TenderController.approveTender);
router.post("/tenders/:tenderId/reject", TenderController.rejectTender);
router.post("/tenders/:tenderId/convert", TenderController.convertTenderToInvoice);

router.get("/clients/saved", StockController.getSavedClients);
router.get("/clients/contact-roles", ClientCrmController.listContactRoles);
router.post("/clients/contact-roles/rename", ClientCrmController.renameContactRole);
router.put("/clients/contacts", ClientCrmController.upsertClientContacts);
router.put("/clients/profile", ClientCrmController.updateSavedClient);
router.delete("/clients/profile", ClientCrmController.deleteSavedClient);
router.post("/clients/purge-all", ClientCrmController.deleteAllSavedClients);
router.get("/clients/groups", ClientCrmController.listGroups);
router.post("/clients/groups", ClientCrmController.createGroup);
router.put("/clients/groups/:groupId", ClientCrmController.updateGroup);
router.post("/clients/groups/merge", ClientCrmController.mergeGroups);
router.post(
  "/clients/groups/:groupId/members",
  ClientCrmController.addMembersToGroup,
);
router.post(
  "/clients/groups/:groupId/remove-member",
  ClientCrmController.removeMemberFromGroup,
);
router.delete("/clients/groups/:groupId", ClientCrmController.deleteGroup);

router.get("/clients", StockController.getClients);
router.post("/accounts/clients", StockController.createOrUpdateClient);
router.post(
  "/clients/bulk",
  uploadApplicationFiles.single("file"),
  StockController.bulkUploadClients,
);
router.get("/bulk-sms/audience", StockController.getBulkSmsAudience);
router.get("/bulk-sms/campaigns", StockController.getBulkSmsCampaigns);
router.post("/bulk-sms/campaigns", StockController.sendBulkSmsCampaign);

router.get("/global-search", StockController.globalSearch);

router.get("/invoices", StockController.getInvoices);
router.post("/invoices/create", StockController.createInvoiceFromItems);
router.get(
  "/invoices/:invoiceId/lifecycle",
  StockController.getInvoiceLifecycle,
);
router.get("/invoices/:invoiceId", StockController.getInvoiceById);
router.post("/invoices/:invoiceId/email", StockController.emailInvoiceDocument);
router.get("/accounts/posts", StockController.getAccountsPosts);
router.get("/accounts/clients", StockController.getAccountsClients);
router.put(
  "/accounts/posts/:invoiceId/client",
  StockController.upsertInvoiceClientProfile,
);
router.post(
  "/accounts/posts/:invoiceId/post-etims",
  StockController.postInvoiceToEtims,
);
router.get("/accounts/payments", StockController.getAccountsPayments);
router.post("/accounts/payments/:invoiceId", StockController.addInvoicePayment);
router.get("/accounts/debts", StockController.getDebtManagement);
router.get("/accounts/debts/aging", StockController.getAgingDebtReport);
router.get("/accounts/expenses", StockController.getExpenses);
router.post("/accounts/expenses/initiate", StockController.initiateExpense);
router.get("/accounts/repeat-bills", StockController.getRepeatBills);
router.post("/accounts/repeat-bills", StockController.createRepeatBill);
router.post(
  "/accounts/repeat-bills/:repeatBillId/run",
  StockController.runRepeatBill,
);
router.post(
  "/invoices/:invoiceId/dispatch/assign",
  StockController.assignInvoiceToDispatch,
);
router.put(
  "/invoices/:invoiceId/dispatch/packing",
  StockController.updateDispatchPacking,
);
router.post(
  "/invoices/:invoiceId/dispatch/dispatch",
  StockController.markInvoiceDispatched,
);
router.get(
  "/invoices/:invoiceId/dispatch/notifications",
  StockController.getDispatchNotifications,
);
router.post(
  "/invoices/:invoiceId/dispatch/notify-client",
  StockController.sendDispatchClientNotification,
);
router.post(
  "/invoices/:invoiceId/dispatch/inquiry",
  StockController.addDispatchInquiry,
);
router.post(
  "/invoices/:invoiceId/dispatch/delivery",
  StockController.confirmInvoiceDelivery,
);
router.post(
  "/dispatch/notifications/:notificationId/retry",
  StockController.retryDispatchNotification,
);

router.get("/dispatch/my", StockController.getMyDispatchInvoices);
router.get("/dispatch/analytics", StockController.getDispatchAnalytics);
router.get(
  "/analytics/profit-margins",
  StockController.getProfitMarginAnalytics,
);
router.get(
  "/analytics/movement-forecast",
  StockController.getProductMovementForecast,
);
router.get("/analytics/valuation", StockController.getInventoryValuationReport);
router.get(
  "/analytics/financial-breakdown",
  StockController.getFinancialBreakdown,
);

router.get("/couriers", StockController.getCouriers);
router.post("/couriers", StockController.createCourier);

router.post(
  "/products",
  uploadProductImage.single("image"),
  StockController.createProduct,
);
router.get("/products", StockController.getProducts);
router.put(
  "/products/:id",
  uploadProductImage.single("image"),
  StockController.updateProduct,
);
router.delete("/products/:id", StockController.deleteProduct);
router.post(
  "/products/bulk",
  uploadApplicationFiles.single("file"),
  StockController.bulkUploadProducts,
);

// Warehouse management (grid-based)
router.post("/warehouses", WarehouseController.createWarehouse);
router.get("/warehouses", WarehouseController.getWarehouses);
router.put("/warehouses/:warehouseId", WarehouseController.updateWarehouse);
router.get(
  "/warehouses/:warehouseId/locations",
  WarehouseController.getLocations,
);
// Upload warehouse background image
router.post(
  "/warehouses/:warehouseId/logo",
  uploadLogo.single("file"),
  async (req, res) => {
    try {
      const warehouseId = req.params.warehouseId;
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      const path = `/uploads/logos/${req.file.filename}`;
      const updated = await (
        await import("../models/Warehouse")
      ).Warehouse.findByIdAndUpdate(
        warehouseId,
        { backgroundImage: path },
        { new: true },
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to upload logo",
      });
    }
  },
);

// Product location endpoints
router.post(
  "/products/:productId/locations",
  WarehouseController.assignProductLocation,
);
router.get(
  "/products/:productId/locations",
  WarehouseController.getProductLocations,
);

router.post("/add", StockController.addStock);
router.get("/entries", StockController.getStockEntries);
router.post("/check-expiry", StockController.checkExpiringProducts);

router.post("/stock-checks", StockController.createStockCheck);
router.get("/stock-checks", StockController.getStockChecks);
router.get(
  "/stock-checks/:stockCheckId/audit-trail",
  StockController.getStockCheckAuditTrail,
);
router.get("/stock-checks/:stockCheckId", StockController.getStockCheckById);
router.put("/stock-checks/:stockCheckId", StockController.updateStockCheck);
router.post("/stock-checks/:stockCheckId/close", StockController.closeStockCheck);

router.get("/warehouse-locations", StockController.getWarehouseLocations);
router.post("/warehouse-locations", StockController.createWarehouseLocation);
router.put(
  "/warehouse-locations/:locationId",
  StockController.updateWarehouseLocation,
);
router.delete(
  "/warehouse-locations/:locationId",
  StockController.deleteWarehouseLocation,
);
router.get(
  "/warehouse-locations/:locationId/inventory",
  StockController.getWarehouseLocationInventory,
);

router.get("/product-locations", StockController.getProductLocations);
router.post("/product-locations", StockController.assignProductLocation);

router.post("/sales", StockController.createSale);
router.get("/sales", StockController.getSales);

// Services Management
router.post("/services", StockController.createService);
router.get("/services", StockController.getServices);
router.get("/services/:serviceId", StockController.getServiceById);
router.put("/services/:serviceId", StockController.updateService);
router.delete("/services/:serviceId", StockController.deleteService);

// Manufacturers / Importation
router.post("/manufacturers", StockController.createManufacturer);
router.get("/manufacturers", StockController.getManufacturers);

// Service Jobs Management
router.post("/services/jobs", StockController.createServiceJob);
router.get("/services/jobs", StockController.getServiceJobs);
router.get(
  "/services/jobs/status/:status",
  StockController.getServiceJobsByStatus,
);
router.put(
  "/services/jobs/:jobId/status",
  StockController.updateServiceJobStatus,
);
router.get("/services/jobs/:jobId", StockController.getServiceJobById);
router.delete("/services/jobs/:jobId", StockController.deleteServiceJob);

// Service Analytics
router.get(
  "/services/analytics/summary",
  StockController.getServicesAnalyticsSummary,
);
router.get(
  "/services/analytics/by-category",
  StockController.getServicesAnalyticsByCategory,
);

// Installed machines management
router.get(
  "/installed-machines",
  InstalledMachineController.listInstalledMachines,
);
router.post(
  "/installed-machines",
  InstalledMachineController.createInstalledMachine,
);
router.post(
  "/installed-machines/bulk",
  uploadApplicationFiles.single("file"),
  InstalledMachineController.bulkUploadInstalledMachines,
);
router.patch(
  "/installed-machines/:id",
  InstalledMachineController.updateInstalledMachine,
);
router.delete(
  "/installed-machines/:id",
  InstalledMachineController.deleteInstalledMachine,
);

// Candidates: products from converted & delivered invoices eligible to be marked as Installed
router.get(
  "/installed-candidates",
  InstalledMachineController.listInstallableCandidates,
);

// Machine services
router.get("/machine-services", MachineServiceController.listMachineServices);
router.get("/machine-services/:id", MachineServiceController.getMachineService);
router.post("/machine-services", MachineServiceController.createMachineService);
router.put("/machine-services/:id", MachineServiceController.updateMachineService);
router.delete("/machine-services/:id", MachineServiceController.deleteMachineService);
router.get(
  "/installed-machines/:id/services",
  MachineServiceController.listMachineServices,
);

export default router;
