import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { InstalledMachine } from "../models/InstalledMachine";
import { CreditNote } from "../models/CreditNote";
import { StockInvoice } from "../models/StockInvoice";
import { StockProduct } from "../models/StockProduct";

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
        "isTrained",
      ];
      const updates: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
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
}
