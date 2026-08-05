import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { encryptSecret, decryptSecret } from "../utils/encryption"

describe("encryption", () => {
  const originalJwtSecret = process.env.JWT_SECRET

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-encryption"
    process.env.ENCRYPTION_KEY = "test-encryption-key"
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret
    delete process.env.ENCRYPTION_KEY
  })

  it("encrypts and decrypts secrets", () => {
    const plaintext = "smtp-password-123"
    const encrypted = encryptSecret(plaintext)

    expect(encrypted).toMatch(/^enc:/)
    expect(decryptSecret(encrypted)).toBe(plaintext)
  })

  it("returns plaintext values that are not encrypted", () => {
    expect(decryptSecret("plain-password")).toBe("plain-password")
  })
})
