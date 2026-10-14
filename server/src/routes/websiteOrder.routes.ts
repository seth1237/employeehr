import { Router } from "express"
import { WebsiteOrder } from "../models/WebsiteOrder"
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth"

const router = Router()

function callbackTokenOk(header: unknown, queryToken: unknown) {
  const expected = String(process.env.MPESA_CALLBACK_TOKEN || "").trim()
  if (!expected) return true
  const provided = String(header || queryToken || "").trim()
  return provided === expected
}

async function notifyShop(body: Record<string, unknown>) {
  const shop = String(process.env.SHOP_API_URL || "https://raibackend.codewithseth.co.ke").replace(/\/$/, "")
  const token = String(process.env.MPESA_CALLBACK_TOKEN || "").trim()
  if (!token) return
  try {
    await fetch(`${shop}/api/integrations/order-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-callback-token": token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
  } catch (error: any) {
    console.error("[website-order] Shop status was not updated:", error?.message)
  }
}

router.post("/", async (req, res) => {
  if (!callbackTokenOk(req.headers["x-callback-token"], req.query.token)) {
    return res.status(403).json({ success: false, message: "Invalid callback token" })
  }
  const shopOrderId = String(req.body?.shopOrderId || "").trim()
  const checkoutRequestId = String(req.body?.checkoutRequestId || "").trim()
  if (!shopOrderId && !checkoutRequestId) {
    return res.status(400).json({ success: false, message: "An order id is required" })
  }
  const patch = {
    org_id: String(process.env.ERP_ORG_ID || process.env.CFT_TARGET_ORG_ID || ""),
    shopOrderId: shopOrderId || undefined,
    customerName: req.body?.customerName,
    phone: req.body?.phone,
    email: req.body?.email,
    location: req.body?.location,
    items: Array.isArray(req.body?.items) ? req.body.items : undefined,
    total: req.body?.total,
    status: req.body?.status,
    paymentStatus: req.body?.paymentStatus,
    checkoutRequestId: checkoutRequestId || undefined,
    merchantRequestId: req.body?.merchantRequestId,
    mpesaReceipt: req.body?.mpesaReceipt,
    resultDesc: req.body?.resultDesc,
    quotationNumber: req.body?.quotationNumber,
  }
  const clean = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined && value !== ""))
  const query = checkoutRequestId ? { checkoutRequestId } : { shopOrderId }
  const order = await WebsiteOrder.findOneAndUpdate(query, { $set: clean }, { upsert: true, new: true, setDefaultsOnInsert: true })
  return res.json({ success: true, id: String(order._id) })
})

router.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const orgId = String(req.org_id || "")
  const shopOrg = "69d63bdcc81e84290298784d"
  const rows = await WebsiteOrder.find(orgId ? { org_id: { $in: [orgId, shopOrg, ""] } } : {})
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
  return res.json({
    success: true,
    orders: rows.map((row) => ({
      id: String(row._id),
      shopOrderId: row.shopOrderId,
      customerName: row.customerName,
      phone: row.phone,
      email: row.email,
      location: row.location,
      items: row.items || [],
      total: row.total,
      status: row.status,
      paymentStatus: row.paymentStatus,
      mpesaReceipt: row.mpesaReceipt,
      quotationNumber: row.quotationNumber,
      createdAt: row.createdAt,
    })),
  })
})

router.patch("/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const status = String(req.body?.status || "").trim()
  if (status !== "dispatched" && status !== "delivered") {
    return res.status(400).json({ success: false, message: "Mark the order as dispatched or delivered" })
  }
  const order = await WebsiteOrder.findById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: "Order not found" })
  if (order.paymentStatus !== "paid") {
    return res.status(400).json({ success: false, message: "The M-Pesa payment is not confirmed yet" })
  }
  if (status === "delivered" && order.status !== "dispatched" && order.status !== "delivered") {
    return res.status(400).json({ success: false, message: "Dispatch the order before marking it delivered" })
  }
  order.status = status
  await order.save()
  await notifyShop({
    checkoutRequestId: order.checkoutRequestId,
    status,
    mpesaReceipt: order.mpesaReceipt,
  })
  return res.json({ success: true, status })
})

export async function applyWebsiteOrderCallback(parsed: {
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  mpesaReceiptNumber: string
}) {
  if (!parsed.checkoutRequestId) return null
  const order = await WebsiteOrder.findOne({ checkoutRequestId: parsed.checkoutRequestId })
  if (!order) return null
  const paid = parsed.resultCode === 0
  order.paymentStatus = paid ? "paid" : "failed"
  order.resultDesc = parsed.resultDesc || ""
  if (paid && order.status === "awaiting_payment") order.status = "paid"
  if (parsed.mpesaReceiptNumber) order.mpesaReceipt = parsed.mpesaReceiptNumber
  await order.save()
  await notifyShop({
    checkoutRequestId: order.checkoutRequestId,
    status: paid ? "paid" : order.status,
    mpesaReceipt: order.mpesaReceipt,
    resultDesc: order.resultDesc,
  })
  return order
}

export default router
