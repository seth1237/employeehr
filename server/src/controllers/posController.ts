import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import { PosSale } from "../models/PosSale"
import { StockCategory } from "../models/StockCategory"
import { StockInvoice } from "../models/StockInvoice"
import { StockInvoicePayment } from "../models/StockInvoicePayment"
import { StockProduct } from "../models/StockProduct"
import { StockSale } from "../models/StockSale"
import { User } from "../models/User"
import { lookupProductByCode } from "../lib/productBarcode"
import { mpesaService } from "../services/mpesa.service"
import { postInvoicePaymentToCashbook } from "../services/cashBankingPosting.service"
import {
  generateDocumentNumber,
  resolveLineTax,
  summarizeDocumentTotals,
} from "./stock/stockShared"

const POS_ROLES = new Set(["pos_cashier", "company_admin", "admin", "hr", "super_admin"])
const CASHIER_DISCOUNT_LIMIT = 10
const KES = (value: number) => Number((Number(value) || 0).toFixed(2))

function orgIdOf(req: AuthenticatedRequest) {
  return String(req.user?.org_id || (req as any).org_id || "")
}

function canUsePos(role?: string) {
  return Boolean(role && POS_ROLES.has(role))
}

function canSeeAllSales(role?: string) {
  return role === "company_admin" || role === "admin" || role === "hr" || role === "super_admin"
}

function cashierNameFrom(user: { firstName?: string; lastName?: string } | null, fallback: string) {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
  return name || fallback
}

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

async function nextReceipt(orgId: string) {
  const last = await PosSale.findOne({ org_id: orgId, receiptSeq: { $gt: 0 } })
    .sort({ receiptSeq: -1 })
    .select("receiptSeq")
    .lean()
  const seq = Number(last?.receiptSeq || 0) + 1
  return { seq, receiptNo: `POS-${String(seq).padStart(6, "0")}` }
}

async function nextHoldNo(orgId: string) {
  const last = await PosSale.findOne({ org_id: orgId, holdNo: { $gt: 0 } })
    .sort({ holdNo: -1 })
    .select("holdNo")
    .lean()
  return Number(last?.holdNo || 0) + 1
}

function mapProduct(product: any, categoryName = "") {
  const qty = Number(product.currentQuantity || 0)
  const min = Number(product.minAlertQuantity || 0)
  return {
    id: String(product._id),
    name: product.name,
    sku: product.sku || "",
    barcode: product.barcode || product.manufacturerBarcode || "",
    categoryId: String(product.category || ""),
    categoryName,
    sellingPrice: Number(product.sellingPrice || 0),
    quantity: qty,
    minAlertQuantity: min,
    imageUrl: product.imageUrl || "",
    taxable: Boolean(product.taxable),
    taxRate: Number(product.taxRate || 0),
    productType: product.productType || "product",
    stockStatus: qty <= 0 ? "out" : min > 0 && qty <= min ? "low" : "ok",
  }
}

function buildLines(products: Map<string, any>, items: any[]) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Add at least one item")
  }
  const lines = []
  for (const item of items) {
    const product = products.get(String(item.productId))
    if (!product) throw new Error("One of the products is no longer available")
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for ${product.name}`)
    }
    const isService = product.productType === "service" || product.isOutsourced
    const available = Number(product.currentQuantity || 0)
    if (!isService && available < quantity) {
      throw new Error(
        `${product.name} has only ${available} left in this branch. Remove the item or lower the quantity.`,
      )
    }
    const unitPrice = Number(product.sellingPrice || 0)
    const lineTotal = KES(quantity * unitPrice)
    const tax = resolveLineTax({
      taxable: product.taxable,
      taxRate: product.taxRate,
      lineTotal,
      fallbackTaxable: Boolean(product.taxable),
      fallbackTaxRate: Number(product.taxRate || 16),
    })
    lines.push({
      productId: String(product._id),
      productName: product.name,
      sku: product.sku || "",
      quantity,
      unitPrice,
      lineTotal,
      taxable: tax.taxable,
      taxRate: tax.taxRate,
      taxAmount: tax.taxAmount,
      isService,
    })
  }
  return lines
}

function applySaleDiscount(lines: Array<any>, discountPercent = 0, discountAmount = 0, role?: string) {
  const totals = summarizeDocumentTotals(lines)
  let percent = Math.max(0, Number(discountPercent || 0))
  let amount = Math.max(0, Number(discountAmount || 0))
  if (percent > 0) amount = KES((totals.subTotal * percent) / 100)
  if (totals.subTotal > 0 && amount > 0) percent = KES((amount / totals.subTotal) * 100)
  if (percent > CASHIER_DISCOUNT_LIMIT && !canSeeAllSales(role)) {
    throw new Error(`Discounts over ${CASHIER_DISCOUNT_LIMIT}% need supervisor approval.`)
  }
  if (amount > totals.subTotal) amount = totals.subTotal
  const factor = totals.subTotal > 0 ? (totals.subTotal - amount) / totals.subTotal : 1
  const discounted = lines.map((line) => {
    const lineTotal = KES(line.lineTotal * factor)
    const tax = resolveLineTax({
      taxable: line.taxable,
      taxRate: line.taxRate,
      lineTotal,
      fallbackTaxable: line.taxable,
      fallbackTaxRate: line.taxRate,
    })
    return { ...line, lineTotal, taxAmount: tax.taxAmount, taxRate: tax.taxRate, taxable: tax.taxable }
  })
  const next = summarizeDocumentTotals(discounted)
  return {
    lines: discounted,
    subtotal: totals.subTotal,
    discountAmount: amount,
    discountPercent: percent,
    taxTotal: next.taxTotal,
    total: next.grandTotal,
  }
}

function normalizePayments(input: any[], total: number) {
  if (!Array.isArray(input) || !input.length) {
    throw new Error("Add a payment method")
  }
  const payments = input.map((row) => {
    const method = String(row.method || "").toLowerCase()
    if (!["cash", "mpesa", "card", "bank"].includes(method)) {
      throw new Error("Use cash, M-Pesa, card, or bank")
    }
    const tendered = KES(row.tendered ?? row.amount ?? 0)
    const amount = method === "cash" ? Math.min(tendered, total) : KES(row.amount ?? 0)
    if (amount <= 0) throw new Error("Each payment needs an amount")
    const reference = String(row.reference || row.mpesaReceiptCode || "").trim()
    const phone = String(row.phone || "").trim()
    if (method === "mpesa" && !reference && !phone) {
      throw new Error("Enter the M-Pesa code or the customer phone number")
    }
    if ((method === "card" || method === "bank") && !reference) {
      throw new Error("Enter the card or bank reference")
    }
    return {
      method,
      amount,
      tendered: method === "cash" ? tendered : amount,
      change: method === "cash" ? KES(Math.max(0, tendered - amount)) : 0,
      reference,
      phone,
      mpesaReceiptCode: method === "mpesa" ? reference : "",
      mpesaCheckoutRequestId: String(row.mpesaCheckoutRequestId || "").trim(),
      status: "confirmed" as const,
    }
  })
  const paid = KES(payments.reduce((sum, row) => sum + row.amount, 0))
  if (paid + 0.009 < total) {
    throw new Error(
      `Amount received is KSh ${KES(total - paid).toLocaleString("en-KE")} short. Enter the full amount or add another payment method.`,
    )
  }
  return payments
}

export class PosController {
  static async bootstrap(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!canUsePos(req.user?.role)) {
        return res.status(403).json({ success: false, message: "This login is not a POS till" })
      }

      const { start, end } = todayRange()
      const cashierFilter = canSeeAllSales(req.user?.role)
        ? {}
        : { cashierId: String(req.user?.userId) }

      const [company, user, categories, products, heldCount, todaySales] = await Promise.all([
        Company.findById(orgId)
          .select("name logo primaryColor phone city country invoiceSettings")
          .lean(),
        User.findById(req.user?.userId).select("firstName lastName role").lean(),
        StockCategory.find({ org_id: orgId }).select("name").sort({ name: 1 }).lean(),
        StockProduct.find({ org_id: orgId, isActive: { $ne: false } })
          .select(
            "name sku barcode manufacturerBarcode category sellingPrice currentQuantity minAlertQuantity imageUrl taxable taxRate productType isOutsourced",
          )
          .sort({ currentQuantity: -1, name: 1 })
          .limit(250)
          .lean(),
        PosSale.countDocuments({ org_id: orgId, status: "held", ...cashierFilter }),
        PosSale.find({
          org_id: orgId,
          status: "completed",
          completedAt: { $gte: start, $lte: end },
          ...cashierFilter,
        })
          .select("total")
          .lean(),
      ])

      const categoryMap = new Map(categories.map((row) => [String(row._id), row.name]))
      return res.json({
        success: true,
        data: {
          cashier: {
            id: String(req.user?.userId),
            name: cashierNameFrom(user, "Cashier"),
            role: req.user?.role,
          },
          company: {
            name: company?.name || "Elevate",
            logo: company?.logo || "",
            phone: company?.phone || company?.invoiceSettings?.contactPhone || "",
            address:
              company?.invoiceSettings?.officeLocation ||
              [company?.city, company?.country].filter(Boolean).join(", "),
            pinNumber: company?.invoiceSettings?.pinNumber || "",
            vatNumber: company?.invoiceSettings?.vatNumber || "",
            primaryColor: company?.primaryColor || "#0f766e",
          },
          categories: categories.map((row) => ({ id: String(row._id), name: row.name })),
          products: products.map((product) =>
            mapProduct(product, categoryMap.get(String(product.category || "")) || ""),
          ),
          heldCount,
          today: {
            count: todaySales.length,
            total: KES(todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)),
          },
          discountLimit: canSeeAllSales(req.user?.role) ? 100 : CASHIER_DISCOUNT_LIMIT,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to open till" })
    }
  }

  static async catalog(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!canUsePos(req.user?.role)) {
        return res.status(403).json({ success: false, message: "This login is not a POS till" })
      }
      const q = String(req.query.q || "").trim()
      const categoryId = String(req.query.categoryId || "").trim()
      const filter: any = { org_id: orgId, isActive: { $ne: false } }
      if (categoryId) filter.category = categoryId
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        filter.$or = [{ name: rx }, { sku: rx }, { barcode: rx }, { manufacturerBarcode: rx }]
      }
      const products = await StockProduct.find(filter)
        .select(
          "name sku barcode manufacturerBarcode category sellingPrice currentQuantity minAlertQuantity imageUrl taxable taxRate productType isOutsourced",
        )
        .sort({ name: 1 })
        .limit(80)
        .lean()
      const categoryIds = [...new Set(products.map((row) => String(row.category || "")).filter(Boolean))]
      const categories = categoryIds.length
        ? await StockCategory.find({ _id: { $in: categoryIds }, org_id: orgId }).select("name").lean()
        : []
      const categoryMap = new Map(categories.map((row) => [String(row._id), row.name]))
      return res.json({
        success: true,
        data: products.map((product) =>
          mapProduct(product, categoryMap.get(String(product.category || "")) || ""),
        ),
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Search failed" })
    }
  }

  static async lookup(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!canUsePos(req.user?.role)) {
        return res.status(403).json({ success: false, message: "This login is not a POS till" })
      }
      const code = String(req.body?.code || req.query.code || "").trim()
      if (code.length < 3) {
        return res.status(400).json({ success: false, message: "Scan at least 3 characters" })
      }
      const product = await lookupProductByCode(orgId, code)
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Barcode not recognised. Scan again or search by name.",
        })
      }
      return res.json({ success: true, data: mapProduct(product) })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Lookup failed" })
    }
  }

  static async hold(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      const cashierId = String(req.user?.userId || "")
      if (!orgId || !cashierId) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!canUsePos(req.user?.role)) {
        return res.status(403).json({ success: false, message: "This login is not a POS till" })
      }
      const productIds = [...new Set((req.body?.items || []).map((item: any) => String(item.productId)))]
      const products = await StockProduct.find({ _id: { $in: productIds }, org_id: orgId })
      const priced = applySaleDiscount(
        buildLines(new Map(products.map((row) => [String(row._id), row])), req.body?.items || []),
        req.body?.discountPercent,
        req.body?.discountAmount,
        req.user?.role,
      )
      const user = await User.findById(cashierId).select("firstName lastName").lean()
      const holdNo = await nextHoldNo(orgId)
      const sale = await PosSale.create({
        org_id: orgId,
        holdNo,
        cashierId,
        cashierName: cashierNameFrom(user, "Cashier"),
        status: "held",
        customerName: String(req.body?.customerName || "Walk-in").trim() || "Walk-in",
        customerPhone: String(req.body?.customerPhone || "").trim(),
        items: priced.lines,
        subtotal: priced.subtotal,
        discountAmount: priced.discountAmount,
        discountPercent: priced.discountPercent,
        discountReason: String(req.body?.discountReason || "").trim(),
        taxTotal: priced.taxTotal,
        total: priced.total,
        payments: [],
        heldAt: new Date(),
      })
      return res.status(201).json({
        success: true,
        message: `Sale held as #${holdNo}. Resume it anytime from Held sales.`,
        data: sale,
      })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || "Could not hold sale" })
    }
  }

  static async listHolds(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) return res.status(401).json({ success: false, message: "Unauthorized" })
      const filter: any = { org_id: orgId, status: "held" }
      if (!canSeeAllSales(req.user?.role)) filter.cashierId = String(req.user?.userId)
      const holds = await PosSale.find(filter).sort({ heldAt: -1 }).limit(50).lean()
      return res.json({ success: true, data: holds })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to load held sales" })
    }
  }

  static async resumeHold(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      const sale = await PosSale.findOne({ _id: req.params.id, org_id: orgId, status: "held" })
      if (!sale) return res.status(404).json({ success: false, message: "That held sale was already used" })
      if (!canSeeAllSales(req.user?.role) && String(sale.cashierId) !== String(req.user?.userId)) {
        return res.status(403).json({ success: false, message: "This held sale belongs to another cashier" })
      }
      return res.json({ success: true, data: sale })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Could not resume sale" })
    }
  }

  static async checkout(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      const cashierId = String(req.user?.userId || "")
      if (!orgId || !cashierId) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!canUsePos(req.user?.role)) {
        return res.status(403).json({ success: false, message: "This login is not a POS till" })
      }

      const productIds = [...new Set((req.body?.items || []).map((item: any) => String(item.productId)))]
      const products = await StockProduct.find({ _id: { $in: productIds }, org_id: orgId })
      const productMap = new Map(products.map((row) => [String(row._id), row]))
      const priced = applySaleDiscount(
        buildLines(productMap, req.body?.items || []),
        req.body?.discountPercent,
        req.body?.discountAmount,
        req.user?.role,
      )
      const payments = normalizePayments(req.body?.payments || [], priced.total)
      const user = await User.findById(cashierId).select("firstName lastName").lean()
      const { seq, receiptNo } = await nextReceipt(orgId)
      const customerName = String(req.body?.customerName || "Walk-in").trim() || "Walk-in"
      const customerPhone = String(req.body?.customerPhone || "").trim() || "WALK-IN"

      const invoiceItems = priced.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        taxable: line.taxable,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        totalAfterTax: KES(line.lineTotal + line.taxAmount),
      }))

      const stockManaged = priced.lines.filter((line) => !line.isService)
      for (const line of stockManaged) {
        const product = productMap.get(line.productId)
        if (!product) continue
        product.currentQuantity = Math.max(0, Number(product.currentQuantity || 0) - line.quantity)
      }

      const invoice = await StockInvoice.create({
        org_id: orgId,
        invoiceNumber: generateDocumentNumber("INV"),
        deliveryNoteNumber: generateDocumentNumber("DN"),
        client: {
          name: customerName,
          number: customerPhone,
          location: "POS",
        },
        items: invoiceItems,
        subTotal: priced.subtotal,
        taxTotal: priced.taxTotal,
        grandTotal: priced.total,
        status: "paid",
        postedAt: new Date(),
        postedBy: cashierId,
        dispatch: {
          status: "delivered",
          packingItems: stockManaged.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            requiredQuantity: line.quantity,
            packedQuantity: line.quantity,
          })),
          packingCompleted: true,
          packingCompletedAt: new Date(),
          dispatchedAt: new Date(),
          dispatchedByUserId: cashierId,
          inquiries: [],
        },
        createdBy: cashierId,
      })

      if (products.length) await Promise.all(products.map((product) => product.save()))

      if (stockManaged.length) {
        await StockSale.insertMany(
          stockManaged.map((line) => ({
            org_id: orgId,
            productId: line.productId,
            quantitySold: line.quantity,
            soldPrice: line.unitPrice,
            soldBy: cashierId,
            buyerName: customerName,
            buyerNumber: customerPhone,
            buyerLocation: "POS",
            isWalkInClient: true,
            isSalesCompany: false,
            invoiceId: String(invoice._id),
            receiptNumber: receiptNo,
            remainingQuantity: Number(productMap.get(line.productId)?.currentQuantity || 0),
          })),
        )
      }

      for (const payment of payments) {
        const record = await StockInvoicePayment.create({
          org_id: orgId,
          invoiceId: String(invoice._id),
          invoiceNumber: String(invoice.invoiceNumber),
          amount: payment.amount,
          paymentMethod: payment.method,
          reference: payment.reference || payment.mpesaReceiptCode || receiptNo,
          paidAt: new Date(),
          receivedBy: cashierId,
        })
        try {
          await postInvoicePaymentToCashbook({
            orgId,
            userId: cashierId,
            payment: record,
          })
        } catch {
          // Cashbook is best-effort so the till is never blocked after stock left.
        }
      }

      const holdId = String(req.body?.holdId || "").trim()
      if (holdId) {
        await PosSale.updateOne(
          { _id: holdId, org_id: orgId, status: "held" },
          { $set: { status: "voided" } },
        )
      }

      const sale = await PosSale.create({
        org_id: orgId,
        receiptNo,
        receiptSeq: seq,
        cashierId,
        cashierName: cashierNameFrom(user, "Cashier"),
        status: "completed",
        customerName,
        customerPhone,
        items: priced.lines,
        subtotal: priced.subtotal,
        discountAmount: priced.discountAmount,
        discountPercent: priced.discountPercent,
        discountReason: String(req.body?.discountReason || "").trim(),
        taxTotal: priced.taxTotal,
        total: priced.total,
        payments,
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        completedAt: new Date(),
      })

      return res.status(201).json({
        success: true,
        message: `Payment received. Receipt ${receiptNo} is ready.`,
        data: sale,
      })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || "Could not complete sale" })
    }
  }

  static async listSales(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      if (!orgId) return res.status(401).json({ success: false, message: "Unauthorized" })
      const filter: any = { org_id: orgId, status: "completed" }
      if (!canSeeAllSales(req.user?.role)) filter.cashierId = String(req.user?.userId)
      const q = String(req.query.q || "").trim()
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        filter.$or = [{ receiptNo: rx }, { customerName: rx }, { customerPhone: rx }]
      }
      const sales = await PosSale.find(filter).sort({ completedAt: -1 }).limit(80).lean()
      return res.json({ success: true, data: sales })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to load sales" })
    }
  }

  static async getSale(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = orgIdOf(req)
      const sale = await PosSale.findOne({ _id: req.params.id, org_id: orgId })
      if (!sale) return res.status(404).json({ success: false, message: "Sale not found" })
      if (!canSeeAllSales(req.user?.role) && String(sale.cashierId) !== String(req.user?.userId)) {
        return res.status(403).json({ success: false, message: "You can only open your own sales" })
      }
      return res.json({ success: true, data: sale })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to open sale" })
    }
  }

  static async stkPush(req: AuthenticatedRequest, res: Response) {
    try {
      if (!canUsePos(req.user?.role)) {
        return res.status(403).json({ success: false, message: "This login is not a POS till" })
      }
      const phone = String(req.body?.phone || "").trim()
      const amount = KES(req.body?.amount || 0)
      if (!phone || amount <= 0) {
        return res.status(400).json({ success: false, message: "Enter the customer phone and amount" })
      }
      const result = await mpesaService.initiateStkPush({
        payerPhone: phone,
        amount,
        accountReference: `POS-${String(req.user?.userId || "").slice(-6)}`,
        transactionDesc: "POS sale",
      })
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message:
            result.responseMessage ||
            "M-Pesa payment failed. The customer didn't confirm the request. Try again or choose another payment method.",
        })
      }
      return res.json({
        success: true,
        message: "Waiting for M-Pesa. Ask the customer to enter their PIN.",
        data: result,
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "M-Pesa request failed" })
    }
  }
}
