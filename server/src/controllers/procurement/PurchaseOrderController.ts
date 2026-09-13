import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { PurchaseOrder } from "../../models/PurchaseOrder"
import { PurchaseRequest } from "../../models/PurchaseRequest"
import { DepartmentBudget } from "../../models/DepartmentBudget"

export class PurchaseOrderController {
  
  static async getOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const orders = await PurchaseOrder.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: orders })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getOrderById(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!order) return res.status(404).json({ success: false, message: "Purchase Order not found" })
      return res.json({ success: true, data: order })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { items, purchaseRequestId } = req.body
      
      // Calculate totals
      let subTotal = 0
      let taxAmount = 0
      
      const processedItems = items.map((item: any) => {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice)
        const itemTax = lineTotal * (Number(item.taxRate || 0) / 100)
        
        subTotal += lineTotal
        taxAmount += itemTax
        
        return {
          ...item,
          lineTotal
        }
      })
      
      const grandTotal = subTotal + taxAmount

      const count = await PurchaseOrder.countDocuments({ org_id: req.org_id })
      const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

      const order = await PurchaseOrder.create({
        ...req.body,
        items: processedItems,
        org_id: req.org_id,
        poNumber,
        issuedBy: req.user?._id,
        subTotal,
        taxAmount,
        grandTotal,
        status: "draft"
      })

      // Update PR status if linked
      if (purchaseRequestId) {
        await PurchaseRequest.updateOne(
          { _id: purchaseRequestId, org_id: req.org_id },
          { $set: { status: "converted_to_po" } }
        )
      }

      return res.status(201).json({ success: true, data: order })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async updateOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!order) return res.status(404).json({ success: false, message: "Order not found" })

      if (order.status !== "draft" && order.status !== "pending_approval") {
        return res.status(400).json({ success: false, message: "Only draft or pending orders can be modified" })
      }

      // If items are updated, recalculate totals
      if (req.body.items) {
        let subTotal = 0
        let taxAmount = 0
        
        req.body.items = req.body.items.map((item: any) => {
          const lineTotal = Number(item.quantity) * Number(item.unitPrice)
          const itemTax = lineTotal * (Number(item.taxRate || 0) / 100)
          subTotal += lineTotal
          taxAmount += itemTax
          return { ...item, lineTotal }
        })
        
        req.body.subTotal = subTotal
        req.body.taxAmount = taxAmount
        req.body.grandTotal = subTotal + taxAmount
      }

      const updated = await PurchaseOrder.findOneAndUpdate(
        { _id: req.params.id, org_id: req.org_id },
        { $set: req.body },
        { new: true }
      )

      return res.json({ success: true, data: updated })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async approveOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!order) return res.status(404).json({ success: false, message: "Order not found" })

      if (order.status !== "pending_approval" && order.status !== "draft") {
        return res.status(400).json({ success: false, message: "Order cannot be approved in current state" })
      }

      order.status = "approved"
      order.approvedBy = req.user?._id

      // If tied to a PR that reserved budget, we should technically convert that reserved commitment
      // to an active PO commitment, but for simplicity we keep it as 'committed' until inversed.

      await order.save()
      return res.json({ success: true, data: order })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async sendOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!order) return res.status(404).json({ success: false, message: "Order not found" })

      if (order.status !== "approved") {
        return res.status(400).json({ success: false, message: "Only approved orders can be sent" })
      }

      order.status = "sent"
      // Logic to actually email the supplier PDF would go here

      await order.save()
      return res.json({ success: true, data: order })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
