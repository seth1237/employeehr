import { Company } from "../models/Company"

const DEFAULT_INVOICE_TERMS = [
  "Payment is due within 7 days from the invoice date.",
  "All items remain the property of the company until fully paid.",
  "Goods once sold are subject to the company return policy.",
].join(" ")

const normalizePaymentChannel = (value: any) => ({
  paymentType: String(value?.paymentType || "bank").trim(),
  mpesaMode: String(value?.mpesaMode || "").trim(),
  channelName: String(value?.channelName || value?.name || "").trim(),
  bankName: String(value?.bankName || "").trim(),
  accountName: String(value?.accountName || "").trim(),
  accountNumber: String(value?.accountNumber || "").trim(),
  paybillNumber: String(value?.paybillNumber || "").trim(),
  tillNumber: String(value?.tillNumber || "").trim(),
  branch: String(value?.branch || "").trim(),
  notes: String(value?.notes || "").trim(),
})

export type CompanyBranding = {
  name?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  invoiceEmail?: string
  email?: string
  phone?: string
  website?: string
  city?: string
  state?: string
  country?: string
}

export type CompanyInvoiceDocumentSettings = {
  invoiceEmail?: string
  contactPhone?: string
  officeLocation?: string
  secondLocation?: string
  useBothLocations?: boolean
  contactEmail?: string
  website?: string
  vatNumber?: string
  pinNumber?: string
  termsAndConditions?: string
  includeQuotationReference?: boolean
  includeDeliveryNoteNumber?: boolean
  includePreparedBy?: boolean
  includeVat?: boolean
  includePaymentChannels?: boolean
  paymentChannels?: Array<ReturnType<typeof normalizePaymentChannel>>
}

export function buildInvoiceDocumentSettings(company: any): CompanyInvoiceDocumentSettings {
  return {
    invoiceEmail: String(
      company.invoiceSettings?.invoiceEmail || company.email || "",
    ).trim(),
    contactPhone: String(
      company.invoiceSettings?.contactPhone || company.phone || "",
    ).trim(),
    officeLocation: String(
      company.invoiceSettings?.officeLocation ||
        [company.city, company.state, company.country].filter(Boolean).join(", ") ||
        "",
    ).trim(),
    secondLocation: String(company.invoiceSettings?.secondLocation || "").trim(),
    useBothLocations: company.invoiceSettings?.useBothLocations ?? false,
    contactEmail: String(
      company.invoiceSettings?.contactEmail ||
        company.invoiceSettings?.invoiceEmail ||
        company.email ||
        "",
    ).trim(),
    website: String(company.invoiceSettings?.website || company.website || "").trim(),
    vatNumber: String(company.invoiceSettings?.vatNumber || "").trim(),
    pinNumber: String(company.invoiceSettings?.pinNumber || "").trim(),
    termsAndConditions: String(
      company.invoiceSettings?.termsAndConditions || DEFAULT_INVOICE_TERMS,
    ).trim(),
    includeQuotationReference:
      company.invoiceSettings?.includeQuotationReference ?? true,
    includeDeliveryNoteNumber:
      company.invoiceSettings?.includeDeliveryNoteNumber ?? true,
    includePreparedBy: company.invoiceSettings?.includePreparedBy ?? true,
    includeVat: company.invoiceSettings?.includeVat ?? false,
    includePaymentChannels: company.invoiceSettings?.includePaymentChannels ?? true,
    paymentChannels: Array.isArray(company.invoiceSettings?.paymentChannels)
      ? company.invoiceSettings.paymentChannels.map(normalizePaymentChannel)
      : [],
  }
}

export function buildCompanyBranding(company: any, baseUrl?: string): CompanyBranding {
  const logoUrl =
    company.logo && !String(company.logo).startsWith("http")
      ? `${String(baseUrl || process.env.API_URL || "http://localhost:5010").replace(/\/$/, "")}/uploads/logos/${company.logo}`
      : company.logo

  return {
    name: company.name,
    logo: logoUrl,
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
    email: company.email,
    phone: company.phone,
    website: company.website,
    city: company.city,
    state: company.state,
    country: company.country,
    invoiceEmail: company.invoiceSettings?.invoiceEmail || company.email,
  }
}

export async function getCompanyDocumentContext(orgId: string, baseUrl?: string) {
  const company = await Company.findById(orgId).select(
    "name logo primaryColor secondaryColor email phone website city state country invoiceSettings",
  )
  if (!company) {
    throw new Error("Company not found")
  }

  return {
    branding: buildCompanyBranding(company, baseUrl),
    invoiceSettings: buildInvoiceDocumentSettings(company),
  }
}
