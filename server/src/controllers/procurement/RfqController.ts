import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { Rfq } from "../../models/Rfq"
import { SupplierQuotation } from "../../models/SupplierQuotation"
import { PurchaseRequest } from "../../models/PurchaseRequest"

export class RfqController {
  
  static async getRfqs(req: AuthenticatedRequest, res: Response) {
    try {
      const rfqs = await Rfq.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: rfqs })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getRfqById(req: AuthenticatedRequest, res: Response) {
    try {
      const rfq = await Rfq.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!rfq) return res.status(404).json({ success: false, message: "RFQ not found" })
      return res.json({ success: true, data: rfq })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createRfq(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await Rfq.countDocuments({ org_id: req.org_id })
      const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

      const rfq = await Rfq.create({
        ...req.body,
        org_id: req.org_id,
        rfqNumber,
        createdBy: req.user?._id,
        status: "draft"
      })

      // If created from PR, update PR status
      if (req.body.purchaseRequestId) {
        await PurchaseRequest.updateOne(
          { _id: req.body.purchaseRequestId, org_id: req.org_id },
          { $set: { status: "converted_to_rfq" } }
        )
      }

      return res.status(201).json({ success: true, data: rfq })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Publish RFQ to suppliers
  static async publishRfq(req: AuthenticatedRequest, res: Response) {
    try {
      const rfq = await Rfq.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!rfq) return res.status(404).json({ success: false, message: "RFQ not found" })

      if (rfq.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft RFQs can be published" })
      }

      rfq.status = "published"
      // Notifications/Emails to invited suppliers would be triggered here

      await rfq.save()
      return res.json({ success: true, data: rfq })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // --- Supplier Quotations (Responses to RFQ) ---

  static async getQuotationsForRfq(req: AuthenticatedRequest, res: Response) {
    try {
      const quotes = await SupplierQuotation.find({ 
        rfqId: req.params.id, 
        org_id: req.org_id 
      }).sort({ grandTotal: 1 }) // Sort by cheapest by default
      
      return res.json({ success: true, data: quotes })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async submitQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const rfqId = req.params.id
      const { items, supplierId } = req.body
      
      // Calculate totals
      let subTotal = 0
      let taxAmount = 0
      
      const processedItems = items.map((item: any) => {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice)
        const itemTax = lineTotal * (Number(item.taxRate || 0) / 100)
        
        subTotal += lineTotal
        taxAmount += itemTax
        
        return { ...item, lineTotal }
      })

      const count = await SupplierQuotation.countDocuments({ org_id: req.org_id, supplierId })
      const quotationNumber = req.body.quotationNumber || `SQ-${supplierId.substring(0,4).toUpperCase()}-${String(count + 1).padStart(4, "0")}`

      const quote = await SupplierQuotation.create({
        ...req.body,
        org_id: req.org_id,
        rfqId,
        quotationNumber,
        items: processedItems,
        subTotal,
        taxAmount,
        grandTotal: subTotal + taxAmount,
        status: "submitted",
        submittedBy: req.user?._id
      })

      // Update RFQ Supplier status
      if (rfqId) {
        await Rfq.updateOne(
          { _id: rfqId, org_id: req.org_id, "invitedSuppliers.supplierId": supplierId },
          { $set: { "invitedSuppliers.$.status": "submitted" } }
        )
      }

      return res.status(201).json({ success: true, data: quote })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Compare and Award
  static async evaluateQuotations(req: AuthenticatedRequest, res: Response) {
    try {
      const { evaluations } = req.body // Array of { quotationId, evaluationMatrix }
      
      for (const evalData of evaluations) {
        await SupplierQuotation.updateOne(
          { _id: evalData.quotationId, org_id: req.org_id },
          { 
            $set: { 
              evaluation: evalData.evaluation,
              status: "under_review"
            } 
          }
        )
      }
      
      return res.json({ success: true, message: "Evaluations saved" })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async awardQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const { quotationId } = req.body
      const rfqId = req.params.id

      // Award the winning quote
      await SupplierQuotation.updateOne(
        { _id: quotationId, org_id: req.org_id },
        { $set: { status: "awarded" } }
      )

      // Reject all other quotes for this RFQ
      await SupplierQuotation.updateMany(
        { rfqId, org_id: req.org_id, _id: { $ne: quotationId } },
        { $set: { status: "rejected" } }
      )

      // Close the RFQ
      const rfq = await Rfq.findOneAndUpdate(
        { _id: rfqId, org_id: req.org_id },
        { $set: { status: "awarded" } },
        { new: true }
      )

      return res.json({ success: true, message: "Quotation awarded and RFQ closed", data: rfq })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
