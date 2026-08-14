import { Router } from "express"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { CrmController } from "../controllers/crmController"

const router = Router()

// All CRM routes are protected and tenant isolated
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Customers
router.get("/customers", CrmController.getCustomers)
router.post("/customers", CrmController.createCustomer)

// Conversations / Telesales Rooms
router.get("/conversations", CrmController.getConversations)
router.post("/conversations", CrmController.createConversation)
router.get("/call-purposes", CrmController.getCallPurposes)
router.post("/call-purposes", CrmController.addCallPurpose)

// Telesales Activity (performance + planner)
router.get("/telesales/activity", CrmController.getTelesalesActivity)
router.post("/telesales/lead-status", CrmController.setTelesalesLeadStatus)
router.get("/telesales/client-history", CrmController.getClientTelesalesHistory)

// Leads
router.get("/leads", CrmController.getLeads)
router.post("/leads", CrmController.createLead)
router.patch("/leads/:id/status", CrmController.updateLeadStatus)

// Call Logs
router.get("/call-logs", CrmController.getCallLogs)
router.post("/call-logs", CrmController.createCallLog)

// Tickets
router.get("/tickets", CrmController.getTickets)
router.post("/tickets", CrmController.createTicket)
router.put("/tickets/:id", CrmController.updateTicket)
router.patch("/tickets/:id", CrmController.updateTicket)
router.post("/tickets/:id/resolve", CrmController.resolveTicket)

export default router
