import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { InstalledMachine } from "../models/InstalledMachine";
import { MachineService } from "../models/MachineService";
import { StockInvoice } from "../models/StockInvoice";

function daysUntil(date?: Date | string | null): number | null {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function classifyServiceStatus(service: any, givenDate = new Date()) {
  if (service.completedDate) return "done";
  const diff = daysUntil(service.scheduledDate);
  if (diff === null) return "pending";
  if (diff <= 0) return "due";
  return diff <= 7 ? "coming-soon" : "pending";
}

async function populateMachineInfo(orgId: string, services: any[]) {
  const machineIds = Array.from(
    new Set(services.map((service) => String(service.machineId || "")).filter(Boolean)),
  );

  const machines = machineIds.length
    ? await InstalledMachine.find({ org_id: orgId, _id: { $in: machineIds } })
        .select("productName serialNumber client")
        .lean()
    : [];

  const machineMap = new Map(
    machines.map((machine: any) => [String(machine._id), machine]),
  );

  return services.map((service) => ({
    ...service,
    machine: machineMap.get(String(service.machineId))
      ? {
          _id: String(service.machineId),
          productName: machineMap.get(String(service.machineId))?.productName || "",
          serialNumber: machineMap.get(String(service.machineId))?.serialNumber || "",
          client: machineMap.get(String(service.machineId))?.client || null,
        }
      : null,
  }));
}

async function syncMachineNextServiceDate(orgId: string, machineId: string) {
  const openServices = await MachineService.find({
    org_id: orgId,
    machineId,
    $or: [{ completedDate: null }, { completedDate: { $exists: false } }],
  })
    .sort({ scheduledDate: 1, createdAt: 1 })
    .lean();

  const nextScheduled = openServices.find((service) => service.scheduledDate);
  await InstalledMachine.findOneAndUpdate(
    { _id: machineId, org_id: orgId },
    {
      $set: {
        nextServiceDate: nextScheduled?.scheduledDate || null,
      },
    },
  );
}

function normalizeDate(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function generateDocumentNumber(prefix: string) {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${ts}-${rand}`;
}

async function createServiceInvoice(orgId: string, actorId: string, machine: any, service: any) {
  const serviceName = String(service.serviceType || "Service").trim() || "Service";
  const clientName = String(machine?.client?.name || "Walk-in Client").trim();
  const clientNumber = String(machine?.client?.number || "WALK-IN").trim();
  const clientLocation = String(machine?.client?.location || "Walk-in").trim();
  const amount = Number(service.cost || 0);

  return StockInvoice.create({
    org_id: orgId,
    invoiceNumber: generateDocumentNumber("INV"),
    deliveryNoteNumber: generateDocumentNumber("DN"),
    client: {
      name: clientName,
      number: clientNumber,
      location: clientLocation,
    },
    items: [
      {
        productId: String(machine?._id || "service"),
        productName: machine?.productName || "Machine Service",
        quantity: 1,
        unitPrice: amount,
        lineTotal: amount,
        description: `${serviceName} for ${machine?.productName || "machine"}`,
        productType: "service",
        isOutsourced: false,
      },
    ],
    subTotal: amount,
    status: "issued",
    dispatch: {
      status: "not_assigned",
      packingItems: [],
      packingCompleted: true,
      inquiries: [],
    },
    createdBy: String(actorId),
  });
}

export class MachineServiceController {
  static async listMachineServices(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { machineId, status, withinDays } = req.query as Record<string, string>;
      const routeMachineId = String(req.params.id || "").trim();
      const query: any = { org_id };
      const resolvedMachineId = machineId || routeMachineId;
      if (resolvedMachineId) query.machineId = String(resolvedMachineId).trim();

      const services = await MachineService.find(query)
        .sort({ scheduledDate: 1, createdAt: -1 })
        .lean();

      let filtered = services;
      if (status) {
        const normalizedStatus = String(status).toLowerCase();
        const lookAheadDays = Number(withinDays || 7);
        filtered = services.filter((service) => {
          const classification = classifyServiceStatus(service);
          if (normalizedStatus === "pending") {
            return classification !== "done";
          }
          if (normalizedStatus === "due") {
            return classification === "due";
          }
          if (normalizedStatus === "coming-soon") {
            return classification === "coming-soon";
          }
          if (normalizedStatus === "done") {
            return classification === "done";
          }
          return true;
        });
        if (normalizedStatus === "coming-soon") {
          filtered = services.filter((service) => {
            const diff = daysUntil(service.scheduledDate);
            return (
              !service.completedDate &&
              diff !== null &&
              diff > 0 &&
              diff <= lookAheadDays
            );
          });
        }
      }

      const data = await populateMachineInfo(org_id, filtered);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch machine services",
      });
    }
  }

  static async getMachineService(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const serviceId = String(req.params.id || "").trim();
      if (!serviceId) {
        return res.status(400).json({ success: false, message: "Service id required" });
      }

      const service = await MachineService.findOne({ _id: serviceId, org_id }).lean();
      if (!service) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }

      const [enriched] = await populateMachineInfo(org_id, [service]);
      return res.status(200).json({ success: true, data: enriched });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch machine service",
      });
    }
  }

  static async createMachineService(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { machineId, serviceType, scheduledDate, completedDate, technician, cost, notes } = req.body || {};
      if (!machineId) {
        return res.status(400).json({ success: false, message: "machineId is required" });
      }

      const machine = await InstalledMachine.findOne({ _id: machineId, org_id }).lean();
      if (!machine) {
        return res.status(404).json({ success: false, message: "Installed machine not found" });
      }

      const created = await MachineService.create({
        org_id,
        machineId: String(machineId).trim(),
        serviceType: serviceType ? String(serviceType).trim() : "",
        scheduledDate: normalizeDate(scheduledDate),
        completedDate: normalizeDate(completedDate) ?? null,
        technician: technician ? String(technician).trim() : "",
        cost: cost != null ? Number(cost) : 0,
        notes: notes ? String(notes).trim() : "",
      });

      try {
        await createServiceInvoice(org_id, String(req.user?.userId || "system"), machine, created);
      } catch (invoiceError: any) {
        console.error("Failed to create service invoice", invoiceError);
      }

      await syncMachineNextServiceDate(org_id, String(machineId).trim());
      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create machine service",
      });
    }
  }

  static async updateMachineService(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const serviceId = String(req.params.id || "").trim();
      if (!serviceId) {
        return res.status(400).json({ success: false, message: "Service id required" });
      }

      const allowed = ["machineId", "serviceType", "scheduledDate", "completedDate", "technician", "cost", "notes"];
      const update: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (key === "scheduledDate" || key === "completedDate") {
            if (req.body[key] === null) {
              update[key] = null;
            } else {
              update[key] = normalizeDate(req.body[key]);
            }
          } else if (key === "cost") {
            update[key] = req.body[key] != null ? Number(req.body[key]) : 0;
          } else {
            update[key] = String(req.body[key]).trim();
          }
        }
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ success: false, message: "No updates provided" });
      }

      const updated = await MachineService.findOneAndUpdate(
        { _id: serviceId, org_id },
        { $set: update },
        { new: true },
      ).lean();
      if (!updated) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }

      if (updated.machineId) {
        await syncMachineNextServiceDate(org_id, String(updated.machineId));
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update machine service",
      });
    }
  }

  static async deleteMachineService(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const serviceId = String(req.params.id || "").trim();
      if (!serviceId) {
        return res.status(400).json({ success: false, message: "Service id required" });
      }

      const deleted = await MachineService.findOneAndDelete({ _id: serviceId, org_id }).lean();
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }

      if (deleted.machineId) {
        await syncMachineNextServiceDate(org_id, String(deleted.machineId));
      }

      return res.status(200).json({ success: true, message: "Service deleted" });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete machine service",
      });
    }
  }
}
