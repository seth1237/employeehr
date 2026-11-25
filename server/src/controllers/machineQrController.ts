import crypto from "crypto";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { Company } from "../models/Company";
import { InstalledMachine } from "../models/InstalledMachine";
import { MachineQrReport } from "../models/MachineQrReport";
import { MachineService } from "../models/MachineService";
import { StockClient } from "../models/StockClient";
import { StockInvoice } from "../models/StockInvoice";
import { StockProduct } from "../models/StockProduct";
import { Ticket } from "../models/Ticket";
import emailService from "../services/email.service";
import {
  renderCalloutBox,
  renderCompanyBrandedEmail,
  renderInfoPanel,
} from "../lib/email-templates";

const REPORT_TYPES = ["service", "breakdown", "product_order"] as const;
const REPORT_STATUSES = ["open", "in_progress", "closed"] as const;
const URGENCY = ["low", "normal", "high", "critical"] as const;

const DEPLOYED_QR_ORIGIN = "https://elevatehub.co.ke";

function resolveQrPublicOrigin(_requested?: string, _req?: Request) {
  return DEPLOYED_QR_ORIGIN;
}

async function uniqueQrToken() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = crypto.randomBytes(12).toString("hex");
    const exists = await InstalledMachine.exists({ qrToken: token });
    if (!exists) return token;
  }
  throw new Error("Could not allocate a unique QR token");
}

async function ensureMachineToken(machine: any) {
  if (machine.qrToken) return machine;
  machine.qrToken = await uniqueQrToken();
  machine.qrGeneratedAt = new Date();
  await machine.save();
  return machine;
}

function machineCard(machine: any, origin = "") {
  const token = String(machine.qrToken || "");
  return {
    _id: String(machine._id),
    productName: machine.productName,
    productId: machine.productId,
    serialNumber: machine.serialNumber || "",
    category: machine.category || "",
    status: machine.status,
    client: machine.client,
    installationLocation: machine.installationLocation || "",
    attendant: machine.attendant || "",
    attendantNumber: machine.attendantNumber || "",
    invoiceId: machine.invoiceId || "",
    qrToken: token,
    qrGeneratedAt: machine.qrGeneratedAt || null,
    qrScanCount: machine.qrScanCount || 0,
    lastQrScanAt: machine.lastQrScanAt || null,
    publicPath: token ? `/m/${token}` : "",
    publicUrl: token && origin ? `${origin.replace(/\/$/, "")}/m/${token}` : "",
  };
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeEmails(values: unknown): string[] {
  const raw = Array.isArray(values) ? values : String(values || "").split(/[,;\n]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const email = String(item || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

async function clientEmailsForMachine(machine: any) {
  const name = String(machine?.client?.name || "").trim();
  const number = String(machine?.client?.number || "").trim();
  if (!name && !number) return [];
  const filter: Record<string, unknown> = { org_id: machine.org_id };
  const or: Record<string, unknown>[] = [];
  if (name) {
    or.push({ sourceName: name }, { legalName: name });
  }
  if (number) or.push({ sourceNumber: number });
  if (or.length) filter.$or = or;
  const client = await StockClient.findOne(filter).select("email contacts.email").lean();
  if (!client) return [];
  return normalizeEmails([
    client.email,
    ...(client.contacts || []).map((contact) => contact.email),
  ]);
}

async function notifyQrRequest(params: {
  orgId: string;
  type: string;
  machine: any;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  message: string;
  preferredDate: string;
  urgency: string;
  productName: string;
  quantity: number;
}) {
  const company = await Company.findById(params.orgId)
    .select("name email logo primaryColor technicalServiceQrMail")
    .lean();
  if (!company) return;

  const configuredTo = normalizeEmails(company.technicalServiceQrMail?.to);
  const configuredCc = normalizeEmails(company.technicalServiceQrMail?.cc);
  const to = configuredTo.length ? configuredTo : normalizeEmails(company.email);
  if (!to.length) return;

  const clientMails = await clientEmailsForMachine(params.machine);
  const cc = normalizeEmails([
    ...configuredCc,
    ...clientMails,
    params.contactEmail,
  ]).filter((email) => !to.includes(email));

  const typeLabel =
    params.type === "breakdown"
      ? "Breakdown report"
      : params.type === "product_order"
        ? "Product order"
        : "Service request";
  const html = renderCompanyBrandedEmail({
    title: `${typeLabel} · ${params.machine.productName || "Machine"}`,
    preheader: `${params.contactName} submitted a ${typeLabel.toLowerCase()} from a machine QR`,
    headline: typeLabel,
    subtitle: params.machine.productName || "Machine QR",
    companyName: company.name,
    logoUrl: company.logo || undefined,
    accentColor: company.primaryColor || undefined,
    bodyHtml: `
      ${renderCalloutBox(
        `<p style="margin:0;font-size:14px;">A public QR request was submitted for <strong>${escapeHtml(params.machine.productName || "this machine")}</strong>.</p>`,
        params.type === "breakdown" ? "warn" : "info",
        company.primaryColor || undefined,
      )}
      ${renderInfoPanel("Request", [
        { label: "Type", value: typeLabel },
        { label: "Machine", value: params.machine.productName || "—" },
        { label: "Client", value: params.machine.client?.name || "—" },
        { label: "Location", value: params.machine.installationLocation || params.machine.client?.location || "—" },
        { label: "Contact", value: `${params.contactName} · ${params.contactPhone}` },
        ...(params.contactEmail ? [{ label: "Contact email", value: params.contactEmail }] : []),
        { label: "Urgency", value: params.urgency },
        ...(params.preferredDate ? [{ label: "Preferred date", value: params.preferredDate }] : []),
        ...(params.type === "product_order"
          ? [{ label: "Product", value: `${params.quantity} × ${params.productName}` }]
          : []),
      ])}
      <p style="margin:16px 0 0;white-space:pre-wrap;">${escapeHtml(params.message || "No extra notes.")}</p>`,
  });

  await emailService.sendEmail({
    to: to.join(", "),
    cc: cc.length ? cc : undefined,
    subject: `${typeLabel}: ${params.machine.productName || "machine"} · ${params.machine.client?.name || "client"}`,
    html,
    companyId: params.orgId,
    mailKey: "technical_service",
  });
}

function machineStatusLabel(status?: string) {
  switch (String(status || "active")) {
    case "maintenance":
      return "Under service";
    case "installation_pending":
      return "Installation pending";
    case "in_workshop":
      return "In workshop";
    case "decommissioned":
      return "Out of service";
    case "ended":
      return "Ended";
    default:
      return "Working";
  }
}

function jobTitle(row: any) {
  const named = String(row?.serviceType || "").trim();
  if (named) return named;
  switch (String(row?.type || "")) {
    case "installation":
      return "Installation";
    case "preventive":
      return "Preventive service";
    case "calibration":
      return "Calibration";
    case "inspection":
      return "Inspection";
    case "vendor":
      return "Vendor visit";
    default:
      return "Service visit";
  }
}

function publicJob(row: any) {
  const okay = row?.machineOkay;
  return {
    id: String(row._id),
    date: row.completedDate || row.startedAt || row.scheduledDate || row.createdAt || null,
    type: row.type || "corrective",
    title: jobTitle(row),
    status: row.status || "open",
    engineer: String(row.technician || "").trim(),
    note: String(row.notes || "").trim().slice(0, 240),
    machineOkay: typeof okay === "boolean" ? okay : null,
  };
}

function titleForType(type: string, machine: any) {
  const name = machine.productName || "machine";
  if (type === "breakdown") return `Breakdown reported · ${name}`;
  if (type === "product_order") return `Product order from QR · ${name}`;
  return `Service requested · ${name}`;
}

export class MachineQrController {
  static async publicGetMachine(req: Request, res: Response) {
    try {
      const token = String(req.params.token || "").trim().toLowerCase();
      if (!token) {
        return res.status(400).json({ success: false, message: "Missing QR token" });
      }

      const machine = await InstalledMachine.findOne({
        qrToken: token,
        isActive: { $ne: false },
      });
      if (!machine) {
        return res.status(404).json({ success: false, message: "This QR code is not valid." });
      }

      machine.qrScanCount = Number(machine.qrScanCount || 0) + 1;
      machine.lastQrScanAt = new Date();
      await machine.save();

      const machineId = String(machine._id);
      const jobSelect =
        "type status serviceType scheduledDate startedAt completedDate technician notes machineOkay createdAt";
      const [company, products, completedJobs, liveJob] = await Promise.all([
        Company.findById(machine.org_id)
          .select("name logo primaryColor secondaryColor accentColor phone email invoiceSettings")
          .lean(),
        StockProduct.find({
          org_id: machine.org_id,
          isActive: true,
          productType: { $ne: "service" },
        })
          .select("name category")
          .sort({ name: 1 })
          .limit(40)
          .lean(),
        MachineService.find({
          org_id: machine.org_id,
          machineId,
          status: "completed",
        })
          .select(jobSelect)
          .sort({ completedDate: -1, createdAt: -1 })
          .limit(12)
          .lean(),
        MachineService.findOne({
          org_id: machine.org_id,
          machineId,
          status: { $in: ["in_progress", "assigned", "open", "on_hold", "waiting_parts"] },
        })
          .select(jobSelect)
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean(),
      ]);

      const history = (completedJobs || []).map(publicJob);
      const currentJob = liveJob ? publicJob(liveJob) : null;
      const engineerUpdate = history[0] || null;

      return res.status(200).json({
        success: true,
        data: {
          machine: {
            productName: machine.productName,
            serialNumber: machine.serialNumber || "",
            clientName: machine.client?.name || "",
            location: machine.installationLocation || machine.client?.location || "",
            attendant: machine.attendant || "",
            status: machine.status || "active",
            statusLabel: machineStatusLabel(machine.status),
            nextServiceDate: machine.nextServiceDate || null,
          },
          engineerUpdate,
          currentJob,
          history,
          company: company
            ? {
                name: company.name,
                logo: company.logo || "",
                primaryColor: company.primaryColor || "#0f766e",
                secondaryColor: company.secondaryColor || "#0ea5e9",
                accentColor: company.accentColor || "",
                phone: company.invoiceSettings?.contactPhone || company.phone || "",
                email: company.invoiceSettings?.contactEmail || company.email || "",
                officeLocation: company.invoiceSettings?.officeLocation || "",
              }
            : null,
          catalog: (products || []).map((item: any) => ({
            name: item.name,
            category: item.category || "",
          })),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load this machine",
      });
    }
  }

  static async publicCreateReport(req: Request, res: Response) {
    try {
      const token = String(req.params.token || "").trim().toLowerCase();
      const body = req.body || {};
      const type = String(body.type || "").trim();
      const contactName = String(body.contactName || "").trim();
      const contactPhone = String(body.contactPhone || "").trim();
      const contactEmail = String(body.contactEmail || "").trim();
      const message = String(body.message || "").trim();
      const preferredDate = String(body.preferredDate || "").trim();
      const urgency = URGENCY.includes(body.urgency) ? body.urgency : "normal";
      const productName = String(body.productName || "").trim();
      const quantity = Math.max(1, Number(body.quantity || 1) || 1);

      if (!REPORT_TYPES.includes(type as any)) {
        return res.status(400).json({ success: false, message: "Choose a request type" });
      }
      if (!contactName || !contactPhone) {
        return res.status(400).json({ success: false, message: "Name and phone are required" });
      }
      if (type === "product_order" && !productName) {
        return res.status(400).json({ success: false, message: "Tell us which product you need" });
      }
      if (type !== "product_order" && !message) {
        return res.status(400).json({ success: false, message: "Please describe what you need" });
      }

      const machine = await InstalledMachine.findOne({
        qrToken: token,
        isActive: { $ne: false },
      });
      if (!machine) {
        return res.status(404).json({ success: false, message: "This QR code is not valid." });
      }

      const descriptionParts = [
        message || (type === "product_order" ? `Order ${quantity} × ${productName}` : ""),
        preferredDate ? `Preferred date: ${preferredDate}` : "",
        type === "product_order" ? `Product: ${productName} · Qty ${quantity}` : "",
        `Urgency: ${urgency}`,
        `Submitted from machine QR (${machine.serialNumber || machine.productName})`,
      ].filter(Boolean);

      const ticket = await Ticket.create({
        org_id: machine.org_id,
        machine_id: String(machine._id),
        callerName: contactName,
        callerPhone: contactPhone,
        title: titleForType(type, machine),
        description: descriptionParts.join("\n"),
        createdBy: "qr-public",
        status: "Open",
      });

      const report = await MachineQrReport.create({
        org_id: machine.org_id,
        machineId: String(machine._id),
        qrToken: token,
        type,
        status: "open",
        contactName,
        contactPhone,
        contactEmail,
        message: message || `Order ${quantity} × ${productName}`,
        preferredDate,
        urgency,
        productName: type === "product_order" ? productName : machine.productName,
        quantity: type === "product_order" ? quantity : undefined,
        ticketId: String(ticket._id),
        machineSnapshot: {
          productName: machine.productName,
          serialNumber: machine.serialNumber || "",
          clientName: machine.client?.name || "",
          location: machine.installationLocation || machine.client?.location || "",
        },
      });

      if (type === "breakdown" && machine.status !== "decommissioned") {
        machine.status = "maintenance";
        await machine.save();
      }

      void notifyQrRequest({
        orgId: String(machine.org_id),
        type,
        machine,
        contactName,
        contactPhone,
        contactEmail,
        message: message || (type === "product_order" ? `Order ${quantity} × ${productName}` : ""),
        preferredDate,
        urgency,
        productName: type === "product_order" ? productName : machine.productName,
        quantity,
      }).catch((error) => {
        console.error("QR request email failed:", error);
      });

      return res.status(201).json({
        success: true,
        message:
          type === "product_order"
            ? "Your order request has been sent."
            : type === "breakdown"
              ? "Breakdown reported. Technical service will follow up."
              : "Service request received.",
        data: { id: String(report._id) },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Could not submit this request",
      });
    }
  }

  static async listCodes(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const q = String(req.query.q || "").trim();
      const filter: Record<string, unknown> = { org_id, isActive: { $ne: false } };
      if (q) {
        filter.$or = [
          { productName: { $regex: q, $options: "i" } },
          { serialNumber: { $regex: q, $options: "i" } },
          { "client.name": { $regex: q, $options: "i" } },
          { attendant: { $regex: q, $options: "i" } },
        ];
      }

      const machines = await InstalledMachine.find(filter)
        .sort({ qrGeneratedAt: -1, updatedAt: -1 })
        .limit(200)
        .lean();

      const origin = resolveQrPublicOrigin(String(req.query.origin || ""), req);
      return res.status(200).json({
        success: true,
        data: machines.map((machine) => machineCard(machine, origin)),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list QR codes",
      });
    }
  }

  static async getNotifyEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const company = await Company.findById(org_id).select("email technicalServiceQrMail").lean();
      return res.status(200).json({
        success: true,
        data: {
          to: normalizeEmails(company?.technicalServiceQrMail?.to),
          cc: normalizeEmails(company?.technicalServiceQrMail?.cc),
          companyEmail: company?.email || "",
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load notification emails",
      });
    }
  }

  static async saveNotifyEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const to = normalizeEmails(req.body?.to);
      const cc = normalizeEmails(req.body?.cc).filter((email) => !to.includes(email));
      await Company.findByIdAndUpdate(org_id, {
        $set: { "technicalServiceQrMail.to": to, "technicalServiceQrMail.cc": cc },
      });
      return res.status(200).json({ success: true, data: { to, cc } });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save notification emails",
      });
    }
  }

  static async listInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const q = String(req.query.q || "").trim();
      const filter: Record<string, unknown> = {
        org_id,
        status: { $in: ["issued", "paid"] },
      };
      if (q) {
        filter.$or = [
          { invoiceNumber: { $regex: q, $options: "i" } },
          { "client.name": { $regex: q, $options: "i" } },
        ];
      }

      const invoices = await StockInvoice.find(filter)
        .sort({ createdAt: -1 })
        .limit(80)
        .select("invoiceNumber client items status createdAt quotationId")
        .lean();

      const invoiceIds = invoices.map((invoice: any) => String(invoice._id));
      const linked = await InstalledMachine.find({
        org_id,
        invoiceId: { $in: invoiceIds },
      })
        .select("invoiceId productId serialNumber qrToken")
        .lean();

      const linkedByInvoice = new Map<string, any[]>();
      linked.forEach((machine: any) => {
        const key = String(machine.invoiceId);
        const rows = linkedByInvoice.get(key) || [];
        rows.push(machine);
        linkedByInvoice.set(key, rows);
      });

      return res.status(200).json({
        success: true,
        data: invoices.map((invoice: any) => ({
          _id: String(invoice._id),
          invoiceNumber: invoice.invoiceNumber,
          client: invoice.client,
          status: invoice.status,
          createdAt: invoice.createdAt,
          quotationId: invoice.quotationId || "",
          items: (invoice.items || [])
            .filter((item: any) => item.productType !== "service")
            .map((item: any) => {
              const machines = (linkedByInvoice.get(String(invoice._id)) || []).filter(
                (machine: any) => String(machine.productId) === String(item.productId),
              );
              return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                existingMachines: machines.map((machine: any) => ({
                  _id: String(machine._id),
                  serialNumber: machine.serialNumber || "",
                  hasQr: Boolean(machine.qrToken),
                })),
              };
            }),
        })),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list invoices",
      });
    }
  }

  static async ensureCode(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const machine = await InstalledMachine.findOne({
        _id: req.params.machineId,
        org_id,
      });
      if (!machine) {
        return res.status(404).json({ success: false, message: "Machine not found" });
      }

      await ensureMachineToken(machine);
      const origin = resolveQrPublicOrigin(String(req.body?.origin || req.query.origin || ""), req);
      return res.status(200).json({ success: true, data: machineCard(machine, origin) });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate QR code",
      });
    }
  }

  static async createFromInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      const actorId = req.user?.userId;
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const {
        invoiceId,
        productId,
        productName,
        serialNumber,
        installationLocation,
        attendant,
        attendantNumber,
        notes,
        origin,
      } = req.body || {};

      if (!invoiceId || !productId || !productName) {
        return res.status(400).json({
          success: false,
          message: "invoiceId, productId and productName are required",
        });
      }

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id }).lean();
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      const item = (invoice.items || []).find(
        (row: any) => String(row.productId) === String(productId),
      );
      if (!item) {
        return res.status(400).json({ success: false, message: "That product is not on this invoice" });
      }

      const serial = String(serialNumber || "").trim();
      const existingQuery: Record<string, unknown> = {
        org_id,
        invoiceId: String(invoice._id),
        productId: String(productId),
      };
      if (serial) existingQuery.serialNumber = serial;

      let machine = await InstalledMachine.findOne(existingQuery);
      if (!machine) {
        machine = await InstalledMachine.create({
          org_id,
          client: {
            name: invoice.client?.name,
            number: invoice.client?.number,
            location: invoice.client?.location,
          },
          productId: String(productId),
          productName: String(productName || item.productName),
          category: item.productType || "Uncategorized",
          serialNumber: serial,
          installationLocation: String(installationLocation || invoice.client?.location || "").trim(),
          invoiceId: String(invoice._id),
          quotationId: invoice.quotationId || undefined,
          notes: String(notes || "").trim(),
          status: "active",
          attendant: String(attendant || "").trim(),
          attendantNumber: String(attendantNumber || "").trim(),
          createdBy: actorId,
        });
      } else {
        if (installationLocation) machine.installationLocation = String(installationLocation).trim();
        if (attendant) machine.attendant = String(attendant).trim();
        if (attendantNumber) machine.attendantNumber = String(attendantNumber).trim();
        if (serial && !machine.serialNumber) machine.serialNumber = serial;
      }

      await ensureMachineToken(machine);
      const publicBase = resolveQrPublicOrigin(String(origin || ""), req);
      return res.status(201).json({ success: true, data: machineCard(machine, publicBase) });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create machine QR from invoice",
      });
    }
  }

  static async createManual(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      const actorId = req.user?.userId;
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const {
        clientName,
        clientNumber,
        clientLocation,
        productName,
        productId,
        category,
        serialNumber,
        installationLocation,
        attendant,
        attendantNumber,
        notes,
        origin,
      } = req.body || {};

      if (!String(clientName || "").trim() || !String(productName || "").trim()) {
        return res.status(400).json({
          success: false,
          message: "Client name and machine name are required",
        });
      }

      const machine = await InstalledMachine.create({
        org_id,
        client: {
          name: String(clientName).trim(),
          number: String(clientNumber || "").trim(),
          location: String(clientLocation || "").trim(),
        },
        productId: String(productId || "").trim() || `manual-qr-${Date.now()}`,
        productName: String(productName).trim(),
        category: String(category || "Uncategorized").trim(),
        serialNumber: String(serialNumber || "").trim(),
        installationLocation: String(installationLocation || clientLocation || "").trim(),
        notes: String(notes || "").trim(),
        status: "active",
        attendant: String(attendant || "").trim(),
        attendantNumber: String(attendantNumber || "").trim(),
        createdBy: actorId,
      });

      await ensureMachineToken(machine);
      const publicBase = resolveQrPublicOrigin(String(origin || ""), req);
      return res.status(201).json({ success: true, data: machineCard(machine, publicBase) });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save machine and QR code",
      });
    }
  }

  static async listReports(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const type = String(req.query.type || "").trim();
      const status = String(req.query.status || "").trim();
      const limit = Math.min(200, Math.max(1, Number(req.query.limit || 80) || 80));
      const filter: Record<string, unknown> = { org_id };
      if (REPORT_TYPES.includes(type as any)) filter.type = type;
      if (REPORT_STATUSES.includes(status as any)) filter.status = status;

      const reports = await MachineQrReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const openCount = await MachineQrReport.countDocuments({ org_id, status: "open" });

      return res.status(200).json({
        success: true,
        data: reports,
        meta: { openCount, total: reports.length },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list reports",
      });
    }
  }

  static async updateReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const status = String(req.body?.status || "").trim();
      if (!REPORT_STATUSES.includes(status as any)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const report = await MachineQrReport.findOneAndUpdate(
        { _id: req.params.id, org_id },
        { $set: { status } },
        { new: true },
      );
      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }

      if (report.ticketId && status === "closed") {
        await Ticket.updateOne(
          { _id: report.ticketId, org_id },
          { $set: { status: "Closed", resolvedDate: new Date() } },
        );
      }

      return res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update report",
      });
    }
  }
}
