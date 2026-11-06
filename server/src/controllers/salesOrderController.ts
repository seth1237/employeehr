import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { StockSalesOrder } from "../models/StockSalesOrder"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"
import { StockProduct } from "../models/StockProduct"
import {
  generateDocumentNumber,
  isAdminRole,
  isOwnDocumentsRole,
} from "./stock/stockShared"
import {
  isStockManagedLine,
  releaseReservation,
  reserveStock,
} from "../services/inventoryCosting.service"

function actorOf(req: AuthenticatedRequest) {
  return {
    orgId: req.user?.org_id || (req as any).org_id,
    userId: req.user?.userId,
    role: req.user?.role,
  }
}

function isManaged(item: any, product?: any) {
  return isStockManagedLine(item, product)
}

export class SalesOrderController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { orgId, userId, role } = actorOf(req)
      if (!orgId) return res.status(401).json({ success: false, message: "Unauthorized" })
      const query: Record<string, unknown> = { org_id: orgId }
      if (isOwnDocumentsRole(role)) query.createdBy = String(userId)
      const status = typeof req.query.status === "string" ? req.query.status.trim() : ""
      if (status) query.status = status
      const orders = await StockSalesOrder.find(query).sort({ createdAt: -1 }).lean()
      return res.json({ success: true, data: orders })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load sales orders",
      })
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { orgId, userId, role } = actorOf(req)
      if (!orgId) return res.status(401).json({ success: false, message: "Unauthorized" })
      const order = await StockSalesOrder.findOne({
        _id: req.params.orderId,
        org_id: orgId,
      }).lean()
      if (!order) return res.status(404).json({ success: false, message: "Sales order not found" })
      if (isOwnDocumentsRole(role) && String(order.createdBy) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Not allowed" })
      }
      return res.json({ success: true, data: order })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load sales order",
      })
    }
  }

  static async fromQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const { orgId, userId, role } = actorOf(req)
      if (!orgId || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const quotation = await StockQuotation.findOne({
        _id: req.params.quotationId,
        org_id: orgId,
      })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }
      if (quotation.status === "pending_approval") {
        return res.status(400).json({
          success: false,
          message: "Approve the quotation before creating a sales order",
        })
      }
      if (quotation.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot convert a cancelled quotation",
        })
      }

      if ((quotation as any).convertedSalesOrderId) {
        const existing = await StockSalesOrder.findById((quotation as any).convertedSalesOrderId)
        if (existing) return res.json({ success: true, data: existing })
      }

      if (quotation.convertedInvoiceId) {
        const existingInvoice = await StockInvoice.findById(quotation.convertedInvoiceId)
        if (existingInvoice) {
          return res.status(200).json({
            success: true,
            data: existingInvoice,
            legacyInvoice: true,
          })
        }
      }

      if (role === "sales_rep" && String(quotation.createdBy || "") !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: "You can only convert your own quotations",
        })
      }
      if (role === "sales_rep" && !quotation.approvedAt) {
        return res.status(400).json({
          success: false,
          message: "Wait for admin approval before creating a sales order",
        })
      }
      if (role !== "sales_rep" && !isAdminRole(role)) {
        return res.status(403).json({
          success: false,
          message: "Only admin/HR or the sales owner can create a sales order",
        })
      }

      const productIds = [
        ...new Set(quotation.items.map((item: any) => String(item.productId || "")).filter(Boolean)),
      ]
      const products = await StockProduct.find({ _id: { $in: productIds }, org_id: orgId })
      const productMap = new Map(products.map((product) => [String(product._id), product]))

      const items = quotation.items.map((item: any) => {
        const product = productMap.get(String(item.productId))
        const managed = isManaged(item, product)
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity || 1),
          reservedQuantity: 0,
          invoicedQuantity: 0,
          productUnitPrice: item.productUnitPrice,
          soldUnitPrice: item.soldUnitPrice,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          taxable: item.taxable,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          totalAfterTax: item.totalAfterTax,
          description: item.description,
          productDescription: item.productDescription,
          productType: item.productType || product?.productType,
          isOutsourced: Boolean(item.isOutsourced || product?.isOutsourced),
          imageUrl: item.imageUrl,
          _managed: managed,
        }
      })

      const reserved: Array<{ productId: string; quantity: number }> = []
      try {
        for (const item of items) {
          if (!item._managed) continue
          await reserveStock({
            orgId,
            productId: String(item.productId),
            quantity: item.quantity,
            productName: item.productName,
          })
          item.reservedQuantity = item.quantity
          reserved.push({ productId: String(item.productId), quantity: item.quantity })
        }
      } catch (error) {
        for (const entry of reserved) {
          await releaseReservation({
            orgId,
            productId: entry.productId,
            quantity: entry.quantity,
          })
        }
        throw error
      }

      const order = await StockSalesOrder.create({
        org_id: orgId,
        orderNumber: generateDocumentNumber("SO"),
        quotationId: String(quotation._id),
        quotationNumber: quotation.quotationNumber,
        client: quotation.client,
        items: items.map(({ _managed, ...item }) => item),
        subTotal: quotation.subTotal,
        taxTotal: Number((quotation as any).taxTotal || 0),
        grandTotal: Number(
          (quotation as any).grandTotal ||
            Number(quotation.subTotal || 0) + Number((quotation as any).taxTotal || 0),
        ),
        status: "confirmed",
        branchId: quotation.branchId,
        ownerUserId: quotation.ownerUserId || quotation.createdBy,
        createdBy: String(quotation.createdBy || userId),
        reservedAt: new Date(),
      })

      quotation.status = "converted"
      ;(quotation as any).convertedSalesOrderId = String(order._id)
      await quotation.save()

      return res.status(201).json({
        success: true,
        message: "Sales order confirmed and stock reserved",
        data: order,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create sales order",
      })
    }
  }

  static async convertToInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { orgId, userId, role } = actorOf(req)
      if (!orgId || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const order = await StockSalesOrder.findOne({
        _id: req.params.orderId,
        org_id: orgId,
      })
      if (!order) return res.status(404).json({ success: false, message: "Sales order not found" })
      if (order.status === "cancelled") {
        return res.status(400).json({ success: false, message: "Cannot invoice a cancelled order" })
      }
      if (order.convertedInvoiceId) {
        const existing = await StockInvoice.findById(order.convertedInvoiceId)
        if (existing) return res.json({ success: true, data: existing })
      }

      if (role === "sales_rep" && String(order.createdBy) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Not allowed" })
      }
      if (role !== "sales_rep" && !isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can invoice this order" })
      }

      const transportCost = Number(req.body?.transportCost || 0)
      const transportNote = req.body?.transportNote ? String(req.body.transportNote).trim() : undefined
      const transportFields =
        Number.isFinite(transportCost) && transportCost > 0
          ? {
              transportCost: Number(transportCost.toFixed(2)),
              ...(transportNote ? { transportNote } : {}),
            }
          : transportNote
            ? { transportNote }
            : {}

      const stockManagedItems = order.items.filter((item) => isManaged(item))
      const invoiceStatus = role === "sales_rep" ? "pending_approval" : "draft"

      const invoice = await StockInvoice.create({
        org_id: orgId,
        invoiceNumber: generateDocumentNumber("INV"),
        deliveryNoteNumber: generateDocumentNumber("DN"),
        quotationId: order.quotationId,
        quotationNumber: order.quotationNumber,
        salesOrderId: String(order._id),
        salesOrderNumber: order.orderNumber,
        client: order.client,
        items: order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          taxable: item.taxable,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          totalAfterTax: item.totalAfterTax,
          description: item.description,
          productDescription: item.productDescription,
          productType: item.productType,
          isOutsourced: item.isOutsourced,
        })),
        subTotal: order.subTotal,
        taxTotal: Number(order.taxTotal || 0),
        grandTotal: Number(order.grandTotal || order.subTotal || 0),
        ...transportFields,
        status: invoiceStatus,
        dispatch: {
          status: "not_assigned",
          packingItems: stockManagedItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            requiredQuantity: item.quantity,
            packedQuantity: 0,
          })),
          packingCompleted: stockManagedItems.length === 0,
          inquiries: [],
        },
        createdBy: String(order.createdBy || userId),
      })

      order.items = order.items.map((item) => ({
        ...item,
        invoicedQuantity: item.quantity,
      }))
      order.convertedInvoiceId = String(invoice._id)
      order.status = "invoiced"
      order.invoicedAt = new Date()
      await order.save()

      if (order.quotationId) {
        await StockQuotation.updateOne(
          { _id: order.quotationId, org_id: orgId },
          { $set: { convertedInvoiceId: String(invoice._id) } },
        )
      }

      return res.status(201).json({
        success: true,
        message:
          invoiceStatus === "pending_approval"
            ? "Invoice submitted for admin approval"
            : "Draft invoice created from sales order — post to issue stock",
        data: invoice,
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to convert sales order",
      })
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response) {
    try {
      const { orgId, userId, role } = actorOf(req)
      if (!orgId || !userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      if (!isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can cancel sales orders" })
      }
      const order = await StockSalesOrder.findOne({
        _id: req.params.orderId,
        org_id: orgId,
      })
      if (!order) return res.status(404).json({ success: false, message: "Sales order not found" })
      if (order.status === "cancelled") {
        return res.status(400).json({ success: false, message: "Sales order is already cancelled" })
      }
      if (order.status === "invoiced") {
        return res.status(400).json({
          success: false,
          message: "Cancel or credit the invoice instead of the sales order",
        })
      }

      for (const item of order.items) {
        if (Number(item.reservedQuantity || 0) > 0) {
          await releaseReservation({
            orgId,
            productId: String(item.productId),
            quantity: Number(item.reservedQuantity || 0),
          })
          item.reservedQuantity = 0
        }
      }
      order.status = "cancelled"
      order.cancelledAt = new Date()
      order.cancelReason = String(req.body?.reason || "").trim() || undefined
      await order.save()

      return res.json({ success: true, data: order, message: "Sales order cancelled and stock released" })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to cancel sales order",
      })
    }
  }
}
