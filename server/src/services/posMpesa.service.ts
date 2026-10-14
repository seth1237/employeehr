import { CashBankAccount } from "../models/CashBankAccount"
import { PosMpesaPayment } from "../models/PosMpesaPayment"
import { normalizeMpesaReceipt, type ParsedStkCallback } from "../lib/mpesaCallback"
import { mpesaService } from "./mpesa.service"

export async function resolveStkParty(orgId?: string) {
  const party = mpesaService.partyFromEnv()
  if (party.tillNumber || party.mode === "till") return party
  if (!orgId) return party

  const account = await CashBankAccount.findOne({
    org_id: orgId,
    type: "mpesa",
    status: "active",
    mpesaMode: "till",
    mpesaIdentifier: { $nin: [null, ""] },
  })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean()
  const till = String(account?.mpesaIdentifier || "").trim()
  if (!till) return party
  return {
    ...party,
    businessShortCode: till,
    partyB: till,
    transactionType: "CustomerBuyGoodsOnline",
    tillNumber: till,
    mode: "till" as const,
    label: `Till ${till}`,
  }
}

const SIM_CONFIRM_MS = 2800
const AMOUNT_TOLERANCE = 1

function kes(value: number) {
  return Number((Number(value) || 0).toFixed(2))
}

function simulatedReceipt(checkoutRequestId: string) {
  const tail = String(checkoutRequestId || "").replace(/\D/g, "").slice(-8) || String(Date.now()).slice(-8)
  return `SIM${tail}`.slice(0, 10).toUpperCase()
}

export function serializePosMpesa(row: any) {
  return {
    id: String(row?._id || ""),
    phone: row?.phone || "",
    amount: kes(row?.amount),
    checkoutRequestId: row?.checkoutRequestId || "",
    merchantRequestId: row?.merchantRequestId || "",
    status: row?.status || "pending",
    resultCode: row?.resultCode || "",
    resultDesc: row?.resultDesc || "",
    mpesaReceiptCode: row?.mpesaReceiptCode || "",
    used: Boolean(row?.usedSaleId),
    createdAt: row?.createdAt,
    confirmedAt: row?.confirmedAt,
  }
}

async function confirmSimulated(row: any) {
  const age = Date.now() - new Date(row.createdAt || Date.now()).getTime()
  if (age < SIM_CONFIRM_MS) {
    return row
  }
  row.status = "confirmed"
  row.resultCode = "0"
  row.resultDesc = "Simulated M-Pesa payment confirmed"
  row.mpesaReceiptCode = row.mpesaReceiptCode || simulatedReceipt(row.checkoutRequestId)
  row.confirmedAt = row.confirmedAt || new Date()
  await row.save()
  return row
}

export async function createPosStkPayment(input: {
  orgId: string
  cashierId: string
  phone: string
  amount: number
}) {
  const phone = mpesaService.normalizePhone(input.phone) || String(input.phone || "").trim()
  const amount = kes(input.amount)
  if (!phone) throw new Error("Enter the customer M-Pesa phone number")
  if (amount <= 0) throw new Error("Enter the amount to request on M-Pesa")

  const party = await resolveStkParty(input.orgId)
  const result = await mpesaService.initiateStkPush({
    payerPhone: phone,
    amount,
    accountReference: `POS${String(input.cashierId || "").slice(-6)}`.slice(0, 12),
    transactionDesc: "POS sale",
    businessShortCode: party.businessShortCode,
    partyB: party.partyB,
    transactionType: party.transactionType,
  })
  if (!result.success || !result.checkoutRequestId) {
    throw new Error(
      result.responseMessage ||
        "M-Pesa payment failed. The customer didn't confirm the request. Try again or choose another payment method.",
    )
  }

  const row = await PosMpesaPayment.create({
    org_id: input.orgId,
    cashierId: input.cashierId,
    phone,
    amount,
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId || "",
    status: "pending",
    resultDesc: result.responseMessage,
  })

  return {
    payment: serializePosMpesa(row),
    message: result.simulated
      ? "Test prompt sent. Wait a few seconds, then check payment."
      : "Ask the customer to enter their M-Pesa PIN.",
    simulated: Boolean(result.simulated),
  }
}

export async function applyPosMpesaCallback(parsed: ParsedStkCallback) {
  if (!parsed.checkoutRequestId) return null
  const row = await PosMpesaPayment.findOne({ checkoutRequestId: parsed.checkoutRequestId })
  if (!row) return null

  const success = parsed.resultCode === 0
  row.status = success ? "confirmed" : "failed"
  row.resultCode = String(parsed.resultCode)
  row.resultDesc = parsed.resultDesc || (success ? "Payment completed" : "Payment failed")
  row.merchantRequestId = parsed.merchantRequestId || row.merchantRequestId
  row.rawCallback = parsed.rawPayload
  if (parsed.mpesaReceiptNumber) {
    row.mpesaReceiptCode = normalizeMpesaReceipt(parsed.mpesaReceiptNumber)
  }
  if (parsed.phone) row.phone = String(parsed.phone)
  if (parsed.amount > 0) row.amount = kes(parsed.amount)
  if (success) row.confirmedAt = new Date()
  await row.save()
  return row
}

export async function refreshPosMpesaStatus(orgId: string, checkoutRequestId: string) {
  const row = await PosMpesaPayment.findOne({
    org_id: orgId,
    checkoutRequestId: String(checkoutRequestId || "").trim(),
  })
  if (!row) throw new Error("That M-Pesa prompt was not found")

  if (row.status === "confirmed" || row.status === "failed" || row.status === "expired") {
    return serializePosMpesa(row)
  }

  const simulated = !mpesaService.isConfigured() || String(row.checkoutRequestId).startsWith("SIM-")
  if (simulated) {
    await confirmSimulated(row)
    return serializePosMpesa(row)
  }

  const query = await mpesaService.queryStkPush(row.checkoutRequestId)
  if (query.success) {
    row.status = "confirmed"
    row.resultCode = query.resultCode || "0"
    row.resultDesc = query.resultDesc
    row.confirmedAt = row.confirmedAt || new Date()
    if (query.simulated && !row.mpesaReceiptCode) {
      row.mpesaReceiptCode = simulatedReceipt(row.checkoutRequestId)
    }
    await row.save()
  } else if (!query.pending) {
    row.status = "failed"
    row.resultCode = query.resultCode || ""
    row.resultDesc = query.resultDesc
    await row.save()
  } else if (query.resultDesc) {
    row.resultDesc = query.resultDesc
    await row.save()
  }

  return serializePosMpesa(row)
}

export async function lookupPosMpesaPayment(input: {
  orgId: string
  code: string
  amount?: number
  phone?: string
}) {
  const code = normalizeMpesaReceipt(input.code)
  if (code.length < 6) {
    throw new Error("Enter the full M-Pesa receipt code from the customer SMS")
  }

  const amount = kes(input.amount || 0)
  const phone = mpesaService.normalizePhone(input.phone || "")
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const matches = await PosMpesaPayment.find({
    org_id: input.orgId,
    createdAt: { $gte: since },
    mpesaReceiptCode: code,
  })
    .sort({ createdAt: -1 })
    .limit(5)

  let row = matches.find((item) => !item.usedSaleId && item.status === "confirmed") || matches[0]
  if (row?.usedSaleId) {
    throw new Error("That M-Pesa code was already used on another sale")
  }

  if (!row) {
    const pendingRows = await PosMpesaPayment.find({
      org_id: input.orgId,
      status: "pending",
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(12)
    const pending = pendingRows.find((item) => {
      const amountOk = amount <= 0 || Math.abs(kes(item.amount) - amount) <= AMOUNT_TOLERANCE
      if (!amountOk) return false
      if (!phone) return true
      const saved = String(item.phone || "")
      return saved.slice(-9) === phone.slice(-9)
    })

    if (pending) {
      const simulated = !mpesaService.isConfigured() || String(pending.checkoutRequestId).startsWith("SIM-")
      if (simulated) {
        pending.status = "confirmed"
        pending.mpesaReceiptCode = code
        pending.resultCode = "0"
        pending.resultDesc = "Matched from entered M-Pesa code"
        pending.confirmedAt = new Date()
        await pending.save()
        row = pending
      } else {
        const refreshed = await refreshPosMpesaStatus(input.orgId, pending.checkoutRequestId)
        if (refreshed.status === "confirmed") {
          const updated = await PosMpesaPayment.findById(pending._id)
          if (updated) {
            updated.mpesaReceiptCode = code
            await updated.save()
            row = updated
          }
        }
      }
    }
  }

  if (!row) {
    throw new Error(
      "No matching M-Pesa payment yet. Send STK and wait for the PIN, or check the code and try again.",
    )
  }

  if (row.status !== "confirmed") {
    throw new Error(row.resultDesc || "That M-Pesa payment is not confirmed yet")
  }

  if (amount > 0 && Math.abs(kes(row.amount) - amount) > AMOUNT_TOLERANCE) {
    throw new Error(
      `M-Pesa paid KSh ${kes(row.amount).toLocaleString("en-KE")} but this sale is KSh ${amount.toLocaleString("en-KE")}.`,
    )
  }

  return serializePosMpesa(row)
}

export async function listRecentPosMpesa(orgId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const rows = await PosMpesaPayment.find({
    org_id: orgId,
    createdAt: { $gte: since },
    status: { $in: ["pending", "confirmed"] },
  })
    .sort({ createdAt: -1 })
    .limit(15)
  return rows.map(serializePosMpesa)
}

export async function consumeConfirmedMpesa(input: {
  orgId: string
  amount: number
  checkoutRequestId?: string
  code?: string
  phone?: string
}) {
  const amount = kes(input.amount)
  const checkoutRequestId = String(input.checkoutRequestId || "").trim()
  const code = normalizeMpesaReceipt(input.code || "")
  let row = null as Awaited<ReturnType<typeof PosMpesaPayment.findOne>>

  if (checkoutRequestId) {
    row = await PosMpesaPayment.findOne({ org_id: input.orgId, checkoutRequestId })
    if (row && row.status === "pending") {
      await refreshPosMpesaStatus(input.orgId, checkoutRequestId)
      row = await PosMpesaPayment.findById(row._id)
    }
  }

  if ((!row || row.status !== "confirmed") && code) {
    const lookedUp = await lookupPosMpesaPayment({
      orgId: input.orgId,
      code,
      amount,
      phone: input.phone,
    })
    row = await PosMpesaPayment.findById(lookedUp.id)
  }

  if (!row || row.status !== "confirmed") {
    throw new Error(
      "M-Pesa is not confirmed yet. Wait for the PIN prompt, or enter the M-Pesa code and check payment.",
    )
  }
  if (row.usedSaleId) {
    throw new Error("That M-Pesa payment was already used on another sale")
  }
  if (Math.abs(kes(row.amount) - amount) > AMOUNT_TOLERANCE) {
    throw new Error(
      `M-Pesa paid KSh ${kes(row.amount).toLocaleString("en-KE")} but this sale is KSh ${amount.toLocaleString("en-KE")}.`,
    )
  }

  return row
}

export async function markPosMpesaUsed(id: string, saleId: string) {
  if (!id) return
  await PosMpesaPayment.updateOne({ _id: id }, { $set: { usedSaleId: saleId } })
}
