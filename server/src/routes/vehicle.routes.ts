import { Router } from "express"
import { VehicleController } from "../controllers/vehicleController"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Public GPS device / manufacturer ingest (secured by FLEET_INGEST_TOKEN when set)
router.post("/ingest", VehicleController.ingestTelemetry)

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.get("/", VehicleController.getVehicles)
router.get("/stats", VehicleController.getFleetStats)
router.get("/alerts", VehicleController.getAlerts)
router.post(
  "/",
  roleMiddleware("company_admin", "admin", "hr"),
  VehicleController.createVehicle,
)
router.get("/:vehicleId", VehicleController.getVehicle)
router.put(
  "/:vehicleId",
  roleMiddleware("company_admin", "admin", "hr"),
  VehicleController.updateVehicle,
)
router.delete(
  "/:vehicleId",
  roleMiddleware("company_admin", "admin", "hr"),
  VehicleController.deleteVehicle,
)
router.post("/:vehicleId/location", VehicleController.updateLocation)
router.post("/alerts/:alertId/acknowledge", VehicleController.acknowledgeAlert)

export default router
