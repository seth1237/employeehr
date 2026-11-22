import crypto from "crypto";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { Company } from "../models/Company";
import { InstalledMachine } from "../models/InstalledMachine";
import { MachineQrReport } from "../models/MachineQrReport";
import { StockInvoice } from "../models/StockInvoice";
import { StockProduct } from "../models/StockProduct";
import { Ticket } from "../models/Ticket";

const REPORT_TYPES = ["service", "breakdown", "product_order"] as const;
const REPORT_STATUSES = ["open", "in_progress", "closed"] as const;
const URGENCY = ["low", "normal", "high", "critical"] as const;

function publicOrigin(req: Request) {
  const forwarded = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwarded || String(req.headers.host || "").trim();
  const proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() ||
    (String(req.protocol || "https").includes("https") ? "https" : "http");
  if (!host) return "";
  return `${proto}://${host}`;
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

      const [company, products] = await Promise.all([
        Company.findById(machine.org_id)
          .select("name logo primaryColor secondaryColor phone")
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
      ]);

      return res.status(200).json({
        success: true,
        data: {
          machine: {
            productName: machine.productName,
            serialNumber: machine.serialNumber || "",
            clientName: machine.client?.name || "",
            location: machine.installationLocation || machine.client?.location || "",
            attendant: machine.attendant || "",
          },
          company: company
            ? {
                name: company.name,
                logo: company.logo || "",
                primaryColor: company.primaryColor || "#0f766e",
                secondaryColor: company.secondaryColor || "#0ea5e9",
                phone: company.phone || "",
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

      const origin = String(req.query.origin || "").trim() || publicOrigin(req);
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
      const origin = String(req.body?.origin || req.query.origin || "").trim() || publicOrigin(req);
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
      const publicBase = String(origin || "").trim() || publicOrigin(req);
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
      const publicBase = String(origin || "").trim() || publicOrigin(req);
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
