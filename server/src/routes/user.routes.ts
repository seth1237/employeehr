import { Router } from "express"
import { UserController } from "../controllers/userController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { uploadSignature } from "../middleware/upload.middleware"
import { validateRequest } from "../middleware/validation.middleware"
import { createEmployeeSchema, updateUserSchema } from "../types/validation.schemas"

const router = Router()

// All user routes require authentication
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get all users in organization
router.get("/", UserController.getAllUsers)

// Upload signature (self or admin/hr/super_admin for others)
router.post("/:userId/signature", uploadSignature.single("signature"), UserController.uploadSignature)

// Get user by ID
router.get("/:userId", UserController.getUserById)

// Update user (Admin or self)
router.put("/:userId", validateRequest(updateUserSchema), UserController.updateUser)
router.patch("/:userId", validateRequest(updateUserSchema), UserController.updateUser)

// Delete user (Admin/HR only)
router.delete("/:userId", roleMiddleware("company_admin", "hr"), UserController.deleteUser)

// Get team members for manager
router.get("/team/:managerId", UserController.getTeamMembers)

// Get colleagues (users in same organization)
router.get("/colleagues/list", UserController.getColleagues)

// Create employee (Admin only)
router.post("/", roleMiddleware("company_admin", "hr"), validateRequest(createEmployeeSchema), UserController.createEmployee)

export default router
