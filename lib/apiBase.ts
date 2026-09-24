// Determines API base URL depending on environment (local vs production)
// Usage: import { API_URL } from '@/lib/apiBase'

const DEFAULT_LOCAL = "http://localhost:5010"
const DEFAULT_PROD = "https://backend.codewithseth.co.ke"
const FRONTEND_HOSTS = new Set(["elevatehub.co.ke", "www.elevatehub.co.ke"])

function normalizeUrl(value?: string) {
  return String(value || "").trim().replace(/\/$/, "")
}

function isUsableApiUrl(value: string, appHost?: string) {
  if (!value) return false
  try {
    const url = new URL(value)
    const host = url.hostname
    if (FRONTEND_HOSTS.has(host)) return false
    const appIsLocal = !appHost || appHost === "localhost" || appHost === "127.0.0.1"
    if ((host === "localhost" || host === "127.0.0.1") && !appIsLocal) return false
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function resolveApiUrl() {
  const envUrl = normalizeUrl(process.env.NEXT_PUBLIC_API_URL)
  const appHost = typeof window !== "undefined" ? window.location.hostname : ""
  const isLocal = appHost === "localhost" || appHost === "127.0.0.1"

  if (typeof window !== "undefined") {
    if (isLocal) return DEFAULT_LOCAL
    if (isUsableApiUrl(envUrl, appHost)) return envUrl
    return DEFAULT_PROD
  }

  if (isUsableApiUrl(envUrl)) return envUrl
  return process.env.NODE_ENV === "production" ? DEFAULT_PROD : DEFAULT_LOCAL
}

export const API_URL = resolveApiUrl()

export default API_URL
