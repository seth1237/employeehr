import { Router } from "express";
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth";
import { tenantIsolation } from "../middleware/tenantIsolation.middleware";
import { uploadVisitPhoto } from "../middleware/upload.middleware";
import { EngineeringController } from "../controllers/engineeringController";

const router = Router();

function optionalJobCardPhoto(req: any, res: any, next: any) {
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("multipart/form-data")) {
    return uploadVisitPhoto.single("photo")(req, res, next);
  }
  next();
}

router.use(authMiddleware, orgMiddleware, tenantIsolation);

router.get("/dashboard", EngineeringController.dashboard);
router.get("/work-orders", EngineeringController.listWorkOrders);
router.post("/work-orders", EngineeringController.createWorkOrder);
router.get("/work-orders/:id", EngineeringController.getWorkOrder);
router.patch("/work-orders/:id", EngineeringController.updateWorkOrder);
router.post("/work-orders/:id/start", EngineeringController.startWorkOrder);
router.post(
  "/work-orders/:id/complete",
  optionalJobCardPhoto,
  EngineeringController.completeWorkOrder,
);

router.get("/requests", EngineeringController.listRequests);
router.post("/requests/:id/convert-to-wo", EngineeringController.convertRequestToWorkOrder);

router.get("/assets/:id/history", EngineeringController.assetHistory);

router.get("/maintenance-plans", EngineeringController.listPlans);
router.post("/maintenance-plans", EngineeringController.createPlan);
router.patch("/maintenance-plans/:id", EngineeringController.updatePlan);

router.get("/calibration", EngineeringController.listCalibration);
router.post("/calibration", EngineeringController.createCalibration);

router.get("/contracts", EngineeringController.listContracts);
router.post("/contracts", EngineeringController.createContract);

router.get(
  "/reports",
  roleMiddleware("company_admin", "super_admin", "hr", "manager"),
  EngineeringController.adminReport,
);
router.get(
  "/reports/export",
  roleMiddleware("company_admin", "super_admin", "hr", "manager"),
  EngineeringController.exportReport,
);
router.get("/expenses", EngineeringController.myExpenseClaims);

export default router;
