import "dotenv/config" // Must be the first import
import express from "express"
import { createServer } from "http"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import path from "path"
import { fileURLToPath } from "url"
import { connectDB } from "./config/database"
import { errorHandler } from "./middleware/errorHandler"
import { sanitizeInput } from "./middleware/sanitization.middleware"
import { apiLimiter } from "./middleware/rateLimit.middleware"
import { WebRTCSignalingService } from "./services/webrtcSignaling"
import { runMigrations } from "./scripts/runMigrations.mjs"

// Routes
import authRoutes from "./routes/auth.routes"
import activityRoutes from "./routes/activity.routes"
import userRoutes from "./routes/user.routes"
import performanceRoutes from "./routes/performance.routes"
import kpiRoutes from "./routes/kpi.routes"
import pdpRoutes from "./routes/pdp.routes"
import feedbackRoutes from "./routes/feedback.routes"
import attendanceRoutes from "./routes/attendance.routes"
import awardRoutes from "./routes/award.routes"
import taskRoutes from "./routes/task.routes"
import messageRoutes from "./routes/message.routes"
import bookingRoutes from "./routes/booking.routes"
import suggestionRoutes from "./routes/suggestion.routes"
import badgeRoutes from "./routes/badge.routes"
import pollRoutes from "./routes/poll.routes"
import contractRoutes from "./routes/contract.routes"
import alertRoutes from "./routes/alert.routes"
import jobRoutes from "./routes/job.routes"
import applicationFormRoutes from "./routes/applicationForm.routes"
import jobApplicationRoutes from "./routes/jobApplication.routes"
import jobAnalyticsRoutes from "./routes/jobAnalytics.routes"
import communicationRoutes from "./routes/communication.routes"
import invitationRoutes from "./routes/invitation.routes"
import reportRoutes from "./routes/report.routes"
import companyRoutes from "./routes/company.routes"
import holidayRoutes from "./routes/holiday.routes"
import leaveRoutes from "./routes/leave.routes"
import payrollRoutes from "./routes/payroll.routes"
import meetingRoutes from "./routes/meeting.routes"
import setupRoutes from "./routes/setup.routes"
import anonymousFeedbackRoutes from "./routes/anonymousFeedback.routes"
import feedbackSurveyRoutes from "./routes/feedbackSurvey.routes"
import stockRoutes from "./routes/stock.routes"
import stampRoutes from "./routes/stamp.routes"
import smsWebhookRoutes from "./routes/smsWebhook.routes"
import mpesaWebhookRoutes from "./routes/mpesaWebhook.routes"
import ownerRoutes from "./routes/owner.routes"
import complaintRoutes from "./routes/complaint.routes"
import branchRoutes from "./routes/branch.routes"
import aiAssistantRoutes from "./routes/aiAssistant.routes"
import vehicleRoutes from "./routes/vehicle.routes"
import creditNoteRoutes from "./routes/creditNote.routes"
import resourcesRoutes from "./routes/resources.routes"
import crmRoutes from "./routes/crm.routes"
import etimsRoutes from "./routes/etims.routes"
import { JobController } from "./controllers/jobController"
import { ApplicationFormController } from "./controllers/applicationFormController"
import { MeetingController } from "./controllers/meetingController"
import { StockController } from "./controllers/stockController"
import dashboardRoutes from "./routes/dashboard.routes"

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 5010

app.set("trust proxy", 1)

// Initialize WebRTC signaling service
new WebRTCSignalingService(server)

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
) // Security headers
app.use(morgan("combined")) // Request logging

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}, express.static(path.join(__dirname, '../uploads')))

// Core middleware
// Allow local dev and production frontend origins
app.use(
  cors({
    origin: (origin, callback) => {
      const allowAllOrigins = String(process.env.ALLOW_ALL_ORIGINS || "true").toLowerCase() === "true"
      if (allowAllOrigins) return callback(null, true)

      const allowed = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://employeehr.vercel.app",
        "https://hpapi.codewithseth.co.ke",
        "https://hrapi.codewithseth.co.ke",
        "https://backend.codewithseth.co.ke",
        "https://hr.codewithseth.co.ke",
        "https://elevatehub.co.ke",
        "https://www.elevatehub.co.ke",
        process.env.FRONTEND_URL,
      ].filter(Boolean)

      // Allow non-browser requests (no origin)
      if (!origin) return callback(null, true)

      if (allowed.some((o) => origin === o)) {
        return callback(null, true)
      }
      return callback(new Error("Not allowed by CORS"))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

app.use(sanitizeInput)
app.use(apiLimiter)

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    version: "1.1.0",
  })
})

app.get("/", (_req, res) => {
  res.send("HR API is running")
})

// Public endpoints (no auth) — mounted early
app.get("/api/jobs/public/:companyName/:positionIndex", JobController.getPublicJob)
app.get("/api/application-forms/job/:jobId", ApplicationFormController.getFormByJobId)
app.get("/api/meetings/by-meeting-id/:meetingId", MeetingController.getMeetingByMeetingIdPublic)
app.post("/api/meetings/by-meeting-id/:meetingId/join", MeetingController.joinMeetingByMeetingIdPublic)
app.post("/api/quotes", StockController.createWebsiteQuotationRequest)
app.use("/api/sms", smsWebhookRoutes)
app.use("/api/mpesa", mpesaWebhookRoutes)

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/activity", activityRoutes)
app.use("/api/users", userRoutes)
app.use("/api/branches", branchRoutes)
app.use("/api/performance", performanceRoutes)
app.use("/api/kpis", kpiRoutes)
app.use("/api/pdps", pdpRoutes)
app.use("/api/feedback", feedbackRoutes)
app.use("/api/attendance", attendanceRoutes)
app.use("/api/awards", awardRoutes)
app.use("/api/tasks", taskRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/suggestions", suggestionRoutes)
app.use("/api/badges", badgeRoutes)
app.use("/api/polls", pollRoutes)
app.use("/api/contracts", contractRoutes)
app.use("/api/alerts", alertRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/application-forms", applicationFormRoutes)
app.use("/api/job-applications", jobApplicationRoutes)
app.use("/api/job-analytics", jobAnalyticsRoutes)
app.use("/api/communications", communicationRoutes)
app.use("/api/invitations", invitationRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/company", companyRoutes)
app.use("/api/holidays", holidayRoutes)
app.use("/api/leave", leaveRoutes)
app.use("/api/payroll", payrollRoutes)
app.use("/api/meetings", meetingRoutes)
app.use("/api/setup", setupRoutes)
app.use("/api/feedback-360", anonymousFeedbackRoutes)
app.use("/api/feedback-surveys", feedbackSurveyRoutes)
app.get("/api/stock/public/products", StockController.publicGetProducts)
app.post("/api/stock/public/quote-requests", StockController.createWebsiteQuotationRequest)
app.get("/api/stock/public/quotations/:quotationId/pdf", StockController.downloadPublicQuotationPdf)
app.get("/api/stock/public/quotations/:quotationId/state", StockController.getPublicQuotationState)
app.get("/api/stock/public/invoices/:invoiceId/pdf", StockController.downloadPublicInvoicePdf)
app.post("/api/stock/public/quotations/:quotationId/request-invoice", StockController.requestWebsiteInvoice)
app.use("/api/stock", stockRoutes)
app.use("/api/stock/credit-notes", creditNoteRoutes)
app.use("/api/stamps", stampRoutes)
app.use("/api/resources", resourcesRoutes)
app.use("/api/crm", crmRoutes)
app.use("/api/etims", etimsRoutes)
app.use("/api/complaints", complaintRoutes)
app.use("/api/vehicles", vehicleRoutes)
app.use("/api", bookingRoutes)
app.use("/api/owner", ownerRoutes)
app.use("/api/ai-assistant", aiAssistantRoutes)
app.use("/api/dashboard", dashboardRoutes)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

// Error handler (must be last)
app.use(errorHandler)

// Start server with migrations
async function startServer() {
  try {
    // Connect to MongoDB first
    console.log("🔌 Connecting to MongoDB...")
    await connectDB()
    console.log("✅ MongoDB connection established")

    // Always run Prisma migrations before starting sync scheduler
    // The sync scheduler depends on tables existing
    if (!process.env.MYSQL_DATABASE_URL?.trim()) {
      console.warn("⚠️ MYSQL_DATABASE_URL is not set — Mongo→MySQL sync is disabled")
    } else {
      console.log("🔄 Running database migrations...")
      const migrationsOk = await runMigrations()
      if (!migrationsOk) {
        throw new Error("MySQL migrations failed — check MYSQL_DATABASE_URL and that MySQL is running")
      }
      console.log("✅ Database migrations completed")
    }

    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`)
      console.log(`🔌 WebRTC signaling service initialized`)
      console.log(`🗄️  MongoDB: Connected`)
      console.log(`🗄️  MySQL: Secondary storage ready`)

      const expiryCheckIntervalMs = Number(process.env.STOCK_EXPIRY_CHECK_INTERVAL_MS || 6 * 60 * 60 * 1000)

      setInterval(async () => {
        try {
          const result = await StockController.runExpiryReminderCheck()
          if (result.remindersSent > 0) {
            console.log(`[stock-expiry] checked=${result.checked}, remindersSent=${result.remindersSent}`)
          }
        } catch (error) {
          console.error("[stock-expiry] automated check failed:", error)
        }
      }, expiryCheckIntervalMs)

    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}

startServer()
