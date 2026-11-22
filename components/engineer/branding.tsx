"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useSalesBranding, type SalesBranding } from "@/hooks/use-sales-branding"

const DEFAULT_BRANDING: SalesBranding = {
  primaryColor: "var(--brand-primary)",
  secondaryColor: "var(--brand-secondary)",
  accentColor: "var(--brand-accent)",
  primarySoft: "var(--brand-header-bg, #ffffff)",
  secondarySoft: "var(--brand-header-bg, #ffffff)",
  primaryBorder: "var(--brand-header-border, #e2e8f0)",
  selectedBg: "var(--brand-selected-bg)",
  selectedFg: "var(--brand-selected-fg)",
  attentionBg: "var(--brand-attention-bg)",
  attentionFg: "var(--brand-attention-fg)",
}

const EngineerBrandContext = createContext<SalesBranding>(DEFAULT_BRANDING)

export function EngineerBrandProvider({ children }: { children: ReactNode }) {
  const branding = useSalesBranding()
  return <EngineerBrandContext.Provider value={branding}>{children}</EngineerBrandContext.Provider>
}

export function useEngineerBranding() {
  return useContext(EngineerBrandContext)
}
