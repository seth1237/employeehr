import type { Response } from "express";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import type { AuthenticatedRequest } from "../middleware/auth";
import { InstalledMachine } from "../models/InstalledMachine";
import { MachineService } from "../models/MachineService";
import { Ticket } from "../models/Ticket";
import { MaintenancePlan } from "../models/MaintenancePlan";
import { CalibrationRecord } from "../models/CalibrationRecord";
import { VendorContract } from "../models/VendorContract";
import { StockExpenseClaim } from "../models/StockExpenseClaim";
import { StockClient } from "../models/StockClient";
import { User } from "../models/User";
import {
  deriveWorkOrderStatus,
  isOpenWorkOrderStatus,
  nextWoNumber,
} from "../lib/workOrder";

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function normalizeDate(value: unknown) {
  if (value === null) return null;
  if (value === undefined || value === "") return undefined;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function displayName(user?: { first_name?: string; last_name?: string; firstName?: string; lastName?: string; email?: string }) {
  const first = user?.first_name || user?.firstName || "";
  const last = user?.last_name || user?.lastName || "";
  return `${first} ${last}`.trim() || user?.email || "";
}

function userAliases(user?: any, userId?: string) {
  const aliases = new Set<string>();
  const add = (value?: unknown) => {
    const text = String(value || "").trim().toLowerCase();
    if (text) aliases.add(text);
  };
  add(userId);
  add(user?._id);
  add(user?.email);
  add(displayName(user));
  return aliases;
}

function assignedToUser(
  row: { technicianId?: string | null; technician?: string | null },
  userId: string,
  aliases: Set<string>,
) {
  const techId = String(row.technicianId || "").trim();
  if (techId) {
    return techId === userId || aliases.has(techId.toLowerCase());
  }
  const technician = String(row.technician || "").trim().toLowerCase();
  if (technician) return aliases.has(technician);
  return true;
}

function resolveTechnicianId(
  value: string,
  users: Array<{ _id?: unknown; firstName?: string; lastName?: string; email?: string }>,
) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[0-9a-fA-F]{24}$/.test(raw)) return raw;
  const needle = raw.toLowerCase();
  const match = users.find((user) => {
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase();
    return name === needle || String(user.email || "").toLowerCase() === needle;
  });
  return match?._id ? String(match._id) : "";
}

async function ensureInstallationWorkOrders(orgId: string) {
  const pending = await InstalledMachine.find({
    org_id: orgId,
    status: "installation_pending",
  })
    .select("_id productName installedBy technicianId installationDate client")
    .lean();
  if (!pending.length) return;

  const machineIds = pending.map((row) => String(row._id));
  const existing = await MachineService.find({
    org_id: orgId,
    machineId: { $in: machineIds },
    type: "installation",
    status: { $nin: ["completed", "cancelled"] },
  })
    .select("machineId")
    .lean();
  const hasOpen = new Set(existing.map((row) => String(row.machineId)));
  const missing = pending.filter((row) => !hasOpen.has(String(row._id)));
  if (!missing.length) return;

  const users = await User.find({ org_id: orgId })
    .select("firstName lastName email")
    .lean();

  for (const machine of missing) {
    const assigned =
      resolveTechnicianId(String(machine.technicianId || ""), users) ||
      resolveTechnicianId(String(machine.installedBy || ""), users);
    const woNumber = await nextWoNumber(orgId);
    try {
      await MachineService.create({
        org_id: orgId,
        machineId: String(machine._id),
        woNumber,
        type: "installation",
        status: assigned ? "assigned" : "open",
        priority: "medium",
        serviceType: "Installation",
        scheduledDate: machine.installationDate || new Date(),
        technician: String(machine.installedBy || "").trim(),
        technicianId: assigned,
        notes: machine.client?.contactPerson
          ? `Site contact: ${machine.client.contactPerson}`
          : "",
        checklist: [
          { item: "Record machine serial number", done: false },
          { item: "Record person left in charge of the machine", done: false },
          { item: "Photograph and upload the job card", done: false },
        ],
      });
    } catch (error) {
      console.error("Failed to backfill installation work order", String(machine._id), error);
    }
  }
}

function escapeRegex(value: string) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function saveJobCardPhotoWebp(file?: Express.Multer.File) {
  if (!file?.buffer) return undefined;
  const filename = `jobcard-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const uploadDir = path.join(process.cwd(), "uploads/job-cards");
  await fs.mkdir(uploadDir, { recursive: true });
  await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toFile(path.join(uploadDir, filename));
  return `/uploads/job-cards/${filename}`;
}

async function upsertMachineContact(
  orgId: string,
  actorId: string,
  machine: any,
  contact: { name: string; role?: string; phone?: string },
) {
  const sourceName = String(machine?.client?.name || "").trim();
  const contactName = String(contact?.name || "").trim();
  if (!sourceName || !contactName) return;

  const sourceNumber = String(machine?.client?.number || "").trim() || "n/a";
  const sourceLocation =
    String(machine?.client?.location || machine?.installationLocation || "").trim() ||
    "n/a";
  const role = String(contact.role || "Attendant").trim() || "Attendant";
  const phone = String(contact.phone || "").trim();

  let profile = await StockClient.findOne({
    org_id: orgId,
    sourceName,
    sourceNumber,
    sourceLocation,
  });
  if (!profile) {
    profile = await StockClient.findOne({
      org_id: orgId,
      sourceName: new RegExp(`^${escapeRegex(sourceName)}$`, "i"),
    });
  }

  const nextContact = {
    role,
    name: contactName,
    ...(phone ? { phone } : {}),
    isActive: true,
  };

  if (profile) {
    const contacts = Array.isArray(profile.contacts) ? [...profile.contacts] : [];
    const idx = contacts.findIndex(
      (row: any) =>
        String(row?.name || "").trim().toLowerCase() === contactName.toLowerCase(),
    );
    if (idx >= 0) {
      contacts[idx] = {
        ...((contacts[idx] as any)?.toObject?.() || contacts[idx]),
        ...nextContact,
        phone: phone || (contacts[idx] as any).phone,
      };
    } else {
      contacts.push(nextContact as any);
    }
    profile.contacts = contacts as any;
    if (!profile.contactPerson) profile.contactPerson = contactName;
    profile.updatedBy = actorId;
    await profile.save();
    return;
  }

  await StockClient.create({
    org_id: orgId,
    sourceName,
    sourceNumber,
    sourceLocation,
    legalName: sourceName,
    contactPerson: contactName,
    contacts: [nextContact],
    groupIds: [],
    createdBy: actorId,
    updatedBy: actorId,
  });
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (value === true || value === false) return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "true" || text === "yes" || text === "1") return true;
  if (text === "false" || text === "no" || text === "0") return false;
  return undefined;
}

function isInstallationWorkOrder(row?: { type?: string | null; serviceType?: string | null }) {
  return row?.type === "installation" || /install/i.test(String(row?.serviceType || ""));
}

function normalizeCostLines(value: unknown) {
  const parsed = parseMaybeJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row: any) => ({
      purpose: String(row?.purpose || "").trim(),
      amount: Number(row?.amount || 0) || 0,
    }))
    .filter((row) => row.purpose || row.amount);
}

async function enrichWorkOrders(orgId: string, services: any[]) {
  const machineIds = Array.from(
    new Set(services.map((row) => String(row.machineId || "")).filter(Boolean)),
  );
  const machines = machineIds.length
    ? await InstalledMachine.find({ org_id: orgId, _id: { $in: machineIds } })
        .select(
          "productName serialNumber client assetTag assetClass criticality manufacturer model warrantyUntil nextServiceDate installationLocation status attendant attendantNumber attendantRole photoUrl",
        )
        .lean()
    : [];
  const machineMap = new Map(machines.map((row: any) => [String(row._id), row]));

  return services.map((row) => {
    const machine = machineMap.get(String(row.machineId)) || null;
    return {
      ...row,
      status: deriveWorkOrderStatus(row),
      machine: machine
        ? {
            _id: String(row.machineId),
            productName: machine.productName,
            serialNumber: machine.serialNumber,
            client: machine.client,
            assetTag: machine.assetTag,
            assetClass: machine.assetClass,
            criticality: machine.criticality,
            manufacturer: machine.manufacturer,
            model: machine.model,
            warrantyUntil: machine.warrantyUntil,
            nextServiceDate: machine.nextServiceDate,
            installationLocation: machine.installationLocation,
            status: machine.status,
            attendant: machine.attendant,
            attendantNumber: machine.attendantNumber,
            attendantRole: machine.attendantRole,
            photoUrl: machine.photoUrl,
          }
        : null,
    };
  });
}

async function ensureWoNumber(orgId: string, service: any) {
  if (service.woNumber) return service;
  const woNumber = await nextWoNumber(orgId);
  const updated = await MachineService.findOneAndUpdate(
    { _id: service._id, org_id: orgId, woNumber: { $in: [null, ""] } },
    { $set: { woNumber } },
    { new: true },
  ).lean();
  return updated || { ...service, woNumber };
}

export class EngineeringController {
  static async dashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      const userId = String(req.user?.userId || "");
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      await ensureInstallationWorkOrders(org_id);

      const [orders, tickets, assets, plans, me] = await Promise.all([
        MachineService.find({ org_id }).lean(),
        Ticket.find({
          org_id,
          status: { $nin: ["Closed", "Dismissed", "Resolved"] },
        })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        InstalledMachine.countDocuments({ org_id, isActive: true }),
        MaintenancePlan.countDocuments({
          org_id,
          active: true,
          nextDueAt: { $lte: endOfDay() },
        }),
        User.findById(userId).select("firstName lastName email").lean(),
      ]);

      const today = startOfDay();
      const todayEnd = endOfDay();
      const aliases = userAliases(me, userId);
      const mine = (row: any) => assignedToUser(row, userId, aliases);

      const shaped = orders.map((row) => ({
        ...row,
        status: deriveWorkOrderStatus(row),
      }));
      const open = shaped.filter((row) => isOpenWorkOrderStatus(row.status));
      const myOpen = open.filter(mine);
      const overdue = myOpen.filter(
        (row) => row.scheduledDate && new Date(row.scheduledDate) < today,
      );
      const dueToday = myOpen.filter((row) => {
        if (!row.scheduledDate) return false;
        const due = new Date(row.scheduledDate);
        return due >= today && due <= todayEnd;
      });
      const waitingParts = myOpen.filter((row) => row.status === "waiting_parts");
      const unassigned = open.filter((row) => !row.technicianId);
      const myMachineIds = Array.from(
        new Set(myOpen.map((row) => String(row.machineId || "")).filter(Boolean)),
      );
      const [pendingInstallations, myMachines] = await Promise.all([
        InstalledMachine.find({
          org_id,
          status: "installation_pending",
        })
          .select("productName serialNumber client status installationDate installedBy technicianId")
          .sort({ installationDate: 1, updatedAt: -1 })
          .limit(20)
          .lean(),
        myMachineIds.length
          ? InstalledMachine.find({ org_id, _id: { $in: myMachineIds } })
              .select("productName serialNumber client status installationDate nextServiceDate")
              .lean()
          : Promise.resolve([]),
      ]);
      const aliasesList = Array.from(aliases);
      const myPending = pendingInstallations.filter((machine: any) => {
        const techId = String(machine.technicianId || "").trim();
        if (techId) return techId === userId || aliases.has(techId.toLowerCase());
        const installedBy = String(machine.installedBy || "").trim().toLowerCase();
        return !installedBy || aliasesList.includes(installedBy);
      });

      return res.status(200).json({
        success: true,
        data: {
          assets,
          myOpen: myOpen.length,
          overdue: overdue.length,
          dueToday: dueToday.length,
          waitingParts: waitingParts.length,
          unassigned: unassigned.length,
          openRequests: tickets.filter(
            (ticket: any) =>
              !ticket.assignedTechnician_id ||
              String(ticket.assignedTechnician_id) === userId,
          ).length,
          plansDue: plans,
          dueTodayOrders: dueToday.slice(0, 8),
          overdueOrders: overdue.slice(0, 8),
          pendingInstallations: myPending.slice(0, 8),
          myMachines: myMachines.slice(0, 8),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load engineering dashboard",
      });
    }
  }

  static async listWorkOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      const userId = String(req.user?.userId || "");
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      await ensureInstallationWorkOrders(org_id);

      const filter = String(req.query.filter || "mine");
      const status = String(req.query.status || "").trim();
      const query: Record<string, any> = { org_id };
      if (req.query.assetId) query.machineId = String(req.query.assetId);
      if (req.query.type) query.type = String(req.query.type);
      if (filter === "installations") query.type = "installation";

      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;
      if (from && !Number.isNaN(from.getTime())) {
        query.scheduledDate = { ...(query.scheduledDate || {}), $gte: from };
      }
      if (to && !Number.isNaN(to.getTime())) {
        query.scheduledDate = { ...(query.scheduledDate || {}), $lte: to };
      }

      const [rows, me] = await Promise.all([
        MachineService.find(query).sort({ scheduledDate: 1, createdAt: -1 }).lean(),
        userId
          ? User.findById(userId).select("firstName lastName email").lean()
          : Promise.resolve(null),
      ]);

      const aliases = userAliases(me, userId);
      let list = rows.map((row) => ({ ...row, status: deriveWorkOrderStatus(row) }));
      if (filter === "mine" || filter === "installations") {
        list = list.filter((row) => assignedToUser(row, userId, aliases));
      } else if (filter === "unassigned") {
        list = list.filter((row) => !row.technicianId && !String(row.technician || "").trim());
      } else if (filter === "pending") {
        list = list.filter((row) => isOpenWorkOrderStatus(row.status));
      }
      if (status === "overdue") {
        const today = startOfDay();
        list = list.filter(
          (row) =>
            isOpenWorkOrderStatus(row.status) &&
            row.scheduledDate &&
            new Date(row.scheduledDate) < today,
        );
      } else if (status) {
        list = list.filter((row) => row.status === status);
      }

      const data = await enrichWorkOrders(org_id, list);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list work orders",
      });
    }
  }

  static async getWorkOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const id = String(req.params.id || "").trim();
      const row = await MachineService.findOne({ _id: id, org_id }).lean();
      if (!row) {
        return res.status(404).json({ success: false, message: "Work order not found" });
      }
      const numbered = await ensureWoNumber(org_id, row);
      const [enriched] = await enrichWorkOrders(org_id, [numbered]);
      let request = null;
      if (enriched.requestId) {
        request = await Ticket.findOne({ _id: enriched.requestId, org_id }).lean();
      }
      const contracts = enriched.machineId
        ? await VendorContract.find({
            org_id,
            assetIds: enriched.machineId,
          })
            .sort({ endDate: -1 })
            .limit(5)
            .lean()
        : [];
      return res.status(200).json({
        success: true,
        data: { ...enriched, request, contracts },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load work order",
      });
    }
  }

  static async createWorkOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      const userId = String(req.user?.userId || "");
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const body = req.body || {};
      const machineId = String(body.machineId || body.assetId || "").trim();
      if (!machineId) {
        return res.status(400).json({ success: false, message: "machineId is required" });
      }
      const machine = await InstalledMachine.findOne({ _id: machineId, org_id }).lean();
      if (!machine) {
        return res.status(404).json({ success: false, message: "Asset not found" });
      }

      const technicianId = body.technicianId
        ? String(body.technicianId).trim()
        : userId;
      const woNumber = await nextWoNumber(org_id);
      const created = await MachineService.create({
        org_id,
        machineId,
        woNumber,
        type: body.type || "corrective",
        status: technicianId ? "assigned" : "open",
        priority: body.priority || "medium",
        serviceType: String(body.serviceType || body.title || "Service").trim(),
        scheduledDate: normalizeDate(body.scheduledDate),
        technician: String(body.technician || req.user?.email || "").trim(),
        technicianId,
        cost: body.cost != null ? Number(body.cost) : 0,
        notes: String(body.notes || "").trim(),
        requestId: body.requestId ? String(body.requestId) : undefined,
        planId: body.planId ? String(body.planId) : undefined,
        downtimeMinutes: body.downtimeMinutes != null ? Number(body.downtimeMinutes) : 0,
        checklist: Array.isArray(body.checklist) ? body.checklist : [],
        parts: Array.isArray(body.parts) ? body.parts : [],
      });

      const [enriched] = await enrichWorkOrders(org_id, [created.toObject()]);
      return res.status(201).json({ success: true, data: enriched });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create work order",
      });
    }
  }

  static async updateWorkOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const id = String(req.params.id || "").trim();
      const allowed = [
        "machineId",
        "type",
        "status",
        "priority",
        "serviceType",
        "scheduledDate",
        "startedAt",
        "completedDate",
        "technician",
        "technicianId",
        "cost",
        "costLines",
        "notes",
        "requestId",
        "planId",
        "downtimeMinutes",
        "machineOkay",
        "failureCode",
        "causeCode",
        "checklist",
        "parts",
        "attachments",
        "helpers",
      ];
      const update: Record<string, unknown> = {};
      for (const key of allowed) {
        if (req.body?.[key] === undefined) continue;
        if (key === "scheduledDate" || key === "startedAt" || key === "completedDate") {
          update[key] = req.body[key] === null ? null : normalizeDate(req.body[key]);
        } else if (key === "cost" || key === "downtimeMinutes") {
          update[key] = Number(req.body[key] || 0);
        } else if (key === "machineOkay") {
          const flag = parseBooleanFlag(req.body[key]);
          if (flag !== undefined) update.machineOkay = flag;
        } else if (key === "costLines") {
          const lines = normalizeCostLines(req.body[key]);
          update.costLines = lines;
          if (req.body.cost === undefined) {
            update.cost = lines.reduce((sum, line) => sum + line.amount, 0);
          }
        } else {
          update[key] = req.body[key];
        }
      }
      if (update.completedDate && !update.status) update.status = "completed";
      if (update.startedAt && !update.status && !update.completedDate) {
        update.status = "in_progress";
      }
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ success: false, message: "No updates provided" });
      }

      const updated = await MachineService.findOneAndUpdate(
        { _id: id, org_id },
        { $set: update },
        { new: true },
      ).lean();
      if (!updated) {
        return res.status(404).json({ success: false, message: "Work order not found" });
      }
      const numbered = await ensureWoNumber(org_id, updated);
      if (numbered.machineId) {
        const openServices = await MachineService.find({
          org_id,
          machineId: numbered.machineId,
          status: { $nin: ["completed", "cancelled"] },
        })
          .sort({ scheduledDate: 1 })
          .lean();
        const next = openServices.find((row) => row.scheduledDate);
        await InstalledMachine.findOneAndUpdate(
          { _id: numbered.machineId, org_id },
          { $set: { nextServiceDate: next?.scheduledDate || null } },
        );
      }
      const [enriched] = await enrichWorkOrders(org_id, [numbered]);
      return res.status(200).json({ success: true, data: enriched });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update work order",
      });
    }
  }

  static async startWorkOrder(req: AuthenticatedRequest, res: Response) {
    const me = req.user?.userId
      ? await User.findById(req.user.userId).select("firstName lastName email").lean()
      : null
    req.body = {
      ...(req.body || {}),
      startedAt: new Date().toISOString(),
      status: "in_progress",
      technicianId: req.body?.technicianId || req.user?.userId,
      technician: req.body?.technician || displayName(me as any) || undefined,
    };
    return EngineeringController.updateWorkOrder(req, res);
  }

  static async completeWorkOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      const userId = String(req.user?.userId || "");
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const id = String(req.params.id || "").trim();
      const wo = await MachineService.findOne({ _id: id, org_id });
      if (!wo) {
        return res.status(404).json({ success: false, message: "Work order not found" });
      }

      const body = req.body || {};
      const file = (req as AuthenticatedRequest & { file?: Express.Multer.File }).file;
      const photoUrl = await saveJobCardPhotoWebp(file);

      if (isInstallationWorkOrder(wo)) {
        const serialNumber = String(body.serialNumber || "").trim();
        const attendant = String(body.attendant || "").trim();
        const attendantRole = String(body.attendantRole || "Attendant").trim() || "Attendant";
        const attendantNumber = String(body.attendantNumber || "").trim();
        if (!serialNumber) {
          return res.status(400).json({
            success: false,
            message: "Machine serial number is required to complete the installation",
          });
        }
        if (!attendant) {
          return res.status(400).json({
            success: false,
            message: "Person left in charge of the machine is required",
          });
        }

        const machine = await InstalledMachine.findOne({ _id: wo.machineId, org_id });
        if (!machine) {
          return res.status(404).json({ success: false, message: "Installed machine not found" });
        }
        if (!photoUrl && !machine.photoUrl) {
          return res.status(400).json({
            success: false,
            message: "Upload a photo of the job card to complete the installation",
          });
        }

        const machineOkay = parseBooleanFlag(body.machineOkay);
        if (machineOkay === undefined) {
          return res.status(400).json({
            success: false,
            message: "Select whether the machine is okay after installation",
          });
        }

        machine.serialNumber = serialNumber;
        machine.attendant = attendant;
        machine.attendantRole = attendantRole;
        machine.attendantNumber = attendantNumber || undefined;
        if (photoUrl) machine.photoUrl = photoUrl;
        machine.status = machineOkay ? "active" : "maintenance";
        await machine.save();
        wo.machineOkay = machineOkay;

        try {
          await upsertMachineContact(org_id, userId, machine, {
            name: attendant,
            role: attendantRole,
            phone: attendantNumber,
          });
        } catch (error) {
          console.error("Failed to save person-in-charge as client contact", error);
        }

        const defaultChecks = [
          "Record machine serial number",
          "Record person left in charge of the machine",
          "Photograph and upload the job card",
          machineOkay ? "Machine okay after installation" : "Machine needs attention after installation",
        ];
        const existing = Array.isArray(wo.checklist) ? wo.checklist : [];
        const byItem = new Map(existing.map((row) => [String(row.item || "").toLowerCase(), row]));
        wo.checklist = defaultChecks.map((item) => ({
          item,
          done: true,
          note: byItem.get(item.toLowerCase())?.note || "",
        }));
      }

      if (photoUrl) {
        wo.attachments = Array.from(new Set([...(wo.attachments || []), photoUrl]));
      }
      if (!wo.startedAt) wo.startedAt = new Date();
      wo.completedDate = new Date();
      wo.status = "completed";
      if (body.notes != null) wo.notes = String(body.notes);
      const costLines = body.costLines !== undefined ? normalizeCostLines(body.costLines) : undefined;
      if (costLines) {
        wo.costLines = costLines as any;
        wo.cost = costLines.reduce((sum, line) => sum + line.amount, 0);
      } else if (body.cost != null && body.cost !== "") {
        wo.cost = Number(body.cost || 0);
      }
      if (!isInstallationWorkOrder(wo) && body.downtimeMinutes != null && body.downtimeMinutes !== "") {
        wo.downtimeMinutes = Number(body.downtimeMinutes || 0);
      }
      const parsedChecklist = parseMaybeJson(body.checklist);
      if (wo.type !== "installation" && Array.isArray(parsedChecklist)) {
        wo.checklist = parsedChecklist as any;
      }
      if (!wo.technicianId) wo.technicianId = userId;
      await wo.save();

      const numbered = await ensureWoNumber(org_id, wo.toObject());
      const [enriched] = await enrichWorkOrders(org_id, [numbered]);
      return res.status(200).json({ success: true, data: enriched });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to complete work order",
      });
    }
  }

  static async listRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id || req.org_id;
      const userId = String(req.user?.userId || "");
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const filter: Record<string, any> = {
        org_id,
        status: { $nin: ["Closed", "Dismissed", "Resolved"] },
      };
      const mine = String(req.query.filter || "mine");
      if (mine === "mine") {
        filter.$or = [
          { assignedTechnician_id: userId },
          { assignedTechnician_id: { $in: [null, ""] } },
        ];
      }
      const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).lean();
      const machineIds = tickets
        .map((row: any) => String(row.machine_id || ""))
        .filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
      const machines = machineIds.length
        ? await InstalledMachine.find({ org_id, _id: { $in: machineIds } })
            .select("productName serialNumber client assetTag")
            .lean()
        : [];
      const machineMap = new Map(machines.map((row: any) => [String(row._id), row]));
      const data = tickets.map((ticket: any) => ({
        ...ticket,
        machine: machineMap.get(String(ticket.machine_id)) || ticket.machine_id || null,
      }));
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list requests",
      });
    }
  }

  static async convertRequestToWorkOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id || req.org_id;
      const userId = String(req.user?.userId || "");
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const id = String(req.params.id || "").trim();
      const ticket = await Ticket.findOne({ _id: id, org_id });
      if (!ticket) {
        return res.status(404).json({ success: false, message: "Request not found" });
      }
      if (ticket.serviceId) {
        const existing = await MachineService.findOne({
          _id: ticket.serviceId,
          org_id,
        }).lean();
        if (existing) {
          const [enriched] = await enrichWorkOrders(org_id, [existing]);
          return res.status(200).json({ success: true, data: enriched, alreadyLinked: true });
        }
      }
      const machineId = String(req.body?.machineId || ticket.machine_id || "").trim();
      if (!machineId) {
        return res.status(400).json({
          success: false,
          message: "This request has no machine. Choose an asset first.",
        });
      }
      const technicianId = userId;
      const woNumber = await nextWoNumber(org_id);
      const created = await MachineService.create({
        org_id,
        machineId,
        woNumber,
        type: "corrective",
        status: "assigned",
        priority: req.body?.priority || "high",
        serviceType: String(ticket.title || "Corrective service").trim(),
        scheduledDate: normalizeDate(req.body?.scheduledDate) || ticket.scheduledDate || new Date(),
        technician: displayName(req.user as any),
        technicianId,
        notes: String(ticket.description || "").trim(),
        requestId: String(ticket._id),
      });

      ticket.serviceId = String(created._id);
      ticket.assignedTechnician_id = userId;
      ticket.status = "Scheduled";
      await ticket.save();

      const [enriched] = await enrichWorkOrders(org_id, [created.toObject()]);
      return res.status(201).json({ success: true, data: enriched });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to convert request",
      });
    }
  }

  static async assetHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const id = String(req.params.id || "").trim();
      const [asset, orders, tickets, calibrations, contracts] = await Promise.all([
        InstalledMachine.findOne({ _id: id, org_id }).lean(),
        MachineService.find({ org_id, machineId: id }).sort({ createdAt: -1 }).lean(),
        Ticket.find({ org_id, machine_id: id }).sort({ createdAt: -1 }).lean(),
        CalibrationRecord.find({ org_id, assetId: id }).sort({ performedAt: -1 }).lean(),
        VendorContract.find({ org_id, assetIds: id }).sort({ endDate: -1 }).lean(),
      ]);
      if (!asset) {
        return res.status(404).json({ success: false, message: "Asset not found" });
      }
      return res.status(200).json({
        success: true,
        data: { asset, workOrders: orders, tickets, calibrations, contracts },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load asset history",
      });
    }
  }

  static async listPlans(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const query: Record<string, any> = { org_id };
      if (req.query.assetId) query.assetId = String(req.query.assetId);
      const data = await MaintenancePlan.find(query).sort({ nextDueAt: 1 }).lean();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const { assetId, name, type, intervalDays, nextDueAt } = req.body || {};
      if (!assetId || !name) {
        return res.status(400).json({ success: false, message: "assetId and name are required" });
      }
      const plan = await MaintenancePlan.create({
        org_id,
        assetId: String(assetId),
        name: String(name).trim(),
        type: type || "preventive",
        intervalDays: Number(intervalDays || 90),
        nextDueAt: normalizeDate(nextDueAt) || new Date(),
        leadTimeDays: Number(req.body?.leadTimeDays || 7),
        defaultChecklist: Array.isArray(req.body?.defaultChecklist)
          ? req.body.defaultChecklist
          : [],
        notes: req.body?.notes,
        createdBy: req.user?.userId,
      });
      return res.status(201).json({ success: true, data: plan });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updatePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const updated = await MaintenancePlan.findOneAndUpdate(
        { _id: req.params.id, org_id },
        { $set: req.body || {} },
        { new: true },
      ).lean();
      if (!updated) return res.status(404).json({ success: false, message: "Plan not found" });
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async listCalibration(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const query: Record<string, any> = { org_id };
      if (req.query.assetId) query.assetId = String(req.query.assetId);
      const data = await CalibrationRecord.find(query).sort({ performedAt: -1 }).lean();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createCalibration(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const { assetId, performedAt, result } = req.body || {};
      if (!assetId || !performedAt) {
        return res.status(400).json({ success: false, message: "assetId and performedAt are required" });
      }
      const record = await CalibrationRecord.create({
        org_id,
        assetId: String(assetId),
        woId: req.body?.woId,
        performedAt: normalizeDate(performedAt),
        dueNext: normalizeDate(req.body?.dueNext),
        result: result || "pass",
        certificateUrl: req.body?.certificateUrl,
        certificateName: req.body?.certificateName,
        vendorName: req.body?.vendorName,
        standard: req.body?.standard,
        notes: req.body?.notes,
        createdBy: req.user?.userId,
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async listContracts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const query: Record<string, any> = { org_id };
      if (req.query.assetId) query.assetIds = String(req.query.assetId);
      const data = await VendorContract.find(query).sort({ endDate: 1 }).lean();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createContract(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (!req.body?.vendorName) {
        return res.status(400).json({ success: false, message: "vendorName is required" });
      }
      const contract = await VendorContract.create({
        org_id,
        vendorName: String(req.body.vendorName).trim(),
        vendorId: req.body.vendorId,
        assetIds: Array.isArray(req.body.assetIds) ? req.body.assetIds : [],
        category: req.body.category,
        type: req.body.type || "amc",
        startDate: normalizeDate(req.body.startDate),
        endDate: normalizeDate(req.body.endDate),
        slaHours: req.body.slaHours != null ? Number(req.body.slaHours) : undefined,
        visitsIncluded: req.body.visitsIncluded != null ? Number(req.body.visitsIncluded) : undefined,
        documentUrl: req.body.documentUrl,
        documentName: req.body.documentName,
        cost: req.body.cost != null ? Number(req.body.cost) : 0,
        notes: req.body.notes,
        createdBy: req.user?.userId,
      });
      return res.status(201).json({ success: true, data: contract });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async adminReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      await ensureInstallationWorkOrders(org_id);

      const from = req.query.from ? new Date(String(req.query.from)) : startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const to = req.query.to ? new Date(String(req.query.to)) : endOfDay();
      const engineerId = String(req.query.engineerId || "").trim();

      const [orders, pendingMachines, expenses, engineers] = await Promise.all([
        MachineService.find({ org_id }).sort({ updatedAt: -1 }).limit(800).lean(),
        InstalledMachine.find({ org_id, status: "installation_pending" })
          .select("productName serialNumber client status installationDate installedBy technicianId")
          .sort({ installationDate: 1 })
          .lean(),
        StockExpenseClaim.find({ org_id, source: "engineer" })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        User.find({ org_id, role: "technical_service_engineer" })
          .select("firstName lastName email")
          .lean(),
      ]);

      const shaped = orders.map((row) => ({ ...row, status: deriveWorkOrderStatus(row) }));
      const inPeriod = (date?: Date | string | null) => {
        if (!date) return false;
        const value = new Date(date);
        return value >= from && value <= to;
      };
      const matchesEngineer = (row: any) => {
        if (!engineerId) return true;
        return String(row.technicianId || "") === engineerId;
      };

      const open = shaped.filter((row) => isOpenWorkOrderStatus(row.status) && matchesEngineer(row));
      const completed = shaped.filter(
        (row) => row.status === "completed" && inPeriod(row.completedDate) && matchesEngineer(row),
      );
      const overdue = open.filter(
        (row) => row.scheduledDate && new Date(row.scheduledDate) < startOfDay(),
      );
      const installationsDone = completed.filter((row) => row.type === "installation");
      const jobCost = completed.reduce((sum, row) => sum + Number(row.cost || 0), 0);

      const engineerMap = new Map(
        engineers.map((user: any) => [
          String(user._id),
          {
            _id: String(user._id),
            name: displayName(user) || user.email,
            email: user.email,
            open: 0,
            completed: 0,
            inProgress: 0,
            installations: 0,
            cost: 0,
            expenseTotal: 0,
          },
        ]),
      );
      for (const row of shaped) {
        const id = String(row.technicianId || "").trim();
        if (!id) continue;
        if (!engineerMap.has(id)) {
          engineerMap.set(id, {
            _id: id,
            name: String(row.technician || "Engineer"),
            email: "",
            open: 0,
            completed: 0,
            inProgress: 0,
            installations: 0,
            cost: 0,
            expenseTotal: 0,
          });
        }
        const bucket = engineerMap.get(id)!;
        if (isOpenWorkOrderStatus(row.status)) bucket.open += 1;
        if (row.status === "in_progress") bucket.inProgress += 1;
        if (row.status === "completed" && inPeriod(row.completedDate)) {
          bucket.completed += 1;
          bucket.cost += Number(row.cost || 0);
          if (row.type === "installation") bucket.installations += 1;
        }
      }

      const periodExpenses = expenses.filter((row) => {
        if (engineerId && String(row.employeeId) !== engineerId) return false;
        return inPeriod(row.submittedAt || row.createdAt);
      });
      for (const row of periodExpenses) {
        const id = String(row.employeeId || "").trim();
        if (!id) continue;
        if (!engineerMap.has(id)) {
          engineerMap.set(id, {
            _id: id,
            name: String(row.employeeName || "Engineer"),
            email: "",
            open: 0,
            completed: 0,
            inProgress: 0,
            installations: 0,
            cost: 0,
            expenseTotal: 0,
          });
        }
        engineerMap.get(id)!.expenseTotal += Number(row.totalAmount || 0);
      }

      const expenseTotal = periodExpenses.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
      const expenseByStatus: Record<string, { status: string; amount: number; count: number }> = {};
      const expenseByPurpose: Record<string, { purpose: string; amount: number; count: number }> = {};
      for (const row of periodExpenses) {
        const status = String(row.status || "submitted");
        if (!expenseByStatus[status]) expenseByStatus[status] = { status, amount: 0, count: 0 };
        expenseByStatus[status].amount += Number(row.totalAmount || 0);
        expenseByStatus[status].count += 1;
        const purpose = String(row.purpose || "Unspecified").trim() || "Unspecified";
        if (!expenseByPurpose[purpose]) expenseByPurpose[purpose] = { purpose, amount: 0, count: 0 };
        expenseByPurpose[purpose].amount += Number(row.totalAmount || 0);
        expenseByPurpose[purpose].count += 1;
      }

      const activityLimit = Math.min(Math.max(Number(req.query.limit || 40) || 40, 5), 400);
      const liveSource = shaped.filter(
        (row) => row.status === "in_progress" && matchesEngineer(row),
      );
      const activitySource = engineerId ? shaped.filter(matchesEngineer) : shaped;
      const [activity, liveJobs] = await Promise.all([
        enrichWorkOrders(org_id, activitySource.slice(0, activityLimit)),
        enrichWorkOrders(org_id, liveSource.slice(0, 20)),
      ]);
      const pending = engineerId
        ? pendingMachines.filter((machine: any) => String(machine.technicianId || "") === engineerId)
        : pendingMachines;
      const engineerRows = Array.from(engineerMap.values()).sort(
        (a, b) => b.inProgress - a.inProgress || b.completed - a.completed || b.open - a.open,
      );

      return res.status(200).json({
        success: true,
        data: {
          period: { from: from.toISOString(), to: to.toISOString() },
          summary: {
            openJobs: open.length,
            inProgress: liveSource.length,
            completed: completed.length,
            overdue: overdue.length,
            installationsCompleted: installationsDone.length,
            pendingInstallations: pending.length,
            jobCost,
            expenses: expenseTotal,
            totalSpend: jobCost + expenseTotal,
          },
          finance: {
            jobCost,
            expenses: expenseTotal,
            totalSpend: jobCost + expenseTotal,
            byStatus: Object.values(expenseByStatus).sort((a, b) => b.amount - a.amount),
            byPurpose: Object.values(expenseByPurpose).sort((a, b) => b.amount - a.amount).slice(0, 12),
            byEngineer: engineerRows.map((row) => ({
              _id: row._id,
              name: row.name,
              jobCost: row.cost,
              expenses: row.expenseTotal,
              total: row.cost + row.expenseTotal,
            })),
          },
          engineers: engineerRows,
          liveJobs,
          activity,
          pendingInstallations: pending,
          expenses: periodExpenses.slice(0, 50),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load technical service report",
      });
    }
  }

  static async exportReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const from = req.query.from
        ? new Date(String(req.query.from))
        : startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const to = req.query.to ? new Date(String(req.query.to)) : endOfDay();
      const engineerId = String(req.query.engineerId || "").trim();
      const inPeriod = (date?: Date | string | null) => {
        if (!date) return false;
        const value = new Date(date);
        return value >= from && value <= to;
      };
      const [orders, expenses, engineers] = await Promise.all([
        MachineService.find({ org_id }).sort({ updatedAt: -1 }).limit(1500).lean(),
        StockExpenseClaim.find({ org_id, source: "engineer" }).sort({ createdAt: -1 }).limit(500).lean(),
        User.find({ org_id, role: "technical_service_engineer" }).select("firstName lastName email").lean(),
      ]);
      const nameById = new Map(
        engineers.map((user: any) => [String(user._id), displayName(user) || user.email]),
      );
      const jobs = orders.filter((row) => {
        if (engineerId && String(row.technicianId || "") !== engineerId) return false;
        return inPeriod(row.completedDate) || inPeriod(row.startedAt) || inPeriod(row.scheduledDate) || inPeriod(row.createdAt);
      });
      const enriched = await enrichWorkOrders(org_id, jobs.slice(0, 800));
      const claimRows = expenses.filter((row) => {
        if (engineerId && String(row.employeeId) !== engineerId) return false;
        return inPeriod(row.submittedAt || row.createdAt);
      });
      return res.status(200).json({
        success: true,
        data: {
          period: { from: from.toISOString(), to: to.toISOString() },
          engineerName: engineerId ? nameById.get(engineerId) || "Engineer" : "All engineers",
          jobs: enriched.map((row) => ({
            woNumber: row.woNumber || "",
            type: row.type || "",
            serviceType: row.serviceType || "",
            status: deriveWorkOrderStatus(row),
            engineer: row.technician || nameById.get(String(row.technicianId || "")) || "",
            machine: row.machine?.productName || "",
            client: row.machine?.client?.name || "",
            startedAt: row.startedAt || "",
            completedDate: row.completedDate || "",
            cost: Number(row.cost || 0),
            machineOkay: row.machineOkay,
          })),
          expenses: claimRows.map((row) => ({
            claimNumber: row.claimNumber,
            engineer: row.employeeName,
            purpose: row.purpose,
            amount: Number(row.totalAmount || 0),
            status: row.status,
            date: row.submittedAt || row.createdAt,
            woId: row.woId || "",
          })),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to export technical service report",
      });
    }
  }

  static async myExpenseClaims(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      const userId = String(req.user?.userId || "");
      if (!org_id || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const data = await StockExpenseClaim.find({
        org_id,
        $or: [{ employeeId: userId }, { source: "engineer" }],
      })
        .sort({ createdAt: -1 })
        .lean();
      const mine = data.filter(
        (row) => String(row.employeeId) === userId || row.source === "engineer",
      );
      return res.status(200).json({ success: true, data: mine.filter((row) => String(row.employeeId) === userId) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
