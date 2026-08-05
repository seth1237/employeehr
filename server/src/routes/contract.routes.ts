import { Router } from "express"
import { ContractController } from "../controllers/contractController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.get("/", ContractController.getContracts)
router.get("/expiring", ContractController.getExpiringContracts)
router.post("/", ContractController.createContract)
router.patch("/:contractId/acknowledge", ContractController.acknowledgeAlert)
router.patch("/:contractId/renewal", ContractController.updateRenewalStatus)
router.put("/:contractId/renew", ContractController.updateRenewalStatus)

export default router
