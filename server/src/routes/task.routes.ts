import { Router } from "express"
import { TaskController } from "../controllers/taskController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get tasks
router.get("/", TaskController.getTasks)

// Get task by ID
router.get("/:taskId", TaskController.getTaskById)

// Add note to task
router.post("/:taskId/notes", TaskController.addNote)

// Request postpone for task
router.post("/:taskId/postpone", TaskController.requestPostpone)

// Create task
router.post("/", TaskController.createTask)

// Update task
router.put("/:taskId", TaskController.updateTask)

// Complete task (employee)
router.post("/:taskId/complete", TaskController.completeTask)

// Delete task
router.delete("/:taskId", TaskController.deleteTask)

export default router
