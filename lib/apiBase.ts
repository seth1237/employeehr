// Resolves the API host at request time (local vs deployed).
// Usage: import { API_URL, getApiUrl } from '@/lib/apiBase'

const DEFAULT_LOCAL = "http://localhost:5010"
const DEFAULT_PROD = "https://backend.codewithseth.co.ke"
const FRONTEND_HOSTS = new Set([
  "elevatehub.co.ke",
  "www.elevatehub.co.ke",
])

function normalizeUrl(value?: string) {
  return String(value || "").trim().replace(/\/$/, "")
}

function isFrontendHost(host?: string) {
  const value = String(host || "").toLowerCase()
  return FRONTEND_HOSTS.has(value) || value.endsWith(".elevatehub.co.ke")
}

function isLocalHost(host?: string) {
  return host === "localhost" || host === "127.0.0.1"
}

function isUsableApiUrl(value: string, appHost?: string) {
  if (!value) return false
  try {
    const url = new URL(value)
    const host = url.hostname
    if (isFrontendHost(host)) return false
    if (isLocalHost(host) && !isLocalHost(appHost)) return false
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function getApiUrl() {
  const envUrl = normalizeUrl(process.env.NEXT_PUBLIC_API_URL)

  if (typeof window !== "undefined") {
    const appHost = window.location.hostname
    if (isLocalHost(appHost)) {
      return isUsableApiUrl(envUrl, appHost) ? envUrl : DEFAULT_LOCAL
    }
    // Deployed Elevate frontend must always hit the live API, even if
    // NEXT_PUBLIC_API_URL was baked as localhost during the Vercel build.
    if (isFrontendHost(appHost)) return DEFAULT_PROD
    if (isUsableApiUrl(envUrl, appHost)) return envUrl
    return DEFAULT_PROD
  }

  const onVercel = Boolean(process.env.VERCEL)
  if (onVercel || process.env.NODE_ENV === "production") {
    if (isUsableApiUrl(envUrl, "www.elevatehub.co.ke")) return envUrl
    return DEFAULT_PROD
  }

  if (isUsableApiUrl(envUrl)) return envUrl
  return DEFAULT_LOCAL
}

export function rewriteApiUrl(input: string) {
  if (!input) return getApiUrl()
  if (input.startsWith("/api")) return `${getApiUrl()}${input}`
  try {
    const url = new URL(input)
    const appHost = typeof window !== "undefined" ? window.location.hostname : ""
    const shouldRewrite =
      isFrontendHost(url.hostname) ||
      (isLocalHost(url.hostname) && !isLocalHost(appHost))
    if (shouldRewrite) {
      return `${getApiUrl()}${url.pathname}${url.search}`
    }
  } catch {
    return input
  }
  return input
}

// String-like handle so `${API_URL}/api/...` resolves at call time, not import time.
export const API_URL = {
  toString: getApiUrl,
  valueOf: getApiUrl,
  [Symbol.toPrimitive]: getApiUrl,
} as unknown as string

export default API_URL
