import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { BarcodeScan, type BarcodeScanContext } from "../models/BarcodeScan"
import { InstalledMachine } from "../models/InstalledMachine"
import { StockInvoice } from "../models/StockInvoice"
import { StockProduct } from "../models/StockProduct"
import { StockProductLocation } from "../models/StockProductLocation"
import { Task } from "../models/Task"
import {
  assignBarcodeFields,
  ensureProductBarcode,
  lookupLocationByCode,
  lookupProductByCode,
  normalizeScanCode,
  productWithLocations,
} from "../lib/productBarcode"
import { isAdminRole } from "./stock/stockShared"

function orgIdOf(req: AuthenticatedRequest) {
  return String(req.user?.org_id || (req as any).org_id || "")
}

function canManageDispatch(req: AuthenticatedRequest, invoice: any) {
  const userId = String(req.user?.userId || "")
  if (!userId) return false
  if (isAdminRole(req.user?.role)) return true
  return String(invoice?.dispatch?.assignedToUserId || "") === userId
}

function packingComplete(
  packingItems: Array<{ requiredQuantity: number; packedQuantity: number }>,
) {
  return (
    packingItems.length > 0 &&
    packingItems.every(
      (item) =>
        Number(item.packedQuantity || 0) >= Number(item.requiredQuantity || 0),
    )
  )
}

async function logScan(input: {
  orgId: string
  userId?: string
  code: string
  context: BarcodeScanContext
  ok: boolean
  reason?: string
  productId?: string
  locationId?: string
  invoiceId?: string
  stockCheckId?: string
}) {
  try {
    await BarcodeScan.create({
      org_id: input.orgId,
      userId: input.userId,
      code: input.code,
      context: input.context,
      ok: input.ok,
      reason: input.reason,
      productId: input.productId,
      locationId: input.locationId,
      invoiceId: input.invoiceId,
      stockCheckId: input.stockCheckId,
    })
  } catch {
    // Scan history is best-effort and must not block packing.
  }
}

async function syncPackingSerialsToMachines(invoice: any) {
  const packingItems = invoice?.dispatch?.packingItems || []
  const orgId = String(invoice.org_id)
  for (const item of packingItems) {
    const serials = (item.serials || [])
      .map((value: string) => String(value || "").trim())
      .filter(Boolean)
    if (!serials.length) continue

    const machines = await InstalledMachine.find({
      org_id: orgId,
      invoiceId: String(invoice._id),
      productId: String(item.productId),
    }).sort({ createdAt: 1 })

    for (let i = 0; i < serials.length; i += 1) {
      const serial = serials[i]
      if (machines[i]) {
        if (!machines[i].serialNumber) {
          machines[i].serialNumber = serial
          await machines[i].save()
        }
        continue
      }
      await InstalledMachine.create({
        org_id: orgId,
        client: invoice.client,
        productId: String(item.productId),
        productName: item.productName,
        invoiceId: String(invoice._id),
        quotationId: invoice.quotationId,
        serialNumber: serial,
        status: "installation_pending",
        isActive: true,
        createdBy: invoice.postedBy || invoice.createdBy,
      })
    }
  }
}

async function upsertPackingDuty(invoice: any, userId: string, completed: boolean) {
  if (!invoice?.dispatch?.assignedToUserId) return
  try {
    await Task.findOneAndUpdate(
      {
        org_id: invoice.org_id,
        related_entity_type: "invoice",
        related_entity_id: String(invoice._id),
        is_packaging_duty: true,
      },
      {
        $set: {
          status: completed ? "completed" : "in_progress",
          source_status: String(invoice?.dispatch?.status || "packing"),
          notes: completed ? "Packing completed from barcode scan" : undefined,
          completed_at: completed ? new Date() : undefined,
        },
      },
    )
  } catch {
    // Duty tasks are optional.
  }
}

export class BarcodeController {
  static async lookupProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const code = normalizeScanCode(String(req.query.code || req.query.q || ""))
      const context = String(req.query.context || "confirm") as BarcodeScanContext
      if (code.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Scan at least 3 characters",
        })
      }

      const product = await lookupProductByCode(orgId, code)
      if (!product) {
        await logScan({
          orgId,
          userId: req.user?.userId,
          code,
          context,
          ok: false,
          reason: "unknown",
        })
        return res.status(404).json({
          success: false,
          message: "Unknown barcode",
        })
      }

      const payload = await productWithLocations(orgId, product)
      await logScan({
        orgId,
        userId: req.user?.userId,
        code,
        context,
        ok: true,
        productId: String(product._id),
      })
      return res.status(200).json({ success: true, data: payload })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to look up barcode",
      })
    }
  }

  static async lookupLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const code = normalizeScanCode(String(req.query.code || ""))
      const warehouseId = String(req.query.warehouseId || "").trim()
      const location = await lookupLocationByCode(orgId, code, warehouseId || undefined)
      if (!location) {
        return res.status(404).json({
          success: false,
          message: "Unknown bin code",
        })
      }
      return res.status(200).json({ success: true, data: location })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to look up location",
      })
    }
  }

  static async generateProductBarcode(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: "Only admin/HR can generate barcodes",
        })
      }
      const product = await StockProduct.findOne({
        _id: req.params.id,
        org_id: orgId,
      })
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" })
      }
      if (product.productType === "service") {
        return res.status(400).json({
          success: false,
          message: "Service products do not get barcodes",
        })
      }
      await ensureProductBarcode(orgId, product, {
        sku: req.body?.sku,
        manufacturerBarcode: req.body?.manufacturerBarcode,
        force: Boolean(req.body?.force),
      })
      return res.status(200).json({ success: true, data: product })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to generate barcode",
      })
    }
  }

  static async generateMissingBarcodes(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: "Only admin/HR can generate barcodes",
        })
      }

      const products = await StockProduct.find({
        org_id: orgId,
        isActive: { $ne: false },
        productType: { $ne: "service" },
        $or: [{ sku: { $exists: false } }, { sku: "" }, { sku: null }],
      })

      let generated = 0
      for (const product of products) {
        await ensureProductBarcode(orgId, product)
        generated += 1
      }

      return res.status(200).json({
        success: true,
        message: generated
          ? `Generated barcodes for ${generated} product${generated === 1 ? "" : "s"}`
          : "Every physical product already has a barcode",
        data: { generated },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate missing barcodes",
      })
    }
  }

  static async recordLabelsPrinted(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const copies = Math.max(1, Number(req.body?.copies || 1))
      const product = await StockProduct.findOneAndUpdate(
        { _id: req.params.id, org_id: orgId },
        {
          $set: { labelsPrintedAt: new Date() },
          $inc: { labelsPrintedCount: copies },
        },
        { new: true },
      )
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" })
      }
      return res.status(200).json({ success: true, data: product })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to record label print",
      })
    }
  }

  static async scanDispatch(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      const userId = req.user?.userId
      if (!orgId || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const code = normalizeScanCode(req.body?.code)
      const increment = Math.max(1, Number(req.body?.increment || 1))
      const serial = String(req.body?.serial || "").trim()
      const allowOverscan = Boolean(req.body?.allowOverscan)

      if (code.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Scan at least 3 characters",
        })
      }

      const invoice = await StockInvoice.findOne({
        _id: req.params.invoiceId,
        org_id: orgId,
      })
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" })
      }
      if (!canManageDispatch(req, invoice)) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to update this dispatch",
        })
      }

      const product = await lookupProductByCode(orgId, code)
      if (!product) {
        await logScan({
          orgId,
          userId,
          code,
          context: "dispatch",
          ok: false,
          reason: "unknown",
          invoiceId: String(invoice._id),
        })
        return res.status(404).json({ success: false, message: "Unknown barcode" })
      }
      if (product.productType === "service") {
        await logScan({
          orgId,
          userId,
          code,
          context: "dispatch",
          ok: false,
          reason: "service",
          productId: String(product._id),
          invoiceId: String(invoice._id),
        })
        return res.status(400).json({
          success: false,
          message: "Service lines are not scanned",
        })
      }
      if (product.isActive === false) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is inactive. Put the box back.`,
        })
      }

      const packingItems = [...(invoice.dispatch?.packingItems || [])]
      const lineIndex = packingItems.findIndex(
        (item: any) => String(item.productId) === String(product._id),
      )
      if (lineIndex < 0) {
        await logScan({
          orgId,
          userId,
          code,
          context: "dispatch",
          ok: false,
          reason: "not_on_job",
          productId: String(product._id),
          invoiceId: String(invoice._id),
        })
        return res.status(409).json({
          success: false,
          message: "Not on this job",
          data: { productName: product.name },
        })
      }

      const line = packingItems[lineIndex]
      const required = Number(line.requiredQuantity || 0)
      const packed = Number(line.packedQuantity || 0)
      if (packed >= required && !allowOverscan) {
        await logScan({
          orgId,
          userId,
          code,
          context: "dispatch",
          ok: false,
          reason: "already_packed",
          productId: String(product._id),
          invoiceId: String(invoice._id),
        })
        return res.status(409).json({
          success: false,
          message: `Already packed ${packed}/${required}`,
          data: { productName: product.name, packedQuantity: packed, requiredQuantity: required },
        })
      }

      const nextPacked = allowOverscan
        ? packed + increment
        : Math.min(required, packed + increment)
      const serials = Array.isArray(line.serials) ? [...line.serials] : []
      if (serial && !serials.includes(serial)) serials.push(serial)

      packingItems[lineIndex] = {
        ...((typeof line.toObject === "function" ? line.toObject() : line) as object),
        productId: String(line.productId),
        productName: line.productName,
        requiredQuantity: required,
        packedQuantity: nextPacked,
        scannedAt: new Date(),
        serials,
      }

      const completed = packingComplete(packingItems)
      invoice.dispatch = invoice.dispatch || ({} as any)
      invoice.dispatch.status = completed ? "packed" : "packing"
      invoice.dispatch.packingItems = packingItems
      invoice.dispatch.packingCompleted = completed
      if (completed) invoice.dispatch.packingCompletedAt = new Date()
      await invoice.save()
      await syncPackingSerialsToMachines(invoice)
      await upsertPackingDuty(invoice, String(userId), completed)
      await logScan({
        orgId,
        userId,
        code,
        context: "dispatch",
        ok: true,
        productId: String(product._id),
        invoiceId: String(invoice._id),
      })

      return res.status(200).json({
        success: true,
        message: `${product.name} ${nextPacked}/${required}`,
        data: {
          invoice,
          line: packingItems[lineIndex],
          product,
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to scan dispatch item",
      })
    }
  }

  static async scanPutaway(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      const userId = req.user?.userId
      if (!orgId || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const productCode = normalizeScanCode(req.body?.productCode || req.body?.code)
      const locationCode = normalizeScanCode(req.body?.locationCode)
      const warehouseId = String(req.body?.warehouseId || "").trim()
      const quantity = Number(req.body?.quantity ?? 1)

      if (productCode.length < 3 || !locationCode) {
        return res.status(400).json({
          success: false,
          message: "Scan a product barcode and a bin code",
        })
      }
      if (!Number.isFinite(quantity) || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be zero or more",
        })
      }

      const product = await lookupProductByCode(orgId, productCode)
      if (!product) {
        await logScan({
          orgId,
          userId,
          code: productCode,
          context: "wms-putaway",
          ok: false,
          reason: "unknown",
        })
        return res.status(404).json({ success: false, message: "Unknown barcode" })
      }

      const location = await lookupLocationByCode(
        orgId,
        locationCode,
        warehouseId || undefined,
      )
      if (!location) {
        return res.status(404).json({ success: false, message: "Unknown bin code" })
      }

      const assignment = await StockProductLocation.findOneAndUpdate(
        { org_id: orgId, productId: String(product._id), locationId: String(location._id) },
        {
          $set: {
            org_id: orgId,
            branchId: location.branchId,
            productId: String(product._id),
            locationId: String(location._id),
          },
          $inc: { quantity },
        },
        { upsert: true, new: true },
      )

      await logScan({
        orgId,
        userId,
        code: productCode,
        context: "wms-putaway",
        ok: true,
        productId: String(product._id),
        locationId: String(location._id),
      })

      return res.status(200).json({
        success: true,
        message: `Put ${product.name} on ${location.code}`,
        data: { product, location, assignment },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to put away scanned item",
      })
    }
  }
}

export { assignBarcodeFields }
