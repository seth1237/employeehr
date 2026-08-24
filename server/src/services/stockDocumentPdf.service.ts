import {
  generateInvoicePdf,
  generateQuotationPdf,
  generateDebitNotePdf,
  type DocumentItem,
} from "../lib/stock-document-pdf"
import { getCompanyDocumentContext } from "./companyDocumentSettings.service"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function resolveLogoDataUrl(logo?: string): Promise<string | undefined> {
  if (!logo) return undefined
  const raw = String(logo).trim()
  if (!raw) return undefined
  if (raw.startsWith("data:")) return raw

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const resp = await fetch(raw)
      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "image/png"
        const buffer = Buffer.from(await resp.arrayBuffer())
        return `data:${contentType};base64,${buffer.toString("base64")}`
      }
    } catch {
      // ignore remote fetch failures
    }
    return undefined
  }

  try {
    const logoFileName = path.basename(raw)
    const candidatePaths = [
      path.join(process.cwd(), "uploads", "logos", logoFileName),
      path.join(process.cwd(), "server", "uploads", "logos", logoFileName),
      path.join(__dirname, "..", "..", "uploads", "logos", logoFileName),
    ]
    for (const filePath of candidatePaths) {
      try {
        const fileBuf = await fs.readFile(filePath)
        const ext = path.extname(logoFileName).toLowerCase()
        const mime =
          ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png"
        return `data:${mime};base64,${fileBuf.toString("base64")}`
      } catch {
        // try next
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

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

export async function buildDebitNotePdfBuffer(
  note: any,
  orgId: string,
  options?: {
    baseUrl?: string
    invoiceNumber?: string
    reasonText?: string
    preparedBy?: string
  },
) {
  const { branding, invoiceSettings } = await getCompanyDocumentContext(
    orgId,
    options?.baseUrl,
  )
  const logoData = await resolveLogoDataUrl(branding.logo)
  const branded = {
    ...branding,
    logo: logoData || branding.logo,
  }

  const rawItems = Array.isArray(note.items) ? note.items : []
  const items = mapDocumentItems(
    rawItems.map((item: any) => {
      // Mongoose subdocs don't spread cleanly with ...item — read fields explicitly
      const plain =
        item && typeof item.toObject === "function" ? item.toObject() : item || {}
      const quantity = Number(plain.quantity || 0)
      const unitPrice = Number(plain.unitPrice || 0)
      const lineTotal = Number(
        plain.lineTotal ?? Number((quantity * unitPrice).toFixed(2)),
      )
      const productName = String(plain.productName || plain.name || "Item")
      const description = plain.description
        ? String(plain.description).trim()
        : ""

      return {
        productName: description ? `${productName} — ${description}` : productName,
        quantity,
        unitPrice,
        lineTotal,
        description: description || undefined,
      }
    }),
  )

  const doc = generateDebitNotePdf({
    debitNoteNumber: note.debitNoteNumber,
    invoiceNumber: options?.invoiceNumber || note.invoiceNumber,
    createdAt: String(
      note.issuedAt || note.createdAt || new Date().toISOString(),
    ),
    client: {
      name: note.client?.name || "Client",
      number: note.client?.number || "",
      location: note.client?.location || "",
    },
    items,
    subTotal: Number(note.subTotal || 0) || items.reduce((s, i) => s + i.lineTotal, 0),
    reason: options?.reasonText || String(note.reason || ""),
    reasonDetails: note.reasonDetails,
    branding: branded,
    invoiceSettings,
    preparedBy: options?.preparedBy || branded.name || "Accounts",
    watermarkText: note.status === "draft" ? "DRAFT" : "DEBIT NOTE",
    autoSave: false,
  })

  return Buffer.from(doc.output("arraybuffer"))
}
