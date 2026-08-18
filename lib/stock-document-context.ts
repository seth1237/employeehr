import { companyApi } from "@/lib/api"
import type {
  InvoiceDocumentSettings,
  TenantBranding,
} from "@/lib/stock-document-pdf"

export type StockDocumentContext = {
  branding: TenantBranding
  invoiceSettings: InvoiceDocumentSettings
}

export async function loadStockDocumentContext(): Promise<StockDocumentContext> {
  const [brandingRes, settingsRes] = await Promise.allSettled([
    companyApi.getBranding(),
    companyApi.getInvoiceSettings(),
  ])

  const branding =
    brandingRes.status === "fulfilled" && brandingRes.value?.data
      ? (brandingRes.value.data as TenantBranding)
      : {}

  const invoiceSettings =
    settingsRes.status === "fulfilled" && settingsRes.value?.data
      ? (settingsRes.value.data as InvoiceDocumentSettings)
      : {}

  return { branding, invoiceSettings }
}
