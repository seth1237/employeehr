import axios from "axios"
import crypto from "crypto"

interface SendSmsInput {
  to: string
  message: string
  senderName?: string
}

interface SendSmsResult {
  success: boolean
  normalizedTo: string
  campaignId?: string
  providerMessageId?: string
  providerRawResponse?: string
  error?: string
}

class SmsService {
  private readonly clientId = process.env.WEBSMS_CLIENT_ID || ""
  private readonly actorId = process.env.WEBSMS_ACTOR_ID || process.env.WEBSMS_ACCOUNT_ID || ""
  private readonly apiKey = process.env.WEBSMS_API_KEY || ""
  private readonly endpoint = process.env.WEBSMS_ENDPOINT || "https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS"
  private readonly encryptedCampaignEndpoint = "https://sms.websms.co.ke/v1/onfonapps/sms:sendCampaign"
  private readonly senderId = process.env.WEBSMS_SENDER_ID || ""
  private readonly defaultSenderName = process.env.WEBSMS_DEFAULT_SENDER_NAME || "YourCompany"
  private readonly defaultCountryCode = process.env.DISPATCH_DEFAULT_COUNTRY_CODE || "254"
  private webSmsPublicKey: string | null = null


  isConfigured() {
    return Boolean(this.clientId && this.apiKey)
  }

  private usesEncryptedCampaignEndpoint() {
    return this.endpoint.includes("sms:sendCampaign")
  }

  private toBase64Url(value: string) {
    return Buffer.from(value)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
  }

  generateJWT(): string {
    if (!this.actorId) {
      throw new Error("WEBSMS_ACTOR_ID (or WEBSMS_ACCOUNT_ID) is required for encrypted campaign sending")
    }

    const header = {
      alg: "HS256",
      kid: "Bulk SMS Service",
      typ: "JWT",
    }

    const payload = {
      id: this.actorId,
      project_id: "Bulk SMS Service",
      aud: "client",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: this.clientId,
      sub: "Session",
    }

    const headerEncoded = this.toBase64Url(JSON.stringify(header))
    const payloadEncoded = this.toBase64Url(JSON.stringify(payload))
    const signature = crypto
      .createHmac("sha256", this.apiKey)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")

    return `${headerEncoded}.${payloadEncoded}.${signature}`
  }

  private getBaseUrl(endpoint = this.endpoint) {
    try {
      const url = new URL(endpoint)
      return `${url.protocol}//${url.host}`
    } catch {
      return "https://sms.websms.co.ke"
    }
  }

  private async fetchPublicKey() {
    if (this.webSmsPublicKey) return this.webSmsPublicKey

    const baseUrl = this.getBaseUrl()
    const response = await axios.get(`${baseUrl}/v1/public-key`, { timeout: 15000 })
    const rawKey = String(response?.data?.publicKey || "").trim()
    if (!rawKey) {
      throw new Error("WebSMS public key is missing from /v1/public-key response")
    }

    const normalizedKey = rawKey
      .replace("-----BEGIN RSA PUBLIC KEY-----", "-----BEGIN PUBLIC KEY-----")
      .replace("-----END RSA PUBLIC KEY-----", "-----END PUBLIC KEY-----")

    this.webSmsPublicKey = normalizedKey
    return normalizedKey
  }

  private async buildEncryptedPayload(rawData: Record<string, any>) {
    const publicKeyPem = await this.fetchPublicKey()
    const payloadJson = JSON.stringify(rawData)

    const aesKey = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)

    const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv)
    const encryptedData = Buffer.concat([cipher.update(payloadJson, "utf8"), cipher.final()])

    const encryptedAesKey = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      aesKey,
    )

    const encryptedEnvelope = {
      key: encryptedAesKey.toString("base64"),
      iv: iv.toString("base64"),
      data: encryptedData.toString("base64"),
    }

    return {
      requestBody: {
        encrypted: true,
        payload: Buffer.from(JSON.stringify(encryptedEnvelope), "utf8").toString("base64"),
      },
      aesKey,
    }
  }

  private decryptResponsePayload(payload: string, aesKey: Buffer) {
    const decodedPayload = Buffer.from(payload, "base64").toString("utf8")
    const envelope = JSON.parse(decodedPayload)
    const iv = Buffer.from(String(envelope?.iv || ""), "base64")
    const data = Buffer.from(String(envelope?.data || ""), "base64")

    const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
    return JSON.parse(decrypted)
  }

  normalizePhone(rawPhone: string): string {
    const trimmed = String(rawPhone || "").trim()
    if (!trimmed) return ""

    const withoutSymbols = trimmed.replace(/[\s()-]/g, "")
    if (withoutSymbols.startsWith("+")) {
      return withoutSymbols.slice(1).replace(/\D/g, "")
    }

    const digitsOnly = withoutSymbols.replace(/\D/g, "")
    if (!digitsOnly) return ""

    if (digitsOnly.startsWith("0")) {
      return `${this.defaultCountryCode}${digitsOnly.slice(1)}`
    }

    if (digitsOnly.startsWith(this.defaultCountryCode)) {
      return digitsOnly
    }

    return `${this.defaultCountryCode}${digitsOnly}`
  }

  private parseBulkSmsResponse(responseData: any) {
    const errorCode = Number(responseData?.ErrorCode)
    const data = Array.isArray(responseData?.Data) ? responseData.Data : []
    const firstMessage = data[0] || {}
    const success = errorCode === 0

    return {
      success,
      messageId: firstMessage?.MessageId ? String(firstMessage.MessageId) : undefined,
      error: success
        ? undefined
        : String(responseData?.ErrorDescription || responseData?.message || "Failed to send SMS through WebSMS"),
    }
  }

  private async sendViaBulkSmsEndpoint(input: SendSmsInput, normalizedTo: string): Promise<SendSmsResult> {
    const rawSenderId = String(input.senderName || this.senderId || this.defaultSenderName).trim()
    // If senderId looks like a UUID/GUID, it's probably a ClientId/AppId mistake in .env
    // SenderIds must be < 11 chars alphanumeric.
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSenderId)
    const senderId = isGuid || rawSenderId.length > 13 ? "ELEVATE" : rawSenderId

    const payload = {
      SenderId: senderId,
      IsUnicode: false,
      IsFlash: false,
      MessageParameters: [
        {
          Number: normalizedTo,
          Text: input.message,
        },
      ],
      ApiKey: this.apiKey,
      ClientId: this.clientId,
    }

    const response = await axios.post(this.endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        AccessKey: this.apiKey,
      },
      timeout: 15000,
    })

    const responseData = response?.data || {}
    const parsed = this.parseBulkSmsResponse(responseData)

    return {
      success: parsed.success,
      normalizedTo,
      campaignId: parsed.messageId,
      providerMessageId: parsed.messageId,
      providerRawResponse: JSON.stringify(responseData),
      error: parsed.error,
    }
  }

  private async sendViaEncryptedCampaignEndpoint(input: SendSmsInput, normalizedTo: string): Promise<SendSmsResult> {
    const rawSenderName = String(input.senderName || this.defaultSenderName).trim()
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSenderName)
    const senderName = isGuid || rawSenderName.length > 13 ? "ELEVATE" : rawSenderName

    const payload = {
      SenderId: senderName,
      IsUnicode: false,
      IsFlash: false,
      MessageParameters: [
        {
          Number: normalizedTo,
          Text: input.message,
        },
      ],
      ApiKey: this.apiKey,
      ClientId: this.clientId,
    }

    const token = this.generateJWT()
    const { requestBody, aesKey } = await this.buildEncryptedPayload(payload)

    const response = await axios.post(this.endpoint || this.encryptedCampaignEndpoint, requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Encrypted-Payload": "true",
      },
      timeout: 15000,
    })

    let responseData = response?.data || {}
    if (responseData?.encrypted && responseData?.payload) {
      responseData = this.decryptResponsePayload(String(responseData.payload), aesKey)
    }

    const parsed = this.parseBulkSmsResponse(responseData)
    const campaignId = responseData?.campaign_id ? String(responseData.campaign_id) : parsed.messageId
    const success = Boolean(campaignId) || parsed.success

    return {
      success,
      normalizedTo,
      campaignId,
      providerMessageId: campaignId,
      providerRawResponse: JSON.stringify(responseData),
      error: success ? undefined : (parsed.error || "Failed to send SMS through WebSMS"),
    }
  }

  async sendDispatchSms(input: SendSmsInput): Promise<SendSmsResult> {
    const normalizedTo = this.normalizePhone(input.to)

    if (!normalizedTo) {
      return {
        success: false,
        normalizedTo: "",
        error: "Invalid recipient phone number",
      }
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        normalizedTo,
        error: "WEBSMS_CLIENT_ID or WEBSMS_API_KEY is not configured",
      }
    }

    try {
      return this.usesEncryptedCampaignEndpoint()
        ? await this.sendViaEncryptedCampaignEndpoint(input, normalizedTo)
        : await this.sendViaBulkSmsEndpoint(input, normalizedTo)
    } catch (error: any) {
      const providerPayload = error?.response?.data ? JSON.stringify(error.response.data) : undefined
      const providerMessage = String(error?.response?.data?.message || error?.response?.data || "").toLowerCase()
      const isEncryptionError = error?.response?.status === 422 && providerMessage.includes("decryption failed")
      const isSchemaError = error?.response?.status === 400 && providerMessage.includes("unknown field")

      return {
        success: false,
        normalizedTo,
        error: isEncryptionError || isSchemaError
          ? "WebSMS request payload was rejected by the provider schema. Use the documented bulk endpoint or confirm the encrypted campaign payload fields with WebSMS."
          : (error?.message || "Failed to send SMS"),
        providerRawResponse: providerPayload,
      }
    }
  }
}

export const smsService = new SmsService()
