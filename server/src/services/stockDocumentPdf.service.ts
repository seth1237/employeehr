import {
  generateInvoicePdf,
  generateQuotationPdf,
  type DocumentItem,
} from "../lib/stock-document-pdf"
import { getCompanyDocumentContext } from "./companyDocumentSettings.service"

function mapDocumentItems(items: any[] = []): DocumentItem[] {
  return items.map((item) => ({
    productName: String(item.productName || item.name || "Item"),
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    lineTotal: Number(
      item.lineTotal ?? Number(item.quantity || 0) * Number(item.unitPrice || 0),
    ),
    taxable: Boolean(item.taxable),
    taxRate: Number(item.taxRate || 0),
    taxAmount: Number(item.taxAmount || 0),
    totalAfterTax: Number(
      item.totalAfterTax ??
        Number(item.lineTotal || 0) + Number(item.taxAmount || 0),
    ),
    description: item.description,
    imageUrl: item.imageUrl,
    showImageOnQuote: item.showImageOnQuote,
  }))
}

export async function buildInvoicePdfBuffer(
  invoice: any,
  orgId: string,
  baseUrl?: string,
) {
  const { branding, invoiceSettings } = await getCompanyDocumentContext(
    orgId,
    baseUrl,
  )
  const items = mapDocumentItems(invoice.items)
  const taxTotal =
    invoice.taxTotal !== undefined
      ? Number(invoice.taxTotal)
      : items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0)
  const grandTotal =
    invoice.grandTotal !== undefined
      ? Number(invoice.grandTotal)
      : Number(invoice.subTotal || 0) + taxTotal

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
    taxTotal,
    grandTotal,
    branding,
    invoiceSettings,
    preparedBy: branding.name || "Accounts",
    watermarkText:
      invoice.status === "paid"
        ? "PAID"
        : invoice.status === "cancelled"
          ? "CANCELLED"
          : undefined,
    autoSave: false,
  })

  return Buffer.from(doc.output("arraybuffer"))
}

export async function buildQuotationPdfBuffer(
  quotation: any,
  orgId: string,
  baseUrl?: string,
) {
  const { branding, invoiceSettings } = await getCompanyDocumentContext(
    orgId,
    baseUrl,
  )
  const items = mapDocumentItems(quotation.items)
  const taxTotal =
    quotation.taxTotal !== undefined
      ? Number(quotation.taxTotal)
      : items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0)
  const grandTotal =
    quotation.grandTotal !== undefined
      ? Number(quotation.grandTotal)
      : Number(quotation.subTotal || quotation.totalAmount || 0) + taxTotal

  const doc = generateQuotationPdf({
    quotationNumber: quotation.quotationNumber,
    createdAt: quotation.createdAt || new Date().toISOString(),
    client: {
      name: quotation.client?.name || "Client",
      number: quotation.client?.number || "",
      location: quotation.client?.location || "",
    },
    items,
    subTotal: Number(quotation.subTotal || quotation.totalAmount || 0),
    taxTotal,
    grandTotal,
    branding,
    invoiceSettings,
    preparedBy: branding.name || "Sales",
    watermarkText: quotation.status === "cancelled" ? "CANCELLED" : undefined,
    autoSave: false,
  })

  return Buffer.from(doc.output("arraybuffer"))
}
