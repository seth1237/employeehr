import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { GoodsReceiptNote } from "../../models/GoodsReceiptNote"
import { PurchaseOrder } from "../../models/PurchaseOrder"
import { StockProduct } from "../../models/StockProduct"

export class GrnController {
  
  static async getGrns(req: AuthenticatedRequest, res: Response) {
    try {
      const grns = await GoodsReceiptNote.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: grns })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getGrnById(req: AuthenticatedRequest, res: Response) {
    try {
      const grn = await GoodsReceiptNote.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!grn) return res.status(404).json({ success: false, message: "GRN not found" })
      return res.json({ success: true, data: grn })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createGrn(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await GoodsReceiptNote.countDocuments({ org_id: req.org_id })
      const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

      const grn = await GoodsReceiptNote.create({
        ...req.body,
        org_id: req.org_id,
        grnNumber,
        receivedBy: req.user?._id,
        status: "draft"
      })

      // Update PO status to partially received (if not already)
      if (req.body.purchaseOrderId) {
        await PurchaseOrder.updateOne(
          { _id: req.body.purchaseOrderId, org_id: req.org_id, status: { $in: ["sent", "confirmed", "approved"] } },
          { $set: { status: "partially_received" } }
        )
      }

      return res.status(201).json({ success: true, data: grn })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Submit GRN for Quality Inspection
  static async submitForInspection(req: AuthenticatedRequest, res: Response) {
    try {
      const grn = await GoodsReceiptNote.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!grn) return res.status(404).json({ success: false, message: "GRN not found" })

      if (grn.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft GRNs can be submitted for inspection" })
      }

      grn.status = "pending_inspection"
      grn.inspectionStatus = "pending"
      
      await grn.save()
      return res.json({ success: true, data: grn })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Quality Officer completes inspection
  static async processInspection(req: AuthenticatedRequest, res: Response) {
    try {
      const { inspectionStatus, inspectionRemarks } = req.body // "accepted", "rejected", "quarantined"
      
      const grn = await GoodsReceiptNote.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!grn) return res.status(404).json({ success: false, message: "GRN not found" })

      if (grn.status !== "pending_inspection") {
        return res.status(400).json({ success: false, message: "GRN is not pending inspection" })
      }

      grn.inspectionStatus = inspectionStatus
      grn.inspectedBy = req.user?._id
      grn.inspectionDate = new Date()
      grn.inspectionRemarks = inspectionRemarks

      // If accepted, confirm the GRN and update inventory
      if (inspectionStatus === "accepted" || inspectionStatus === "accepted_with_remarks") {
        grn.status = "confirmed"
        
        // Update Inventory Balances
        if (!grn.stockUpdated) {
          for (const item of grn.items) {
            if (item.productId && item.receivedQuantity > 0) {
              await StockProduct.updateOne(
                { _id: item.productId, org_id: req.org_id },
                { $inc: { currentStock: item.receivedQuantity } }
              )
            }
          }
          grn.stockUpdated = true
        }

        // Check if PO is completely fulfilled
        if (grn.purchaseOrderId) {
          const po = await PurchaseOrder.findOne({ _id: grn.purchaseOrderId, org_id: req.org_id })
          if (po) {
            let fullyReceived = true
            // Basic check: we would normally aggregate all GRNs for this PO to see if total received >= total ordered
            // For simplicity in this endpoint, we'll mark as fulfilled if the user explicitly triggers it
            // via another process, or we can check against this specific GRN if it covers everything.
            po.items.forEach(poItem => {
              const grnItem = grn.items.find(gi => String(gi.productId) === String(poItem.productId))
              if (grnItem) {
                poItem.receivedQuantity += grnItem.receivedQuantity
              }
              if (poItem.receivedQuantity < poItem.quantity) {
                fullyReceived = false
              }
            })
            
            if (fullyReceived) po.status = "fulfilled"
            await po.save()
          }
        }
      }

      await grn.save()
      return res.json({ success: true, data: grn })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
