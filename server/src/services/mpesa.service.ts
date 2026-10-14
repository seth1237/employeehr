import axios from "axios"

interface InitiateStkInput {
  payerPhone: string
  amount: number
  accountReference: string
  transactionDesc: string
  businessShortCode?: string
  partyB?: string
  transactionType?: string
}

const FAIL_RESULT_CODES = new Set(["1", "17", "26", "1001", "1019", "1025", "1032", "1037", "2001"])

interface InitiateStkResult {
  success: boolean
  checkoutRequestId?: string
  merchantRequestId?: string
  responseMessage: string
  simulated?: boolean
  rawResponse?: string
}

export interface QueryStkResult {
  success: boolean
  pending: boolean
  resultCode?: string
  resultDesc: string
  simulated?: boolean
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
  private readonly tillNumber = String(process.env.MPESA_TILL_NUMBER || "").trim()
  private readonly mode = String(process.env.MPESA_MODE || "").trim().toLowerCase()
  private readonly envTransactionType = process.env.MPESA_TRANSACTION_TYPE || ""

  isConfigured() {
    return Boolean(this.consumerKey && this.consumerSecret && this.shortcode && this.passkey && this.callbackUrl)
  }

  isSandbox() {
    return /sandbox/i.test(this.baseUrl)
  }

  partyFromEnv() {
    const till = this.tillNumber
    const useTill = this.mode === "till" || (Boolean(till) && this.mode !== "paybill")
    const businessShortCode = useTill ? till || this.shortcode : this.shortcode
    const transactionType =
      this.envTransactionType ||
      (useTill ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline")
    return {
      businessShortCode,
      partyB: useTill ? till || this.shortcode : this.shortcode,
      transactionType,
      tillNumber: till,
      mode: useTill ? "till" : "paybill",
      label: useTill ? `Till ${till || businessShortCode}` : `Paybill ${this.shortcode}`,
      sandbox: this.isSandbox(),
      configured: this.isConfigured(),
    }
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

  private darajaTimestamp(businessShortCode = this.shortcode) {
    const timestamp = new Date()
    const yyyy = timestamp.getFullYear().toString()
    const mm = String(timestamp.getMonth() + 1).padStart(2, "0")
    const dd = String(timestamp.getDate()).padStart(2, "0")
    const hh = String(timestamp.getHours()).padStart(2, "0")
    const mi = String(timestamp.getMinutes()).padStart(2, "0")
    const ss = String(timestamp.getSeconds()).padStart(2, "0")
    const ts = `${yyyy}${mm}${dd}${hh}${mi}${ss}`
    const password = Buffer.from(`${businessShortCode}${this.passkey}${ts}`).toString("base64")
    return { ts, password }
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
        responseMessage: "M-Pesa is in local test mode. The PIN prompt will confirm in a few seconds.",
        simulated: true,
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

      const party = this.partyFromEnv()
      const businessShortCode = String(input.businessShortCode || party.businessShortCode).trim()
      const partyB = String(input.partyB || party.partyB).trim()
      const transactionType = String(input.transactionType || party.transactionType).trim()
      const { ts, password } = this.darajaTimestamp(businessShortCode)

      const body = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: ts,
        TransactionType: transactionType,
        Amount: Math.round(Number(input.amount || 0)),
        PartyA: normalizedPhone,
        PartyB: partyB,
        PhoneNumber: normalizedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: String(input.accountReference || "POS").slice(0, 12),
        TransactionDesc: String(input.transactionDesc || "POS sale").slice(0, 13),
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

  async queryStkPush(checkoutRequestId: string): Promise<QueryStkResult> {
    const id = String(checkoutRequestId || "").trim()
    if (!id) {
      return { success: false, pending: false, resultDesc: "Missing M-Pesa checkout id" }
    }

    if (!this.isConfigured() || id.startsWith("SIM-")) {
      return {
        success: true,
        pending: false,
        resultCode: "0",
        resultDesc: "Simulated M-Pesa payment confirmed",
        simulated: true,
      }
    }

    try {
      const token = await this.getAccessToken()
      if (!token) {
        return { success: false, pending: true, resultDesc: "Waiting for M-Pesa. Ask the customer to enter their PIN." }
      }

      const party = this.partyFromEnv()
      const { ts, password } = this.darajaTimestamp(party.businessShortCode)
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: party.businessShortCode,
          Password: password,
          Timestamp: ts,
          CheckoutRequestID: id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
          validateStatus: () => true,
        },
      )

      const data = response?.data || {}
      const resultCode = String(data?.ResultCode ?? "")
      const errorCode = String(data?.errorCode || "")
      const resultDesc = String(
        data?.ResultDesc || data?.ResponseDescription || data?.errorMessage || "",
      )
      const httpPending = response.status >= 400
      const stillProcessing =
        resultCode === "4999" ||
        errorCode === "500.001.1001" ||
        /wait|processing|in progress|not yet processed/i.test(resultDesc)

      if (resultCode === "0") {
        return {
          success: true,
          pending: false,
          resultCode,
          resultDesc: resultDesc || "M-Pesa payment confirmed",
          rawResponse: JSON.stringify(data),
        }
      }

      if (FAIL_RESULT_CODES.has(resultCode)) {
        return {
          success: false,
          pending: false,
          resultCode,
          resultDesc: resultDesc || "The customer did not complete M-Pesa",
          rawResponse: JSON.stringify(data),
        }
      }

      return {
        success: false,
        pending: true,
        resultCode: resultCode || errorCode,
        resultDesc:
          stillProcessing || httpPending
            ? "Waiting for the customer to enter their M-Pesa PIN"
            : resultDesc || "Waiting for the customer to enter their M-Pesa PIN",
        rawResponse: JSON.stringify(data),
      }
    } catch (error: any) {
      return {
        success: false,
        pending: true,
        resultDesc: "Waiting for the customer to enter their M-Pesa PIN",
        rawResponse: error?.response?.data ? JSON.stringify(error.response.data) : undefined,
      }
    }
  }
}

export const mpesaService = new MpesaService()
