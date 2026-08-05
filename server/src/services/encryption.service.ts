import crypto from "crypto"

export class EncryptionService {
  private static readonly algorithm = "aes-256-cbc"
  private static readonly key = crypto
    .createHash("sha256")
    .update(process.env.ENCRYPTION_KEY || "default-key")
    .digest()

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(EncryptionService.algorithm, EncryptionService.key, iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    return iv.toString("hex") + ":" + encrypted
  }

  static decrypt(encryptedText: string): string {
    const parts = encryptedText.split(":")
    const iv = Buffer.from(parts[0], "hex")
    const encrypted = parts[1]
    const decipher = crypto.createDecipheriv(EncryptionService.algorithm, EncryptionService.key, iv)
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  }
}
