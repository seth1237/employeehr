"use client"

import { useEffect, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { buildBrandTokens, hexToRgba as tokenHexToRgba, PRODUCT_DEFAULTS } from "@/lib/brand-tokens"

export type SalesBranding = {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  primarySoft: string
  secondarySoft: string
  primaryBorder: string
  selectedBg: string
  selectedFg: string
  attentionBg: string
  attentionFg: string
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 41, g: 111, b: 240 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

export function hexToRgba(hex: string, alpha: number) {
  if (alpha <= 0.08) return "var(--brand-header-bg, #ffffff)"
  if (alpha <= 0.22) return "var(--brand-header-border, #e2e8f0)"
  return tokenHexToRgba(hex, alpha)
}

const FALLBACK: SalesBranding = {
  primaryColor: PRODUCT_DEFAULTS.primary,
  secondaryColor: PRODUCT_DEFAULTS.secondary,
  accentColor: PRODUCT_DEFAULTS.accent,
  primarySoft: "var(--brand-header-bg, #ffffff)",
  secondarySoft: "var(--brand-header-bg, #ffffff)",
  primaryBorder: "var(--brand-header-border, #e2e8f0)",
  selectedBg: "var(--brand-selected-bg, #f1f5f9)",
  selectedFg: "var(--brand-selected-fg, #334155)",
  attentionBg: "var(--brand-attention-bg, #fff7ed)",
  attentionFg: "var(--brand-attention-fg, #9a3412)",
}

export function useSalesBranding(): SalesBranding {
  const [branding, setBranding] = useState<SalesBranding>(FALLBACK)

  useEffect(() => {
    const token = getToken()
    void fetch(`${API_URL}/api/company/branding`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const tokens = buildBrandTokens(json?.data || {})
        setBranding({
          primaryColor: tokens.primary,
          secondaryColor: tokens.secondary,
          accentColor: tokens.accent,
          primarySoft: tokens.headerBg,
          secondarySoft: tokens.headerBg,
          primaryBorder: tokens.headerBorder,
          selectedBg: tokens.selectedBg,
          selectedFg: tokens.selectedFg,
          attentionBg: tokens.attentionBg,
          attentionFg: tokens.attentionFg,
        })
      })
      .catch(() => undefined)
  }, [])

  return branding
}

export const useCompanyBranding = useSalesBranding
