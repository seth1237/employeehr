import { Router } from "express"
import { ProjectController } from "../controllers/projectController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Stats (must be before /:projectId to avoid route collision)
router.get("/stats", ProjectController.getProjectStats)

// List all projects
router.get("/", ProjectController.getProjects)

// Get single project
router.get("/:projectId", ProjectController.getProjectById)

// Create project
router.post("/", ProjectController.createProject)

// Update project
router.put("/:projectId", ProjectController.updateProject)

// Delete project
router.delete("/:projectId", ProjectController.deleteProject)

// Members
router.post("/:projectId/members", ProjectController.addMember)
router.delete("/:projectId/members/:userId", ProjectController.removeMember)

// Tasks scoped to a project
router.get("/:projectId/tasks", ProjectController.getProjectTasks)
router.post("/:projectId/tasks", ProjectController.createProjectTask)

// Time logs
router.post("/:projectId/time-logs", ProjectController.addTimeLog)
router.get("/:projectId/time-logs", ProjectController.getTimeLogs)

// Notes
router.post("/:projectId/notes", ProjectController.addNote)

export default router
