import { describe, expect, it, beforeEach, afterEach } from "vitest"
import jwt from "jsonwebtoken"
import { generateToken, verifyToken } from "../config/auth"

describe("auth config", () => {
  const originalSecret = process.env.JWT_SECRET
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.JWT_SECRET = "unit-test-jwt-secret"
    process.env.NODE_ENV = "test"
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret
    process.env.NODE_ENV = originalNodeEnv
  })

  it("generates and verifies tokens", () => {
    const token = generateToken({
      userId: "507f1f77bcf86cd799439011",
      org_id: "507f1f77bcf86cd799439012",
      email: "user@example.com",
      role: "employee",
    })

    const decoded = verifyToken(token)
    expect(decoded.email).toBe("user@example.com")
    expect(decoded.role).toBe("employee")
  })

  it("rejects tampered tokens", () => {
    const token = jwt.sign(
      {
        userId: "507f1f77bcf86cd799439011",
        org_id: "507f1f77bcf86cd799439012",
        email: "user@example.com",
        role: "employee",
      },
      "wrong-secret",
    )

    expect(() => verifyToken(token)).toThrow("Invalid or expired token")
  })
})
