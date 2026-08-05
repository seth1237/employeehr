import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { Warehouse } from "../models/Warehouse";
import { StockLocation } from "../models/StockLocation";
import { StockProductLocation } from "../models/StockProductLocation";
import { StockProduct } from "../models/StockProduct";

export class WarehouseController {
  static async createWarehouse(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Organization required" });

      const { name, description, rows, cols, cellPrefix, backgroundImage } =
        req.body;
      if (!name || !rows || !cols)
        return res
          .status(400)
          .json({
            success: false,
            message: "name, rows and cols are required",
          });

      const warehouse = await Warehouse.create({
        org_id,
        name: String(name).trim(),
        description: String(description || "").trim(),
        rows: Number(rows),
        cols: Number(cols),
        cellPrefix: cellPrefix || undefined,
        backgroundImage: backgroundImage || undefined,
        layoutObjects: [],
        createdBy: String(req.user?.userId || req.user?._id || ""),
      });

      // create location grid using existing StockLocation model so UI works with current components
      const locations = [] as any[];
      for (let r = 1; r <= Number(rows); r++) {
        for (let c = 1; c <= Number(cols); c++) {
          const code = cellPrefix
            ? `${cellPrefix}${String.fromCharCode(64 + r)}-${c}`
            : `R${r}C${c}`;
          locations.push({
            org_id,
            branchId: warehouse._id,
            name: `${code}`,
            code,
            locationType: "bin",
            x: Math.round(((c - 1) / Number(cols)) * 90) + 5,
            y: Math.round(((r - 1) / Number(rows)) * 90) + 5,
            width: Math.max(5, Math.round(90 / Number(cols))),
            height: Math.max(5, Math.round(90 / Number(rows))),
            color: "#38bdf8",
          });
        }
      }

      // Bulk insert but avoid duplicates
      await StockLocation.insertMany(locations);

      return res.status(201).json({ success: true, data: warehouse });
    } catch (error: any) {
      console.error(error);
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to create warehouse",
        });
    }
  }

  static async getWarehouses(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Organization required" });
      const warehouses = await Warehouse.find({ org_id }).lean();
      return res.status(200).json({ success: true, data: warehouses });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to fetch warehouses",
        });
    }
  }

  static async updateWarehouse(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;
      const { warehouseId } = req.params;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Organization required" });
      if (!warehouseId)
        return res
          .status(400)
          .json({ success: false, message: "warehouseId required" });

      const updates: Record<string, any> = {};
      const allowed = [
        "name",
        "description",
        "rows",
        "cols",
        "cellPrefix",
        "backgroundImage",
        "layoutObjects",
      ];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const warehouse = await Warehouse.findOneAndUpdate(
        { _id: warehouseId, org_id },
        { $set: updates },
        { new: true },
      );
      if (!warehouse)
        return res
          .status(404)
          .json({ success: false, message: "Warehouse not found" });

      return res.status(200).json({ success: true, data: warehouse });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to update warehouse",
        });
    }
  }

  static async getLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;
      const { warehouseId } = req.params;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Organization required" });
      if (!warehouseId)
        return res
          .status(400)
          .json({ success: false, message: "warehouseId required" });

      const locations = await StockLocation.find({
        org_id,
        branchId: warehouseId,
      }).lean();
      return res.status(200).json({ success: true, data: locations });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to fetch locations",
        });
    }
  }

  static async assignProductLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;
      const { productId } = req.params;
      const { locationId, quantity, notes } = req.body;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Organization required" });
      if (!productId || !locationId)
        return res
          .status(400)
          .json({
            success: false,
            message: "productId and locationId required",
          });

      // Basic validation: product and location belong to org
      const product = await StockProduct.findOne({ _id: productId, org_id });
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      const location = await StockLocation.findOne({ _id: locationId, org_id });
      if (!location)
        return res
          .status(404)
          .json({ success: false, message: "Location not found" });

      const qty = Number(quantity || 0);
      let pl = await StockProductLocation.findOne({
        org_id,
        productId,
        locationId,
      });
      if (pl) {
        pl.quantity = qty;
        pl.notes = notes || pl.notes;
        await pl.save();
      } else {
        pl = await StockProductLocation.create({
          org_id,
          productId,
          locationId,
          quantity: qty,
          notes,
        });
      }

      return res.status(200).json({ success: true, data: pl });
    } catch (error: any) {
      console.error(error);
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to assign product location",
        });
    }
  }

  static async getProductLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;
      const { productId } = req.params;
      if (!org_id)
        return res
          .status(401)
          .json({ success: false, message: "Organization required" });
      if (!productId)
        return res
          .status(400)
          .json({ success: false, message: "productId required" });

      const pls = await StockProductLocation.find({ org_id, productId }).lean();
      // populate location details
      const locationIds = pls.map((p: any) => p.locationId);
      const locations = await StockLocation.find({
        _id: { $in: locationIds },
      }).lean();
      const locMap: Record<string, any> = {};
      locations.forEach((l: any) => {
        locMap[String(l._id)] = l;
      });
      const data = pls.map((p: any) => ({
        ...p,
        location: locMap[String(p.locationId)] || null,
      }));
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to fetch product locations",
        });
    }
  }
}

export default WarehouseController;
