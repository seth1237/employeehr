"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useSalesBranding, type SalesBranding } from "@/hooks/use-sales-branding"

const DEFAULT_BRANDING: SalesBranding = {
  primaryColor: "#0f766e",
  secondaryColor: "#0ea5e9",
  primarySoft: "rgba(15, 118, 110, 0.08)",
  secondarySoft: "rgba(14, 165, 233, 0.08)",
  primaryBorder: "rgba(15, 118, 110, 0.18)",
}

const EngineerBrandContext = createContext<SalesBranding>(DEFAULT_BRANDING)

export function EngineerBrandProvider({ children }: { children: ReactNode }) {
  const branding = useSalesBranding()
  return <EngineerBrandContext.Provider value={branding}>{children}</EngineerBrandContext.Provider>
}

export function useEngineerBranding() {
  return useContext(EngineerBrandContext)
}
