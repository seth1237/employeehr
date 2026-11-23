export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const json = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf8")
    const payload = JSON.parse(json)
    return payload && typeof payload === "object" ? payload : null
  } catch {
    return null
  }
}

export function jwtSecondsRemaining(token: string, fallbackSeconds: number): number {
  const payload = decodeJwtPayload(token)
  if (payload && typeof payload.exp === "number") {
    return Math.max(60, payload.exp - Math.floor(Date.now() / 1000))
  }
  return fallbackSeconds
}

export function isFieldAuthRole(role?: unknown) {
  return role === "sales_rep" || role === "technical_service_engineer"
}
