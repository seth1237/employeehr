import { getUser } from "@/lib/auth"
import { generateInvoicePdf, generateQuotationPdf } from "@/lib/stock-document-pdf"
import { loadStockDocumentContext } from "@/lib/stock-document-context"

type QuoteLike = {
  quoteNumber?: string
  quotationNumber?: string
  createdAt?: string
  clientName?: string
  clientPhone?: string
  client?: { name?: string; number?: string; location?: string }
  items?: Array<{
    productName: string
    quantity: number
    unitPrice: number
    taxRate?: number
    taxAmount?: number
    lineTotal?: number
    totalAfterTax?: number
  }>
  subTotal?: number
  taxTotal?: number
  grandTotal?: number
}

export function quoteDocumentNumber(quote: QuoteLike) {
  return quote.quotationNumber || quote.quoteNumber || "quotation"
}

export async function downloadSalesQuotePdf(quote: QuoteLike) {
  const { branding, invoiceSettings } = await loadStockDocumentContext()

  const user = getUser()
  const preparedBy = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Sales representative"

  const items = (quote.items || []).map((item) => ({
    productName: item.productName,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    lineTotal: Number(item.quantity || 0) * Number(item.unitPrice || 0),
    taxRate: Number(item.taxRate || 0),
    taxAmount: Number(item.taxAmount || 0),
    totalAfterTax: Number(
      item.totalAfterTax ??
        item.lineTotal ??
        Number(item.quantity || 0) * Number(item.unitPrice || 0) + Number(item.taxAmount || 0),
    ),
    taxable: Number(item.taxAmount || 0) > 0 || Number(item.taxRate || 0) > 0,
  }))

  const number = quoteDocumentNumber(quote)
  const doc = generateQuotationPdf({
    quotationNumber: number,
    createdAt: quote.createdAt || new Date().toISOString(),
    client: {
      name: quote.clientName || quote.client?.name || "Client",
      number: quote.clientPhone || quote.client?.number || "",
      location: quote.client?.location || "",
    },
    items,
    subTotal: Number(quote.subTotal || 0),
    taxTotal: Number(quote.taxTotal || 0),
    grandTotal: Number(quote.grandTotal || 0),
    branding,
    invoiceSettings,
    preparedBy,
    autoSave: false,
  })

  doc.save(`quotation-${number}.pdf`)
}

export async function downloadSalesInvoicePdf(invoice: {
  invoiceNumber: string
  deliveryNoteNumber?: string
  quotationNumber?: string
  createdAt?: string
  client?: { name?: string; number?: string; location?: string }
  items?: Array<{
    productName: string
    quantity: number
    unitPrice: number
    taxRate?: number
    taxAmount?: number
    lineTotal?: number
    totalAfterTax?: number
  }>
  subTotal?: number
  taxTotal?: number
  grandTotal?: number
  status?: string
}) {
  const { branding, invoiceSettings } = await loadStockDocumentContext()

  const user = getUser()
  const preparedBy = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Sales representative"

  const items = (invoice.items || []).map((item) => ({
    productName: item.productName,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    lineTotal: Number(item.lineTotal || Number(item.quantity || 0) * Number(item.unitPrice || 0)),
    taxRate: Number(item.taxRate || 0),
    taxAmount: Number(item.taxAmount || 0),
    totalAfterTax: Number(
      item.totalAfterTax ??
        Number(item.lineTotal || 0) + Number(item.taxAmount || 0),
    ),
  }))

  const doc = generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    deliveryNoteNumber: invoice.deliveryNoteNumber || "",
    quotationNumber: invoice.quotationNumber,
    createdAt: invoice.createdAt || new Date().toISOString(),
    client: {
      name: invoice.client?.name || "Client",
      number: invoice.client?.number || "",
      location: invoice.client?.location || "",
    },
    items,
    subTotal: Number(invoice.subTotal || 0),
    taxTotal: Number(invoice.taxTotal || 0),
    grandTotal: Number(invoice.grandTotal || 0),
    branding,
    invoiceSettings,
    preparedBy,
    watermarkText:
      invoice.status === "paid"
        ? "PAID"
        : invoice.status === "cancelled"
          ? "CANCELLED"
          : undefined,
    autoSave: false,
  })

  doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
}

export function clientInvoicePdfUrl(invoiceId: string) {
  const orgId = getUser()?.org_id || ""
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/api/invoices/${invoiceId}/pdf?orgId=${encodeURIComponent(orgId)}`
}
