export type ParsedStkCallback = {
  merchantRequestId: string
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  mpesaReceiptNumber: string
  amount: number
  phone: string
  rawPayload: unknown
}

function findMetadataValue(items: any[], name: string) {
  return items.find((item) => String(item?.Name || "") === name)?.Value
}

export function parseStkCallback(body: any): ParsedStkCallback {
  const stkCallback = body?.Body?.stkCallback
  const items = Array.isArray(stkCallback?.CallbackMetadata?.Item)
    ? stkCallback.CallbackMetadata.Item
    : []

  return {
    merchantRequestId: String(stkCallback?.MerchantRequestID || "").trim(),
    checkoutRequestId: String(stkCallback?.CheckoutRequestID || "").trim(),
    resultCode: Number(stkCallback?.ResultCode),
    resultDesc: String(stkCallback?.ResultDesc || "").trim(),
    mpesaReceiptNumber: String(findMetadataValue(items, "MpesaReceiptNumber") || "").trim(),
    amount: Number(findMetadataValue(items, "Amount") || 0),
    phone: String(findMetadataValue(items, "PhoneNumber") || "").trim(),
    rawPayload: body,
  }
}

export function normalizeMpesaReceipt(code: string) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "")
}
