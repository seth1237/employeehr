import { describe, expect, it, afterEach } from "vitest"
import { getPlatformOwnerEmails, isPlatformOwner } from "../utils/platformOwner"

describe("platformOwner", () => {
  const original = process.env.PLATFORM_OWNER_EMAILS

  afterEach(() => {
    if (original === undefined) {
      delete process.env.PLATFORM_OWNER_EMAILS
    } else {
      process.env.PLATFORM_OWNER_EMAILS = original
    }
  })

  it("reads owner emails from env", () => {
    process.env.PLATFORM_OWNER_EMAILS = "owner@example.com, admin@example.com"
    expect(getPlatformOwnerEmails()).toEqual(["owner@example.com", "admin@example.com"])
  })

  it("allows super_admin role", () => {
    expect(isPlatformOwner("any@example.com", "super_admin")).toBe(true)
  })

  it("checks configured owner emails", () => {
    process.env.PLATFORM_OWNER_EMAILS = "owner@example.com"
    expect(isPlatformOwner("owner@example.com")).toBe(true)
    expect(isPlatformOwner("other@example.com")).toBe(false)
  })
})
