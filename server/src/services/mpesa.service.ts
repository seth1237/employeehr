import axios from "axios"

interface InitiateStkInput {
  payerPhone: string
  amount: number
  accountReference: string
  transactionDesc: string
}

interface InitiateStkResult {
  success: boolean
  checkoutRequestId?: string
  merchantRequestId?: string
  responseMessage: string
  rawResponse?: string
}

class MpesaService {
  private readonly consumerKey = process.env.MPESA_CONSUMER_KEY || ""
  private readonly consumerSecret = process.env.MPESA_CONSUMER_SECRET || ""
  private readonly shortcode = process.env.MPESA_SHORTCODE || ""
  private readonly passkey = process.env.MPESA_PASSKEY || ""
  private readonly callbackUrl = process.env.MPESA_CALLBACK_URL || ""
  private readonly baseUrl = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke"
  private readonly defaultCountryCode = process.env.MPESA_DEFAULT_COUNTRY_CODE || "254"

  isConfigured() {
    return Boolean(this.consumerKey && this.consumerSecret && this.shortcode && this.passkey && this.callbackUrl)
  }

  normalizePhone(rawPhone: string): string {
    const trimmed = String(rawPhone || "").trim()
    if (!trimmed) return ""

    const normalized = trimmed.replace(/[\s()-]/g, "")
    const digits = normalized.replace(/\D/g, "")
    if (!digits) return ""

    if (digits.startsWith("0")) {
      return `${this.defaultCountryCode}${digits.slice(1)}`
    }

    if (digits.startsWith(this.defaultCountryCode)) {
      return digits
    }

    return digits
  }

  private async getAccessToken() {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString("base64")
    const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      timeout: 15000,
    })

    return String(response?.data?.access_token || "")
  }

  async initiateStkPush(input: InitiateStkInput): Promise<InitiateStkResult> {
    const normalizedPhone = this.normalizePhone(input.payerPhone)
    if (!normalizedPhone) {
      return {
        success: false,
        responseMessage: "Invalid payer phone number",
      }
    }

    if (!this.isConfigured()) {
      return {
        success: true,
        checkoutRequestId: `SIM-${Date.now()}`,
        merchantRequestId: `SIM-M-${Date.now()}`,
        responseMessage: "M-Pesa credentials not configured: simulated prompt created",
      }
    }

    try {
      const token = await this.getAccessToken()
      if (!token) {
        return {
          success: false,
          responseMessage: "Failed to get M-Pesa access token",
        }
      }

      const timestamp = new Date()
      const yyyy = timestamp.getFullYear().toString()
      const mm = String(timestamp.getMonth() + 1).padStart(2, "0")
      const dd = String(timestamp.getDate()).padStart(2, "0")
      const hh = String(timestamp.getHours()).padStart(2, "0")
      const mi = String(timestamp.getMinutes()).padStart(2, "0")
      const ss = String(timestamp.getSeconds()).padStart(2, "0")
      const ts = `${yyyy}${mm}${dd}${hh}${mi}${ss}`

      const password = Buffer.from(`${this.shortcode}${this.passkey}${ts}`).toString("base64")

      const body = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(Number(input.amount || 0)),
        PartyA: normalizedPhone,
        PartyB: this.shortcode,
        PhoneNumber: normalizedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: input.accountReference,
        TransactionDesc: input.transactionDesc,
      }

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      })

      const data = response?.data || {}
      const isOk = String(data?.ResponseCode || "") === "0"

      return {
        success: isOk,
        checkoutRequestId: data?.CheckoutRequestID,
        merchantRequestId: data?.MerchantRequestID,
        responseMessage: String(data?.ResponseDescription || data?.errorMessage || "M-Pesa response received"),
        rawResponse: JSON.stringify(data),
      }
    } catch (error: any) {
      const providerPayload = error?.response?.data ? JSON.stringify(error.response.data) : undefined
      return {
        success: false,
        responseMessage: error?.message || "Failed to initiate M-Pesa prompt",
        rawResponse: providerPayload,
      }
    }
  }
}

export const mpesaService = new MpesaService()
