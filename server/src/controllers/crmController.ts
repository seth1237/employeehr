import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Customer } from "../models/Customer"
import { Lead } from "../models/Lead"
import { CallLog } from "../models/CallLog"
import { ClientConversation } from "../models/ClientConversation"
import { Ticket } from "../models/Ticket"
import { InstalledMachine } from "../models/InstalledMachine"
import { MachineService } from "../models/MachineService"
import { StockQuotation } from "../models/StockQuotation"
import { buildQuotationItems, generateDocumentNumber } from "./stock/stockShared"
import "../models/Ticket"

function normalizeDate(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? undefined : date
}

async function syncMachineNextServiceDate(orgId: string, machineId: string) {
  const openServices = await MachineService.find({
    org_id: orgId,
    machineId,
    $or: [{ completedDate: null }, { completedDate: { $exists: false } }],
  })
    .sort({ scheduledDate: 1, createdAt: 1 })
    .lean()

  const nextScheduled = openServices.find((service) => service.scheduledDate)
  await InstalledMachine.findOneAndUpdate(
    { _id: machineId, org_id: orgId },
    { $set: { nextServiceDate: nextScheduled?.scheduledDate || null } },
  )
}

export class CrmController {
  // === Customers ===
  static async getCustomers(req: AuthenticatedRequest, res: Response) {
    try {
      const customers = await Customer.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.status(200).json({ success: true, data: customers })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch customers", error })
    }
  }

  static async createCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const customer = new Customer({
        ...req.body,
        org_id: req.org_id,
        createdBy: req.user?.userId
      })
      await customer.save()
      return res.status(201).json({ success: true, data: customer })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to create customer", error })
    }
  }

  // === Client Conversations (Telesales Rooms) ===
  static async getConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const filter: any = { org_id: req.org_id }
      if (req.query.roomName) filter.roomName = req.query.roomName
      if (req.query.customer_id) filter.customer_id = req.query.customer_id
      if (req.query.clientName) filter.clientName = new RegExp(req.query.clientName as string, "i")
      
      const conversations = await ClientConversation.find(filter)
        .sort({ createdAt: -1 })
        .populate("customer_id", "name hospital")
        .populate("assignedTo", "firstName lastName email")
        .populate("createdBy", "firstName lastName")

      return res.status(200).json({ success: true, data: conversations })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch conversations", error })
    }
  }

  static async createConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const conversation = new ClientConversation({
        ...req.body,
        org_id: req.org_id,
        createdBy: req.user?.userId
      })
      await conversation.save()
      return res.status(201).json({ success: true, data: conversation })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to save conversation", error })
    }
  }

  // === Leads ===
  static async getLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const leads = await Lead.find({ org_id: req.org_id })
        .sort({ createdAt: -1 })
        .populate("customer_id", "name hospital")
        .populate("owner_id", "firstName lastName")

      return res.status(200).json({ success: true, data: leads })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch leads", error })
    }
  }

  static async createLead(req: AuthenticatedRequest, res: Response) {
    try {
      const lead = new Lead({
        ...req.body,
        org_id: req.org_id,
        owner_id: req.body.owner_id || req.user?.userId
      })
      await lead.save()
      return res.status(201).json({ success: true, data: lead })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to create lead", error })
    }
  }

  // === Call Logs ===
  static async getCallLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const logs = await CallLog.find({ org_id: req.org_id })
        .sort({ createdAt: -1 })
        .populate("customer_id", "name hospital")
        .populate("agent_id", "firstName lastName")

      return res.status(200).json({ success: true, data: logs })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch call logs", error })
    }
  }

  static async createCallLog(req: AuthenticatedRequest, res: Response) {
    try {
      const log = new CallLog({
        ...req.body,
        org_id: req.org_id,
        agent_id: req.body.agent_id || req.user?.userId
      })
      await log.save()
      return res.status(201).json({ success: true, data: log })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to create call log", error })
    }
  }

  // === Tickets ===
  static async getTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const filter: any = { org_id: req.org_id }
      if (req.query.machine_id) filter.machine_id = req.query.machine_id
      if (req.query.status) filter.status = req.query.status

      const tickets = await Ticket.find(filter)
        .sort({ createdAt: -1 })
        .populate("customer_id", "name hospital")
        .populate("machine_id", "serialNumber productName client installationLocation")
        .populate("assignedTechnician_id", "firstName lastName")
        .populate("createdBy", "firstName lastName")

      return res.status(200).json({ success: true, data: tickets })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch tickets", error })
    }
  }

  static async createTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const ticket = new Ticket({
        ...req.body,
        org_id: req.org_id,
        createdBy: req.user?.userId
      })
      await ticket.save()
      return res.status(201).json({ success: true, data: ticket })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to create ticket", error })
    }
  }

  static async updateTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const ticket = await Ticket.findOneAndUpdate(
        { _id: req.params.id, org_id: req.org_id },
        req.body,
        { new: true }
      )
      if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" })
      return res.status(200).json({ success: true, data: ticket })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to update ticket", error })
    }
  }

  /**
   * Resolve a ticket without a service, or escalate it to a machine service + quotation.
   * body.action: "resolved" | "escalate_service"
   */
  static async resolveTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const ticketId = String(req.params.id || "").trim()
      const action = String(req.body?.action || "").trim()
      const resolutionNote = String(req.body?.resolutionNote || req.body?.notes || "").trim()

      if (!ticketId) {
        return res.status(400).json({ success: false, message: "Ticket id is required" })
      }
      if (action !== "resolved" && action !== "escalate_service") {
        return res.status(400).json({
          success: false,
          message: 'action must be "resolved" or "escalate_service"',
        })
      }

      const ticket = await Ticket.findOne({ _id: ticketId, org_id })
      if (!ticket) {
        return res.status(404).json({ success: false, message: "Ticket not found" })
      }

      const terminal = ["Closed", "Dismissed", "Resolved"]
      if (terminal.includes(ticket.status) || ticket.resolutionType === "escalated_to_service") {
        return res.status(400).json({
          success: false,
          message: "Ticket is already resolved or escalated",
        })
      }

      if (action === "resolved") {
        ticket.status = "Resolved"
        ticket.resolutionType = "conversation"
        ticket.resolutionNote = resolutionNote || "Resolved during conversation"
        ticket.resolvedDate = new Date()
        await ticket.save()
        return res.status(200).json({ success: true, data: ticket })
      }

      // escalate_service
      const machineId = String(
        req.body?.machineId || ticket.machine_id || "",
      ).trim()
      if (!machineId) {
        return res.status(400).json({
          success: false,
          message: "machineId is required to escalate to service",
        })
      }

      const machine = await InstalledMachine.findOne({ _id: machineId, org_id }).lean()
      if (!machine) {
        return res.status(404).json({ success: false, message: "Installed machine not found" })
      }

      const serviceType =
        String(req.body?.serviceType || "").trim() ||
        `Service from ticket: ${ticket.title}`
      const technician = String(req.body?.technician || "").trim()
      const cost =
        req.body?.cost != null && req.body?.cost !== ""
          ? Number(req.body.cost)
          : 0
      if (!Number.isFinite(cost) || cost < 0) {
        return res.status(400).json({ success: false, message: "Invalid service cost" })
      }
      const scheduledDate = normalizeDate(req.body?.scheduledDate)
      const serviceNotes =
        String(req.body?.notes || "").trim() ||
        resolutionNote ||
        ticket.description ||
        ""

      const service = await MachineService.create({
        org_id,
        machineId,
        serviceType,
        scheduledDate,
        completedDate: null,
        technician,
        cost,
        notes: serviceNotes,
      })

      await syncMachineNextServiceDate(org_id, machineId)

      const clientName = String(machine.client?.name || "Walk-in Client").trim()
      const clientNumber = String(
        machine.client?.number || ticket.callerPhone || "WALK-IN",
      ).trim()
      const clientLocation = String(
        machine.client?.location || machine.installationLocation || "N/A",
      ).trim()
      const contactPerson = String(
        machine.client?.contactPerson || ticket.callerName || "",
      ).trim()

      const productLabel = [
        serviceType,
        machine.productName ? `(${machine.productName}` : "",
        machine.serialNumber ? ` SN ${machine.serialNumber}` : "",
        machine.productName ? ")" : "",
      ]
        .join("")
        .trim()

      const quotationItems = await buildQuotationItems(org_id, [
        {
          productName: productLabel || "Machine Service",
          quantity: 1,
          unitPrice: cost,
          isOutsourced: true,
          description: serviceNotes || ticket.title,
        },
      ])
      const subTotal = Number(
        quotationItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
      )

      const quotation = await StockQuotation.create({
        org_id,
        quotationNumber: generateDocumentNumber("QTN"),
        client: {
          name: clientName,
          number: clientNumber,
          location: clientLocation || "N/A",
          contactPerson: contactPerson || undefined,
        },
        items: quotationItems,
        subTotal,
        status: "draft",
        createdBy: String(userId),
      })

      ticket.machine_id = machineId
      ticket.status = scheduledDate ? "Scheduled" : "Processed"
      ticket.resolutionType = "escalated_to_service"
      ticket.resolutionNote = resolutionNote || serviceNotes || "Escalated to service"
      ticket.serviceId = String(service._id)
      ticket.quotationId = String(quotation._id)
      ticket.quotationNumber = quotation.quotationNumber
      ticket.scheduledDate = scheduledDate
      ticket.resolvedDate = new Date()
      await ticket.save()

      return res.status(200).json({
        success: true,
        data: {
          ticket,
          service,
          quotation: {
            _id: quotation._id,
            quotationNumber: quotation.quotationNumber,
            subTotal: quotation.subTotal,
            status: quotation.status,
          },
        },
      })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve ticket"
      return res.status(500).json({ success: false, message })
    }
  }
}
