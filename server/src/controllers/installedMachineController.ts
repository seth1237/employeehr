import type { Response } from "express";
import fs from "fs/promises";
import type { AuthenticatedRequest } from "../middleware/auth";
import { InstalledMachine } from "../models/InstalledMachine";
import { CreditNote } from "../models/CreditNote";
import { StockInvoice } from "../models/StockInvoice";
import { StockProduct } from "../models/StockProduct";
import { MachineService } from "../models/MachineService";
import { isAdminRole } from "./stock/stockShared";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length < 1) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });
    return row;
  });
}

function cell(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  // Case-insensitive / whitespace-tolerant header match
  const normalized = new Map(
    Object.entries(row).map(([header, value]) => [
      header.trim().toLowerCase().replace(/\s+/g, " "),
      value,
    ]),
  );
  for (const key of keys) {
    const value = normalized.get(key.trim().toLowerCase().replace(/\s+/g, " "));
    if (value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function parseFlexibleDate(value: string): Date | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime()) && /^\d{4}/.test(raw)) return iso;

  const match = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (!Number.isNaN(iso.getTime())) return iso;
  return undefined;
}

function looksLikePhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7;
}

export class InstalledMachineController {
  static async listInstalledMachines(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      // fetch all active installed machines for org
      const machines = await InstalledMachine.find({
        org_id,
        isActive: true,
      }).lean();

      // Filter out machines whose invoice has an issued/applied credit note
      const invoiceIds = Array.from(
        new Set(
          machines.map((m: any) => String(m.invoiceId || "")).filter(Boolean),
        ),
      );
      const creditNotes = await CreditNote.find({
        org_id,
        invoiceId: { $in: invoiceIds },
        status: { $in: ["issued", "applied"] },
      })
        .select("invoiceId")
        .lean();
      const reversedInvoiceIds = new Set(
        creditNotes.map((c: any) => String(c.invoiceId)),
      );

      const filtered = machines.filter(
        (m: any) => !reversedInvoiceIds.has(String(m.invoiceId || "")),
      );

      return res.status(200).json({ success: true, data: filtered });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list installed machines",
      });
    }
  }

  static async listInstallableCandidates(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      // Invoices that originate from a quotation and are delivered (dispatch.delivery.received or dispatch.status === 'delivered') and not cancelled
      const invoices = await StockInvoice.find({
        org_id,
        quotationId: { $exists: true, $ne: null },
        status: { $ne: "cancelled" },
      }).lean();

      // Filter delivered invoices
      const delivered = invoices.filter((inv: any) => {
        const disp = inv.dispatch || {};
        if (disp.delivery && disp.delivery.received) return true;
        if (typeof disp.status === "string" && disp.status === "delivered")
          return true;
        if (disp.dispatchedAt && disp.dispatchedAt instanceof Date) return true;
        return false;
      });

      const invoiceIds = delivered.map((i: any) => String(i._id));

      // Exclude invoices that have issued/applied credit notes
      const creditNotes = await CreditNote.find({
        org_id,
        invoiceId: { $in: invoiceIds },
        status: { $in: ["issued", "applied"] },
      })
        .select("invoiceId")
        .lean();
      const reversedInvoiceIds = new Set(
        creditNotes.map((c: any) => String(c.invoiceId)),
      );

      const candidates: any[] = [];

      for (const inv of delivered) {
        if (reversedInvoiceIds.has(String(inv._id))) continue;
        const client = inv.client || {};
        const invoiceId = String(inv._id);
        const quotationId = inv.quotationId || null;
        for (const item of inv.items || []) {
          // attach product details where possible
          const product = await StockProduct.findOne({
            _id: item.productId,
            org_id,
          })
            .select("category name")
            .lean();
          candidates.push({
            invoiceId,
            quotationId,
            invoiceNumber: inv.invoiceNumber,
            client,
            productId: item.productId,
            productName: item.productName || (product && product.name) || "",
            category:
              (product && product.category) ||
              item.productType ||
              "Uncategorized",
            quantity: item.quantity,
          });
        }
      }

      // Build category list and group
      const categories = Array.from(
        new Set(candidates.map((c) => c.category || "Uncategorized")),
      ).sort();

      return res
        .status(200)
        .json({ success: true, data: { categories, candidates } });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list installable candidates",
      });
    }
  }

  static async createInstalledMachine(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      const org_id = req.user?.org_id;
      const actorId = req.user?.userId;
      if (!org_id || !actorId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const {
        client,
        productId,
        productName,
        category,
        serialNumber,
        installationLocation,
        installationDepartment,
        installationDate,
        warrantyUntil,
        invoiceId,
        quotationId,
        notes,
        status,
        installedBy,
        attendant,
        attendantNumber,
        attendantRole,
        nextServiceDate,
        isTrained,
      } = req.body || {};

      if (!client || !client.name || !productId || !productName) {
        return res.status(400).json({
          success: false,
          message: "client.name, productId and productName are required",
        });
      }

      // Validate product type - only machines allowed
      const product = await StockProduct.findOne({
        _id: productId,
        org_id,
      }).lean();
      if (product && product.productType && product.productType === "service") {
        // productType in StockProduct is "physical" | "service". We allow "physical" but also check incoming item productType later in invoice.
      }

      const allowedStatus = [
        "active",
        "maintenance",
        "ended",
        "installation_pending",
      ];
      const resolvedStatus = allowedStatus.includes(String(status || ""))
        ? String(status)
        : "active";

      const doc = await InstalledMachine.create({
        org_id,
        client: {
          name: client.name,
          number: client.number,
          location: client.location,
          contactPerson: client.contactPerson,
        },
        productId,
        productName,
        category,
        serialNumber,
        installationLocation,
        installationDepartment,
        installationDate: installationDate
          ? new Date(installationDate)
          : undefined,
        warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : undefined,
        invoiceId,
        quotationId,
        notes,
        status: resolvedStatus,
        installedBy: installedBy ? String(installedBy).trim() : undefined,
        attendant: attendant ? String(attendant).trim() : undefined,
        attendantNumber: attendantNumber
          ? String(attendantNumber).trim()
          : undefined,
        attendantRole: attendantRole
          ? String(attendantRole).trim()
          : undefined,
        nextServiceDate: nextServiceDate
          ? new Date(nextServiceDate)
          : undefined,
        isTrained: Boolean(isTrained),
        createdBy: actorId,
        isActive: true,
      });

      return res.status(201).json({ success: true, data: doc });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create installed machine",
      });
    }
  }

  static async updateInstalledMachine(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      const id = String(req.params.id || "").trim();
      if (!id)
        return res
          .status(400)
          .json({ success: false, message: "Installed machine id required" });

      const allowed = [
        "productName",
        "category",
        "serialNumber",
        "installationLocation",
        "installationDepartment",
        "installationDate",
        "warrantyUntil",
        "status",
        "isActive",
        "notes",
        "nextServiceDate",
        "installedBy",
        "attendant",
        "attendantNumber",
        "attendantRole",
        "isTrained",
      ];
      const updates: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (typeof updates.productName === "string") {
        updates.productName = updates.productName.trim();
        if (!updates.productName) {
          return res.status(400).json({
            success: false,
            message: "Machine name is required",
          });
        }
      }
      if (typeof updates.category === "string") {
        updates.category = updates.category.trim() || undefined;
      }
      if (updates.installationDate)
        updates.installationDate = new Date(updates.installationDate);
      if (updates.warrantyUntil)
        updates.warrantyUntil = new Date(updates.warrantyUntil);
      if (updates.nextServiceDate)
        updates.nextServiceDate = new Date(updates.nextServiceDate);

      const updated = await InstalledMachine.findOneAndUpdate(
        { _id: id, org_id },
        { $set: updates },
        { new: true },
      ).lean();
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Installed machine not found" });
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update installed machine",
      });
    }
  }

  static async deleteInstalledMachine(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      const id = String(req.params.id || "").trim();
      if (!id)
        return res
          .status(400)
          .json({ success: false, message: "Installed machine id required" });

      const deleted = await InstalledMachine.findOneAndDelete({
        _id: id,
        org_id,
      }).lean();
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Installed machine not found" });
      return res
        .status(200)
        .json({ success: true, message: "Machine deleted" });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete installed machine",
      });
    }
  }

  static async bulkUploadInstalledMachines(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    const file = req.file as any;
    try {
      const org_id = req.user?.org_id;
      const actorId = req.user?.userId;
      if (!org_id || !actorId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: "Only admin/HR can bulk upload machines",
        });
      }

      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "CSV file is required" });
      }

      const fileContent = await fs.readFile(file.path, "utf-8");
      const rows = parseCsv(fileContent);
      if (rows.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "CSV file is empty" });
      }

      const products = await StockProduct.find({ org_id })
        .select("_id name category productType")
        .lean();
      const productByName = new Map(
        products.map((product: any) => [
          String(product.name || "")
            .trim()
            .toLowerCase(),
          product,
        ]),
      );

      const resolveProduct = async (productName: string) => {
        const key = productName.trim().toLowerCase();
        const existing = productByName.get(key);
        if (existing) {
          return {
            productId: String(existing._id),
            productName: String(existing.name),
            category: String(existing.category || ""),
          };
        }

        const created = await StockProduct.create({
          org_id,
          name: productName.trim(),
          category: "Imported Machines",
          productType: "physical",
          startingPrice: 0,
          sellingPrice: 0,
          minAlertQuantity: 0,
          currentQuantity: 0,
          assignedUsers: [],
          createdBy: actorId,
        });
        const resolved = {
          productId: String(created._id),
          productName: String(created.name),
          category: "Imported Machines",
        };
        productByName.set(key, {
          _id: created._id,
          name: created.name,
          category: created.category,
        });
        return resolved;
      };

      let createdCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const rowNumber = index + 2;
        try {
          const row = rows[index];
          const clientName = cell(row, [
            "Client",
            "Client Name",
            "Facility",
            "Facility Name",
            "sourceName",
          ]);
          const contactPerson = cell(row, [
            "Contact person",
            "Contact Person",
            "Contact",
            "client.contactPerson",
          ]);
          const clientPhone = cell(row, [
            "phone number",
            "Phone Number",
            "Phone",
            "Client Phone",
            "Facility Phone",
            "client.number",
          ]);
          const attendant = cell(row, [
            "In charge of machine (name)",
            "In charge of machine",
            "In Charge of Machine",
            "In Charge",
            "Attendant",
            "Operator",
            "Operator / Attendant",
          ]);
          const attendantRole = cell(row, [
            "Role",
            "Attendant Role",
            "In Charge Role",
            "Operator Role",
          ]);
          const noValue = cell(row, [
            "No",
            "Number",
            "Attendant No",
            "Attendant Number",
            "Attendant Phone",
            "In Charge Phone",
            "In Charge Number",
            "Operator Phone",
          ]);
          const location = cell(row, [
            "LOCATION",
            "Location",
            "Region",
            "Region/Location",
            "client.location",
          ]);
          const installationLocation = cell(row, [
            "Installation Location",
            "Install Location",
            "Department",
            "installationLocation",
          ]);
          const serialNumber = cell(row, [
            "Machine S/No",
            "Machine S/N",
            "Machine Serial",
            "Serial Number",
            "Serial No",
            "S/No",
            "S/N",
            "serialNumber",
          ]);
          const productNameRaw = cell(row, [
            "Machine Name",
            "Product Name",
            "Machine",
            "Model",
            "Equipment",
            "productName",
          ]);
          const installationDate = parseFlexibleDate(
            cell(row, [
              "Installation Date",
              "Install Date",
              "Date Installed",
              "installationDate",
            ]),
          );
          const lastServiceDate = parseFlexibleDate(
            cell(row, [
              "Last Service Date",
              "Last Service",
              "Previous Service",
              "lastServiceDate",
            ]),
          );
          const nextServiceDate = parseFlexibleDate(
            cell(row, [
              "Next Service",
              "Next Service Date",
              "Due Service",
              "nextServiceDate",
            ]),
          );
          const installedBy = cell(row, [
            "Installed By",
            "Engineer",
            "installedBy",
          ]);
          const notesRaw = cell(row, ["Notes", "Remark", "Remarks", "notes"]);

          if (!clientName) {
            errors.push(`Row ${rowNumber}: Client is required`);
            continue;
          }

          if (!productNameRaw) {
            errors.push(`Row ${rowNumber}: Machine Name is required`);
            continue;
          }

          const attendantNumber = looksLikePhone(noValue) ? noValue : "";
          const productName = productNameRaw;
          const product = await resolveProduct(productName);

          const noteParts = [notesRaw];
          if (noValue && !attendantNumber) noteParts.push(`No: ${noValue}`);
          const notes = noteParts.filter(Boolean).join(" | ");

          const payload: Record<string, any> = {
            client: {
              name: clientName,
              number: clientPhone || undefined,
              location: location || undefined,
              contactPerson: contactPerson || undefined,
            },
            productId: product.productId,
            productName: product.productName,
            category: product.category || undefined,
            serialNumber: serialNumber || undefined,
            installationLocation:
              installationLocation || location || undefined,
            installationDate,
            nextServiceDate,
            installedBy: installedBy || undefined,
            attendant: attendant || undefined,
            attendantNumber: attendantNumber || undefined,
            attendantRole: attendantRole || undefined,
            notes: notes || undefined,
            status: "active",
            isActive: true,
          };

          let existing: any = null;
          if (serialNumber) {
            existing = await InstalledMachine.findOne({
              org_id,
              serialNumber,
              isActive: { $ne: false },
            });
          }
          if (!existing) {
            const lookup: Record<string, any> = {
              org_id,
              productId: product.productId,
              "client.name": clientName,
              isActive: { $ne: false },
            };
            if (location) lookup["client.location"] = location;
            if (serialNumber) lookup.serialNumber = serialNumber;
            else lookup.$or = [{ serialNumber: null }, { serialNumber: "" }, { serialNumber: { $exists: false } }];
            existing = await InstalledMachine.findOne(lookup);
          }

          let machineId = "";
          if (existing) {
            Object.assign(existing, {
              client: {
                name: clientName,
                number: clientPhone || existing.client?.number,
                location: location || existing.client?.location,
                contactPerson:
                  contactPerson || existing.client?.contactPerson,
              },
              productId: product.productId,
              productName: product.productName,
              category: product.category || existing.category,
              serialNumber: serialNumber || existing.serialNumber,
              installationLocation:
                installationLocation ||
                location ||
                existing.installationLocation,
              installationDate:
                installationDate || existing.installationDate,
              nextServiceDate: nextServiceDate || existing.nextServiceDate,
              installedBy: installedBy || existing.installedBy,
              attendant: attendant || existing.attendant,
              attendantNumber: attendantNumber || existing.attendantNumber,
              attendantRole: attendantRole || existing.attendantRole,
              notes: notes || existing.notes,
              status: existing.status || "active",
              isActive: true,
            });
            await existing.save();
            machineId = String(existing._id);
            updatedCount += 1;
          } else {
            const created = await InstalledMachine.create({
              org_id,
              ...payload,
              createdBy: actorId,
            });
            machineId = String(created._id);
            createdCount += 1;
          }

          if (lastServiceDate && machineId) {
            const alreadyLogged = await MachineService.findOne({
              org_id,
              machineId,
              completedDate: lastServiceDate,
            }).lean();
            if (!alreadyLogged) {
              await MachineService.create({
                org_id,
                machineId,
                serviceType: "Imported last service",
                scheduledDate: lastServiceDate,
                completedDate: lastServiceDate,
                technician: attendant || "",
                notes: "Created from machine bulk upload",
              });
            }
          }

          if (nextServiceDate && machineId) {
            const alreadyScheduled = await MachineService.findOne({
              org_id,
              machineId,
              scheduledDate: nextServiceDate,
              $or: [{ completedDate: null }, { completedDate: { $exists: false } }],
            }).lean();
            if (!alreadyScheduled) {
              await MachineService.create({
                org_id,
                machineId,
                serviceType: "Scheduled service",
                scheduledDate: nextServiceDate,
                completedDate: null,
                technician: "",
                notes: "Created from machine bulk upload",
              });
            }
            await InstalledMachine.findOneAndUpdate(
              { _id: machineId, org_id },
              { $set: { nextServiceDate } },
            );
          }
        } catch (rowError: any) {
          errors.push(
            `Row ${rowNumber}: ${rowError?.message || "Failed to import row"}`,
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Upload complete: ${createdCount} created, ${updatedCount} updated`,
        data: { createdCount, updatedCount, errors },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to bulk upload machines",
      });
    } finally {
      if (file?.path) {
        try {
          await fs.unlink(file.path);
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }
}
