"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"

const CACHE_KEY = "elevate_active_branch_count"

function readCachedCount() {
  if (typeof window === "undefined") return null
  const raw = window.sessionStorage.getItem(CACHE_KEY)
  if (raw == null || raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function rememberActiveBranchCount(count: number) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(CACHE_KEY, String(Math.max(0, count)))
}

export function isInterBranchNavHref(href: string) {
  return (
    href.includes("/stock/transfers") ||
    href.includes("/manager/transfers") ||
    href.includes("/employees/transfers") ||
    href.includes("/accounts/assets/transfers")
  )
}

export function useCompanyBranches() {
  const [branchCount, setBranchCount] = useState<number | null>(readCachedCount)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await api.branches.getAll({ active: true })
        const count = Array.isArray(response?.data) ? response.data.length : 0
        if (!cancelled) {
          setBranchCount(count)
          rememberActiveBranchCount(count)
        }
      } catch {
        // Keep the cached count, or stay open so a company with branches is not hidden.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const count = branchCount ?? 0
  return {
    ready: branchCount != null,
    branchCount: count,
    hasBranches: branchCount == null ? true : count > 0,
    transfersEnabled: count >= 2,
  }
}
