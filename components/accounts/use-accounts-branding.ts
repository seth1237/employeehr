"use client"

import { useEffect, useState } from "react"
import { companyApi } from "@/lib/api"
import { hexToRgba as tokenHexToRgba, parseHex, PRODUCT_DEFAULTS } from "@/lib/brand-tokens"

export type AccountsBranding = {
  primaryColor: string
  secondaryColor: string
  textColor: string
}

const DEFAULT_BRANDING: AccountsBranding = {
  primaryColor: PRODUCT_DEFAULTS.primary,
  secondaryColor: PRODUCT_DEFAULTS.secondary,
  textColor: PRODUCT_DEFAULTS.text,
}

export function hexToRgb(hex: string) {
  return parseHex(hex) || { r: 41, g: 111, b: 240 }
}

export function hexToRgba(hex: string, _alpha: number) {
  if (_alpha <= 0.08) return "var(--brand-header-bg, #ffffff)"
  if (_alpha <= 0.22) return "var(--brand-header-border, #e2e8f0)"
  return tokenHexToRgba(hex, _alpha)
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
