import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { PurchaseReturn } from "../../models/PurchaseReturn"
import { StockProduct } from "../../models/StockProduct"

export class PurchaseReturnController {
  
  static async getReturns(req: AuthenticatedRequest, res: Response) {
    try {
      const returns = await PurchaseReturn.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: returns })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getReturnById(req: AuthenticatedRequest, res: Response) {
    try {
      const returnDoc = await PurchaseReturn.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!returnDoc) return res.status(404).json({ success: false, message: "Purchase Return not found" })
      return res.json({ success: true, data: returnDoc })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const { items } = req.body
      
      let subTotal = 0
      let taxAmount = 0
      
      const processedItems = items.map((item: any) => {
        const lineTotal = Number(item.returnedQuantity) * Number(item.unitPrice)
        subTotal += lineTotal
        return { ...item, lineTotal }
      })

      const count = await PurchaseReturn.countDocuments({ org_id: req.org_id })
      const returnNumber = `PRTN-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

      const returnDoc = await PurchaseReturn.create({
        ...req.body,
        org_id: req.org_id,
        returnNumber,
        items: processedItems,
        subTotal,
        taxAmount,
        grandTotal: subTotal + taxAmount,
        createdBy: req.user?._id,
        status: "draft"
      })

      return res.status(201).json({ success: true, data: returnDoc })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async approveReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const returnDoc = await PurchaseReturn.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!returnDoc) return res.status(404).json({ success: false, message: "Purchase Return not found" })

      if (returnDoc.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft returns can be approved" })
      }

      returnDoc.status = "approved"
      returnDoc.approvedBy = req.user?._id

      // Decrease inventory if not already done
      if (!returnDoc.stockReduced) {
        for (const item of returnDoc.items) {
          if (item.productId && item.returnedQuantity > 0) {
            await StockProduct.updateOne(
              { _id: item.productId, org_id: req.org_id },
              { $inc: { currentStock: -item.returnedQuantity } }
            )
          }
        }
        returnDoc.stockReduced = true
      }

      await returnDoc.save()
      return res.json({ success: true, data: returnDoc })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async dispatchToSupplier(req: AuthenticatedRequest, res: Response) {
    try {
      const returnDoc = await PurchaseReturn.findOneAndUpdate(
        { _id: req.params.id, org_id: req.org_id, status: "approved" },
        { $set: { status: "dispatched_to_supplier" } },
        { new: true }
      )
      
      if (!returnDoc) return res.status(404).json({ success: false, message: "Return not found or not approved" })
      
      return res.json({ success: true, data: returnDoc })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async resolveReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const { outcome, creditNoteId } = req.body // "credit_note", "replacement", "refund"

      const returnDoc = await PurchaseReturn.findOneAndUpdate(
        { _id: req.params.id, org_id: req.org_id },
        { 
          $set: { 
            status: "resolved",
            outcome,
            creditNoteId
          } 
        },
        { new: true }
      )
      
      if (!returnDoc) return res.status(404).json({ success: false, message: "Return not found" })
      
      return res.json({ success: true, data: returnDoc })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
