import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || ""
  if (!raw) {
    throw new Error("ENCRYPTION_KEY or JWT_SECRET is required for credential encryption")
  }
  return crypto.createHash("sha256").update(raw).digest()
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `enc:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`
}

export function decryptSecret(value: string): string {
  if (!value) return value
  if (!value.startsWith("enc:")) return value

  const [, ivB64, tagB64, dataB64] = value.split(":")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format")
  }

  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64url"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

export function isEncryptedSecret(value: string): boolean {
  return typeof value === "string" && value.startsWith("enc:")
}
