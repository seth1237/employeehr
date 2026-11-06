"use client"

import { useEffect, useState } from "react"
import { companyApi } from "@/lib/api"

/** Modules an On the Go company may use. */
export const ON_THE_GO_PAGES = [
  "CORE",
  "CLIENTS",
  "INVENTORY MANAGER",
  "SYSTEM",
] as const

const ON_THE_GO_EXACT_PATHS = [
  "/admin",
  "/admin/users",
  "/admin/clients",
  "/admin/clients/clients-list",
  "/admin/stock/services",
  "/admin/stamps",
  "/admin/settings/company",
  "/admin/settings/users",
  "/admin/settings/system",
  "/admin/settings/system/email",
] as const

const ON_THE_GO_PREFIX_PATHS = [
  "/admin/stock/quotations",
  "/admin/stock/sales-orders",
  "/admin/stock/invoices",
  "/admin/stock/add-inventory",
  "/admin/users",
  "/admin/settings/company",
] as const

const CACHE_KEY = "elevate_on_the_go"

function readCachedOnTheGo() {
  if (typeof window === "undefined") return null
  const raw = window.sessionStorage.getItem(CACHE_KEY)
  if (raw === "1") return true
  if (raw === "0") return false
  return null
}

export function rememberOnTheGo(enabled: boolean) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(CACHE_KEY, enabled ? "1" : "0")
}

const ON_THE_GO_EXACT_SET = new Set<string>(ON_THE_GO_EXACT_PATHS)

export function isOnTheGoNavHref(href: string) {
  const path = String(href || "").split("?")[0]
  if (ON_THE_GO_EXACT_SET.has(path)) return true
  return ON_THE_GO_PREFIX_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  )
}

export function isOnTheGoAllowedPath(pathname: string) {
  return isOnTheGoNavHref(pathname)
}

export function useOnTheGo() {
  const [onTheGo, setOnTheGo] = useState<boolean>(readCachedOnTheGo() === true)
  const [ready, setReady] = useState(readCachedOnTheGo() != null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await companyApi.getPageAccess()
        const enabled = Boolean(response?.data?.onTheGo)
        if (!cancelled) {
          setOnTheGo(enabled)
          rememberOnTheGo(enabled)
          setReady(true)
        }
      } catch {
        if (!cancelled) setReady(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { onTheGo, ready }
}
