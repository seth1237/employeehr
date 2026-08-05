import { Router } from "express"
import { MeetingController } from "../controllers/meetingController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// Apply auth middleware for all routes in this router
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Create new meeting
router.post("/", MeetingController.createMeeting)

// Get all meetings
router.get("/", MeetingController.getMeetings)

// Get upcoming meetings
router.get("/upcoming", MeetingController.getUpcomingMeetings)

// Get user meeting stats (KPI tracking)
router.get("/stats/user", MeetingController.getUserMeetingStats)

// Get team meeting stats (Admin/Manager KPI tracking)
router.get("/stats/team", MeetingController.getTeamMeetingStats)

// Get meeting by ID
router.get("/:id", MeetingController.getMeetingById)

// Join meeting (track join time)
router.post("/:id/join", MeetingController.joinMeeting)

// Leave meeting (track leave time and duration)
router.post("/:id/leave", MeetingController.leaveMeeting)

// Update meeting status
router.put("/:id/status", MeetingController.updateMeetingStatus)

// Start meeting
router.post("/:id/start", MeetingController.startMeeting)

// End meeting and trigger AI processing
router.post("/:id/end", MeetingController.endMeeting)

// Process meeting with AI (transcription and analysis)
router.post("/:id/process-ai", MeetingController.processWithAI)

// Get meeting report (after AI processing)
router.get("/:id/report", MeetingController.getMeetingReport)

// Upload transcript
router.post("/:id/transcript", MeetingController.uploadTranscript)

// Delete meeting
router.delete("/:id", MeetingController.deleteMeeting)

export default router
