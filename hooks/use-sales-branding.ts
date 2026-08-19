"use client"

import { useEffect, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"

export type SalesBranding = {
  primaryColor: string
  secondaryColor: string
  primarySoft: string
  secondarySoft: string
  primaryBorder: string
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

export function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function useSalesBranding(): SalesBranding {
  const [branding, setBranding] = useState<SalesBranding>({
    primaryColor: "#0f766e",
    secondaryColor: "#0ea5e9",
    primarySoft: "rgba(15, 118, 110, 0.08)",
    secondarySoft: "rgba(14, 165, 233, 0.08)",
    primaryBorder: "rgba(15, 118, 110, 0.18)",
  })

  useEffect(() => {
    const token = getToken()
    void fetch(`${API_URL}/api/company/branding`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const primary = json?.data?.primaryColor || "#0f766e"
        const secondary = json?.data?.secondaryColor || "#0ea5e9"
        setBranding({
          primaryColor: primary,
          secondaryColor: secondary,
          primarySoft: hexToRgba(primary, 0.08),
          secondarySoft: hexToRgba(secondary, 0.08),
          primaryBorder: hexToRgba(primary, 0.18),
        })
      })
      .catch(() => undefined)
  }, [])

  return branding
}
