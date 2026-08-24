"use client"

import { useEffect, useState } from "react"
import { companyApi } from "@/lib/api"

export type AccountsBranding = {
  primaryColor: string
  secondaryColor: string
  textColor: string
}

const DEFAULT_BRANDING: AccountsBranding = {
  primaryColor: "#0f766e",
  secondaryColor: "#0ea5e9",
  textColor: "#0f172a",
}

export function hexToRgb(hex: string) {
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

export function useAccountsBranding() {
  const [branding, setBranding] = useState<AccountsBranding>(DEFAULT_BRANDING)

  useEffect(() => {
    companyApi
      .getBranding()
      .then((res) => {
        if (res?.success && res.data) {
          setBranding({
            primaryColor: res.data.primaryColor || DEFAULT_BRANDING.primaryColor,
            secondaryColor: res.data.secondaryColor || DEFAULT_BRANDING.secondaryColor,
            textColor: res.data.textColor || DEFAULT_BRANDING.textColor,
          })
        }
      })
      .catch(() => {})
  }, [])

  return branding
}
