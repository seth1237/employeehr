import { Router } from "express";
import StampController from "../controllers/stampController";
import { authMiddleware, orgMiddleware } from "../middleware/auth";
import { tenantIsolation } from "../middleware/tenantIsolation.middleware";

const router = Router();

// Apply auth and org middleware to all routes
router.use(authMiddleware, orgMiddleware, tenantIsolation);

// GET all stamps
router.get("/", StampController.getStamps);

// GET default stamp
router.get("/default", StampController.getDefaultStamp);

// GET stamp by ID
router.get("/:stampId", StampController.getStampById);

// GET stamp SVG
router.get("/:stampId/svg", StampController.getStampSVG);

// POST create stamp
router.post("/", StampController.createStamp);

// POST generate preview
router.post("/preview", StampController.generatePreview);

// PUT update stamp
router.put("/:stampId", StampController.updateStamp);

// DELETE stamp
router.delete("/:stampId", StampController.deleteStamp);

export default router;
