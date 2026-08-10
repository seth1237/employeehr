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
import { StockInvoice } from "../models/StockInvoice"
import { StockClient } from "../models/StockClient"
import { QuotationFollowUp } from "../models/QuotationFollowUp"
import { StockServiceJob } from "../models/StockServiceJob"
import { User } from "../models/User"
import { Types } from "mongoose"
import { Company } from "../models/Company"
import { buildQuotationItems, generateDocumentNumber } from "./stock/stockShared"
import "../models/Ticket"

export const DEFAULT_CALL_PURPOSES = [
  "Company introduction",
  "Quotation follow up",
  "Debt collection",
  "Delivery inquiry",
  "Project inquiry",
] as const

export const SELLING_CALL_PURPOSES = new Set([
  "Company introduction",
  "Quotation follow up",
  "Project inquiry",
])

function normalizeDate(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function toValidObjectIds(values: Array<string | undefined | null>) {
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0 && Types.ObjectId.isValid(value)),
    ),
  ]
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
      const org_id = req.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const note = String(req.body?.note || "").trim()
      if (!note) {
        return res.status(400).json({ success: false, message: "Call notes are required" })
      }

      const callPurpose = String(req.body?.callPurpose || "").trim()
      const outcome = String(req.body?.outcome || req.body?.status || "Pending").trim()
      const clientName = String(req.body?.clientName || "").trim()
      const clientPhone = String(req.body?.clientPhone || "").trim()
      const createLead =
        req.body?.createLead !== undefined
          ? Boolean(req.body.createLead)
          : outcome === "Interested"
      const followUpNeeded =
        Boolean(req.body?.followUpNeeded) ||
        outcome === "Follow-up Needed" ||
        Boolean(req.body?.followUpDate)
      const followUpDate = normalizeDate(req.body?.followUpDate)

      if (followUpNeeded && !followUpDate) {
        return res.status(400).json({
          success: false,
          message: "Follow-up date is required when follow-up is needed",
        })
      }

      const rawCategories = Array.isArray(req.body?.focusCategories)
        ? req.body.focusCategories
        : []
      const focusCategories = rawCategories
        .map((item: any) => ({
          id: String(item?.id || item?._id || "").trim(),
          name: String(item?.name || "").trim(),
        }))
        .filter((item: { id: string; name: string }) => item.id && item.name)

      if (SELLING_CALL_PURPOSES.has(callPurpose) && focusCategories.length === 0) {
        // Soft requirement: allow save but prefer categories for selling calls
      }

      let customerId = String(req.body?.customer_id || "").trim() || undefined
      let leadId = String(req.body?.lead_id || "").trim() || undefined
      let lead = null as any

      if (createLead && outcome === "Interested") {
        if (!customerId) {
          let customer =
            (clientPhone
              ? await Customer.findOne({
                  org_id,
                  phoneNumbers: clientPhone,
                })
              : null) ||
            (clientName
              ? await Customer.findOne({
                  org_id,
                  name: new RegExp(`^${clientName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                })
              : null)

          if (!customer) {
            customer = await Customer.create({
              org_id,
              name: clientName || "Unknown client",
              contactPerson: String(req.body?.contactPerson || "").trim() || undefined,
              phoneNumbers: clientPhone ? [clientPhone] : [],
              physicalAddress: String(req.body?.clientLocation || "").trim() || undefined,
              category: "Other",
              leadSource: callPurpose || "Telesales call",
              status: "Active",
              createdBy: String(userId),
            })
          }
          customerId = String(customer._id)
        }

        const categoryLabel = focusCategories.map((c: { name: string }) => c.name).join(", ")
        lead = await Lead.create({
          org_id,
          customer_id: customerId,
          title: `${clientName || "Client"} — ${callPurpose || "Interested lead"}`,
          stage: followUpNeeded ? "Follow-up" : "Interested",
          source: callPurpose || "Telesales call",
          owner_id: String(userId),
          expectedCloseDate: followUpDate,
          notes: [
            note,
            categoryLabel ? `Focus: ${categoryLabel}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        })
        leadId = String(lead._id)
      }

      const status = followUpNeeded
        ? "Follow-up Needed"
        : outcome || "Pending"

      const conversation = await ClientConversation.create({
        org_id,
        roomName: String(req.body?.roomName || "Telesales").trim() || "Telesales",
        customer_id: customerId,
        clientName: clientName || undefined,
        clientPhone: clientPhone || undefined,
        lead_id: leadId,
        quotation_id: req.body?.quotation_id || undefined,
        note,
        callPurpose: callPurpose || undefined,
        focusCategories,
        outcome,
        followUpNeeded,
        assignedTo: req.body?.assignedTo || userId,
        followUpDate,
        status,
        documentName: req.body?.documentName || undefined,
        createdBy: String(userId),
      })

      return res.status(201).json({
        success: true,
        data: {
          conversation,
          lead: lead
            ? {
                _id: lead._id,
                title: lead.title,
                stage: lead.stage,
              }
            : null,
        },
      })
    } catch (error: unknown) {
      console.error("createConversation failed:", error)
      const message =
        error instanceof Error ? error.message : "Failed to save conversation"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getCallPurposes(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const company = await Company.findById(org_id)
        .select("crmSettings.callPurposes")
        .lean()
      const custom = Array.isArray((company as any)?.crmSettings?.callPurposes)
        ? (company as any).crmSettings.callPurposes.map((p: string) => String(p).trim()).filter(Boolean)
        : []
      const purposes = [
        ...DEFAULT_CALL_PURPOSES,
        ...custom.filter(
          (p: string) =>
            !DEFAULT_CALL_PURPOSES.some(
              (d) => d.toLowerCase() === p.toLowerCase(),
            ),
        ),
      ]
      return res.status(200).json({
        success: true,
        data: {
          purposes,
          defaults: [...DEFAULT_CALL_PURPOSES],
          custom,
          sellingPurposes: [...SELLING_CALL_PURPOSES],
        },
      })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load call purposes"
      return res.status(500).json({ success: false, message })
    }
  }

  static async addCallPurpose(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const purpose = String(req.body?.purpose || "").trim()
      if (!purpose) {
        return res.status(400).json({ success: false, message: "Purpose is required" })
      }
      if (purpose.length > 80) {
        return res.status(400).json({ success: false, message: "Purpose is too long" })
      }

      const isDefault = DEFAULT_CALL_PURPOSES.some(
        (d) => d.toLowerCase() === purpose.toLowerCase(),
      )
      if (!isDefault) {
        await Company.findByIdAndUpdate(org_id, {
          $addToSet: { "crmSettings.callPurposes": purpose },
        })
      }

      const company = await Company.findById(org_id)
        .select("crmSettings.callPurposes")
        .lean()
      const custom = Array.isArray((company as any)?.crmSettings?.callPurposes)
        ? (company as any).crmSettings.callPurposes
        : []
      const purposes = [
        ...DEFAULT_CALL_PURPOSES,
        ...custom.filter(
          (p: string) =>
            !DEFAULT_CALL_PURPOSES.some(
              (d) => d.toLowerCase() === String(p).toLowerCase(),
            ),
        ),
      ]

      return res.status(200).json({
        success: true,
        data: {
          purpose,
          purposes,
          sellingPurposes: [...SELLING_CALL_PURPOSES],
        },
      })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to add call purpose"
      return res.status(500).json({ success: false, message })
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

  /**
   * Telesales Activity — performance metrics + activity planner
   * Query: from, to (ISO dates). Defaults to current month.
   */
  static async getTelesalesActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const now = new Date()
      const defaultFrom = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
      const defaultTo = endOfDay(now)
      const from = normalizeDate(req.query.from) || defaultFrom
      const to = normalizeDate(req.query.to) || defaultTo
      const rangeStart = startOfDay(from)
      const rangeEnd = endOfDay(to)

      // Planner window: from range start through range end, plus overdue open items
      const plannerStart = startOfDay(rangeStart)
      const plannerEnd = endOfDay(rangeEnd)

      const [
        quotesGenerated,
        invoicesConverted,
        newClientsOnboarded,
        quotationFollowUpsCount,
        callsLoggedCount,
        quotations,
        convertedQuotations,
        newClients,
        followUps,
        callLogs,
        serviceJobs,
        machineServices,
        pendingInstallations,
        conversationFollowUps,
      ] = await Promise.all([
        StockQuotation.countDocuments({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        }),
        StockQuotation.countDocuments({
          org_id,
          status: "converted",
          updatedAt: { $gte: rangeStart, $lte: rangeEnd },
        }),
        StockClient.countDocuments({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        }),
        QuotationFollowUp.countDocuments({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        }),
        ClientConversation.countDocuments({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        }),
        StockQuotation.find({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .select(
            "quotationNumber client status subTotal createdBy createdAt convertedInvoiceId",
          )
          .lean(),
        StockQuotation.find({
          org_id,
          status: "converted",
          updatedAt: { $gte: rangeStart, $lte: rangeEnd },
        })
          .sort({ updatedAt: -1 })
          .limit(50)
          .select(
            "quotationNumber client status subTotal createdBy updatedAt convertedInvoiceId",
          )
          .lean(),
        StockClient.find({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .select(
            "legalName sourceName sourceNumber sourceLocation contactPerson createdBy createdAt",
          )
          .lean(),
        QuotationFollowUp.find({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        ClientConversation.find({
          org_id,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .select(
            "roomName clientName clientPhone note callPurpose focusCategories outcome followUpNeeded followUpDate status assignedTo createdBy createdAt lead_id",
          )
          .lean(),
        StockServiceJob.find({
          org_id,
          status: { $in: ["pending", "in-progress", "overdue"] },
          scheduledDate: { $lte: plannerEnd },
        })
          .sort({ scheduledDate: 1 })
          .limit(80)
          .lean(),
        MachineService.find({
          org_id,
          $and: [
            {
              $or: [
                { completedDate: null },
                { completedDate: { $exists: false } },
              ],
            },
            {
              scheduledDate: { $gte: plannerStart, $lte: plannerEnd },
            },
          ],
        })
          .sort({ scheduledDate: 1 })
          .limit(80)
          .lean(),
        InstalledMachine.find({
          org_id,
          $or: [
            { status: "installation_pending" },
            {
              installationDate: { $gte: plannerStart, $lte: plannerEnd },
            },
            {
              nextServiceDate: { $gte: plannerStart, $lte: plannerEnd },
            },
          ],
        })
          .sort({ installationDate: 1, nextServiceDate: 1 })
          .limit(80)
          .select(
            "client productName serialNumber status installationDate nextServiceDate installationLocation installedBy attendant attendantRole",
          )
          .lean(),
        ClientConversation.find({
          org_id,
          $or: [
            {
              followUpNeeded: true,
              status: { $nin: ["Closed", "Not Interested"] },
            },
            { status: "Follow-up Needed" },
            {
              followUpDate: { $gte: plannerStart, $lte: plannerEnd },
            },
          ],
        })
          .sort({ followUpDate: 1, createdAt: -1 })
          .limit(120)
          .select(
            "roomName clientName clientPhone note followUpDate status assignedTo createdBy callPurpose focusCategories outcome followUpNeeded",
          )
          .lean(),
      ])

      const followUpQuotationIds = [
        ...new Set(followUps.map((f) => String(f.quotationId || "")).filter(Boolean)),
      ]
      const followUpQuotations = followUpQuotationIds.length
        ? await StockQuotation.find({
            org_id,
            _id: { $in: followUpQuotationIds },
          })
            .select("quotationNumber client")
            .lean()
        : []
      const followUpQuoteMap = new Map(
        followUpQuotations.map((q) => [String(q._id), q]),
      )

      const machineIds = [
        ...new Set(machineServices.map((s) => String(s.machineId || "")).filter(Boolean)),
      ]
      const machinesForServices = machineIds.length
        ? await InstalledMachine.find({
            org_id,
            _id: { $in: machineIds },
          })
            .select("client productName serialNumber")
            .lean()
        : []
      const machineMap = new Map(
        machinesForServices.map((m) => [String(m._id), m]),
      )

      const userIds = toValidObjectIds([
        ...quotations.map((q) => q.createdBy),
        ...convertedQuotations.map((q) => q.createdBy),
        ...newClients.map((c) => c.createdBy),
        ...followUps.map((f) => f.createdBy),
        ...callLogs.map((c) => c.assignedTo || c.createdBy),
        ...conversationFollowUps.map((c) => c.assignedTo || c.createdBy),
      ])
      const users = userIds.length
        ? await User.find({ _id: { $in: userIds }, org_id })
            .select("firstName lastName email")
            .lean()
        : []
      const userMap = new Map(
        users.map((u) => [
          String(u._id),
          `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "User",
        ]),
      )

      const nameFor = (id?: string) => {
        if (!id) return "—"
        if (String(id) === "website") return "Website"
        return userMap.get(String(id)) || "—"
      }

      const invoiceIds = convertedQuotations
        .map((q) => String(q.convertedInvoiceId || ""))
        .filter(Boolean)
      const invoices = invoiceIds.length
        ? await StockInvoice.find({
            org_id,
            _id: { $in: invoiceIds },
          })
            .select("invoiceNumber subTotal status")
            .lean()
        : []
      const invoiceMap = new Map(
        invoices.map((inv) => [String(inv._id), inv]),
      )

      const quoteValue = quotations.reduce(
        (sum, q) => sum + Number(q.subTotal || 0),
        0,
      )
      const convertedValue = convertedQuotations.reduce(
        (sum, q) => sum + Number(q.subTotal || 0),
        0,
      )

      return res.status(200).json({
        success: true,
        data: {
          period: {
            from: rangeStart.toISOString(),
            to: rangeEnd.toISOString(),
          },
          performance: {
            quotesGenerated,
            invoicesConverted,
            newClientsOnboarded,
            quotationFollowUps: quotationFollowUpsCount,
            callsLogged: callsLoggedCount,
            quoteValue,
            convertedValue,
            conversionRate:
              quotesGenerated > 0
                ? Number(((invoicesConverted / quotesGenerated) * 100).toFixed(1))
                : 0,
          },
          activity: {
            quotations: quotations.map((q) => ({
              _id: String(q._id),
              quotationNumber: q.quotationNumber,
              clientName: q.client?.name || "—",
              clientPhone: q.client?.number || "",
              status: q.status,
              subTotal: Number(q.subTotal || 0),
              createdByName: nameFor(q.createdBy),
              createdAt: q.createdAt,
            })),
            conversions: convertedQuotations.map((q) => {
              const inv = q.convertedInvoiceId
                ? invoiceMap.get(String(q.convertedInvoiceId))
                : null
              return {
                _id: String(q._id),
                quotationNumber: q.quotationNumber,
                invoiceNumber: inv?.invoiceNumber || "—",
                clientName: q.client?.name || "—",
                subTotal: Number(q.subTotal || 0),
                createdByName: nameFor(q.createdBy),
                convertedAt: q.updatedAt,
              }
            }),
            newClients: newClients.map((c) => ({
              _id: String(c._id),
              name: c.legalName || c.sourceName || "—",
              phone: c.sourceNumber || "",
              location: c.sourceLocation || "",
              contactPerson: c.contactPerson || "",
              createdByName: nameFor(c.createdBy),
              createdAt: c.createdAt,
            })),
            followUps: followUps.map((f) => {
              const q = followUpQuoteMap.get(String(f.quotationId))
              return {
                _id: String(f._id),
                quotationId: f.quotationId,
                quotationNumber: q?.quotationNumber || "—",
                clientName: q?.client?.name || "—",
                note: f.note,
                callMade: Boolean(f.callMade),
                outcome: f.outcome || "",
                createdByName: nameFor(f.createdBy),
                createdAt: f.createdAt,
              }
            }),
            callLogs: callLogs.map((c) => {
              const categories = Array.isArray((c as any).focusCategories)
                ? (c as any).focusCategories
                    .map((cat: any) => cat.name)
                    .filter(Boolean)
                : []
              return {
                _id: String(c._id),
                clientName: c.clientName || "—",
                clientPhone: c.clientPhone || "",
                callPurpose: (c as any).callPurpose || c.roomName || "Call",
                focusCategories: categories,
                outcome: (c as any).outcome || c.status,
                note: c.note,
                followUpNeeded: Boolean((c as any).followUpNeeded),
                followUpDate: c.followUpDate,
                status: c.status,
                hasLead: Boolean(c.lead_id),
                createdByName: nameFor(c.assignedTo || c.createdBy),
                createdAt: c.createdAt,
              }
            }),
          },
          planner: {
            services: [
              ...serviceJobs.map((job) => ({
                _id: String(job._id),
                type: "service" as const,
                title: job.serviceName,
                clientName: job.clientName || "—",
                scheduledDate: job.scheduledDate,
                status: job.status,
                notes: job.notes || "",
                overdue:
                  job.status === "overdue" ||
                  (job.scheduledDate &&
                    new Date(job.scheduledDate) < startOfDay(now) &&
                    job.status !== "done" &&
                    job.status !== "cancelled"),
              })),
              ...machineServices.map((svc) => {
                const machine = machineMap.get(String(svc.machineId))
                return {
                  _id: String(svc._id),
                  type: "machine_service" as const,
                  title: svc.serviceType || "Machine service",
                  clientName: machine?.client?.name || "—",
                  productName: machine?.productName || "",
                  serialNumber: machine?.serialNumber || "",
                  scheduledDate: svc.scheduledDate,
                  status: svc.completedDate ? "done" : "pending",
                  notes: svc.notes || "",
                  technician: svc.technician || "",
                  overdue:
                    Boolean(svc.scheduledDate) &&
                    new Date(svc.scheduledDate as Date) < startOfDay(now) &&
                    !svc.completedDate,
                }
              }),
            ].sort(
              (a, b) =>
                new Date(a.scheduledDate || 0).getTime() -
                new Date(b.scheduledDate || 0).getTime(),
            ),
            installations: pendingInstallations.map((m) => ({
              _id: String(m._id),
              type: "installation" as const,
              title: m.productName,
              clientName: m.client?.name || "—",
              serialNumber: m.serialNumber || "",
              location: m.installationLocation || m.client?.location || "",
              status: m.status || "active",
              installationDate: m.installationDate,
              nextServiceDate: m.nextServiceDate,
              installedBy: (m as any).installedBy || "",
              attendant: (m as any).attendant || "",
              attendantRole: (m as any).attendantRole || "",
            })),
            followUps: conversationFollowUps.map((c) => {
              const categories = Array.isArray((c as any).focusCategories)
                ? (c as any).focusCategories.map((cat: any) => cat.name).filter(Boolean)
                : []
              const purpose = String((c as any).callPurpose || "")
              return {
                _id: String(c._id),
                type: "client_followup" as const,
                title: purpose || c.roomName || "Follow-up",
                clientName: c.clientName || "—",
                clientPhone: c.clientPhone || "",
                note: c.note,
                followUpDate: c.followUpDate,
                status: c.status,
                callPurpose: purpose,
                focusCategories: categories,
                outcome: (c as any).outcome || c.status,
                assignedToName: nameFor(c.assignedTo || c.createdBy),
                overdue:
                  Boolean(c.followUpDate) &&
                  new Date(c.followUpDate as Date) < startOfDay(now),
              }
            }),
          },
        },
      })
    } catch (error: unknown) {
      console.error("getTelesalesActivity failed:", error)
      const message =
        error instanceof Error ? error.message : "Failed to load telesales activity"
      return res.status(500).json({ success: false, message })
    }
  }
}
