import { jsPDF } from 'jspdf'

export interface DocumentClient {
  name: string
  number: string
  location: string
}

export interface DocumentItem {
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface TenantBranding {
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

const DEFAULT_PRIMARY = "#0f766e"
const DEFAULT_GRAY = "#6b7280"
const DEFAULT_TEXT = "#1f2937"
const DEFAULT_LIGHT = "#f1f5f9"

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function setColorFromHex(doc: jsPDF, hex: string, kind: "fill" | "text" | "draw") {
  const { r, g, b } = hexToRgb(hex)
  if (kind === "fill") doc.setFillColor(r, g, b)
  if (kind === "text") doc.setTextColor(r, g, b)
  if (kind === "draw") doc.setDrawColor(r, g, b)
}

function drawThinDivider(doc: jsPDF, y: number, colorHex = "#e2e8f0") {
  setColorFromHex(doc, colorHex, "draw")
  doc.setLineWidth(0.4)
  doc.line(12, y, 198, y)
}

function buildCompanyAddress(branding?: TenantBranding): string {
  const parts = [branding?.city, branding?.state, branding?.country].filter(Boolean)
  return parts.length ? parts.join(", ") : ""
}

function drawWatermark(doc: jsPDF, value?: string) {
  if (!value) return
  doc.setTextColor(220, 220, 220)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(48)
  doc.text(value.toUpperCase(), 105, 150, { angle: 45, align: "center" })
}

function drawModernHeader(
  doc: jsPDF,
  title: string,
  numberLabel: string,
  numberValue: string,
  createdAt: string,
  branding?: TenantBranding
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  const hasLogo = Boolean(branding?.logo)

  const logoX = 12
  const logoY = 12

  // Logo
  if (hasLogo) {
    try {
      const lower = (branding!.logo || "").toLowerCase()
      const format = lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG"
      const maxLogoWidth = 44
      const maxLogoHeight = 20
      let imageWidth = 0
      let imageHeight = 0

      try {
        const imageProps = doc.getImageProperties(branding!.logo!)
        imageWidth = Number(imageProps?.width || 0)
        imageHeight = Number(imageProps?.height || 0)
      } catch {
        imageWidth = 3
        imageHeight = 1
      }

      let drawWidth = maxLogoWidth
      let drawHeight = maxLogoHeight

      if (imageWidth > 0 && imageHeight > 0) {
        const ratio = imageWidth / imageHeight
        if (ratio >= 1) {
          drawWidth = maxLogoWidth
          drawHeight = Math.min(maxLogoHeight, drawWidth / ratio)
        } else {
          drawHeight = maxLogoHeight
          drawWidth = Math.min(maxLogoWidth, drawHeight * ratio)
        }
      }

      const alignedY = logoY + (maxLogoHeight - drawHeight) / 2
      doc.addImage(branding!.logo!, format, logoX, alignedY, drawWidth, drawHeight)
    } catch (e) {
      // ignore logo failures
    }
  }

  // Document title - right side (larger, more prominent)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(32)
  setColorFromHex(doc, primary, "text")
  doc.text(title.toUpperCase(), 198, 25, { align: "right" })

  // Invoice details - right side
  const metaX = 106
  const metaY = 38

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(numberLabel, metaX, metaY)
  doc.text("Issued", metaX, metaY + 12)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text(numberValue, 198, metaY, { align: "right" })
  doc.text(new Date(createdAt).toLocaleDateString("en-KE"), 198, metaY + 12, { align: "right" })

  drawThinDivider(doc, 68)
}

function drawContactSlotBelowLogo(
  doc: jsPDF,
  branding?: TenantBranding,
) {
  const phone = String(branding?.phone || "").trim()
  const location = String(buildCompanyAddress(branding) || "").trim()
  const email = String(branding?.email || branding?.invoiceEmail || "").trim()
  const website = String(branding?.website || "").trim()

  const rows = [
    { label: "Company", value: branding?.name || "" },
    { label: "Phone", value: phone },
    { label: "Email", value: email },
    { label: "Website", value: website },
    { label: "Address", value: location },
  ].filter((row) => row.value)

  if (!rows.length) return 68

  const boxX = 12
  const boxY = 38
  const rowHeight = 3.8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.8)
  setColorFromHex(doc, DEFAULT_GRAY, "text")

  let y = boxY
  rows.forEach((row) => {
    const wrapped = doc.splitTextToSize(row.value, 82)
    doc.text(`${row.label}: ${wrapped[0] || ""}`, boxX, y)
    y += rowHeight
  })

  return y + 2
}

function drawPartiesSection(doc: jsPDF, client: DocumentClient, startY = 90, branding?: { primaryColor?: string }) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  const leftX = 12
  const rightX = 106
  const boxY = Math.max(startY, 72)
  const boxW = 92

  const headerH = 6.5
  const lineH = 4
  const padX = 3.5
  const padY = 3

  const nameLines = doc.splitTextToSize(client.name || "Client Name", 84)
  const locationLines = doc.splitTextToSize(`Location: ${client.location}`, 84)
  const phone = client.number || "—"
  const phoneLines = doc.splitTextToSize(`Phone: ${phone}`, 84)

  const leftHeight = headerH + padY + (nameLines.length + locationLines.length) * lineH + 1
  const rightHeight = headerH + padY + phoneLines.length * lineH + 1
  const boxH = Math.max(leftHeight, rightHeight, headerH + 12)

  setColorFromHex(doc, primary, "draw")
  doc.setLineWidth(0.35)
  doc.rect(leftX, boxY, boxW, boxH)
  doc.rect(rightX, boxY, boxW, boxH)
  setColorFromHex(doc, DEFAULT_LIGHT, "fill")
  doc.rect(leftX, boxY, boxW, headerH, "F")
  doc.rect(rightX, boxY, boxW, headerH, "F")
  doc.line(leftX, boxY + headerH, leftX + boxW, boxY + headerH)
  doc.line(rightX, boxY + headerH, rightX + boxW, boxY + headerH)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text("Bill To", leftX + padX, boxY + 4.5)
  doc.text("Contact Info", rightX + padX, boxY + 4.5)

  let ly = boxY + headerH + padY + 2.8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.8)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text(nameLines, leftX + padX, ly)
  ly += nameLines.length * lineH
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(locationLines, leftX + padX, ly)
  ly += locationLines.length * lineH

  let ry = boxY + headerH + padY + 2.8
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(phoneLines, rightX + padX, ry)

  return boxY + boxH
}

function drawItemsTable(doc: jsPDF, startY: number, items: DocumentItem[], branding?: { primaryColor?: string }) {
  const tableX = 12
  const tableW = 186
  const colWidth = [80, 24, 41, 41]
  const headerH = 7
  const rowH = 5

  let y = startY

  // Header
  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  setColorFromHex(doc, primary, "fill")
  doc.rect(tableX, y, tableW, headerH, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  setColorFromHex(doc, "ffffff", "text")

  let x = tableX
  const headers = ["Item", "Qty", "Unit Price", "Total"]
  headers.forEach((header, idx) => {
    const align = idx === 0 ? "left" : "right"
    const offset = idx === 0 ? 2 : colWidth[idx] - 2
    doc.text(header, x + offset, y + 5, { align })
    x += colWidth[idx]
  })

  y += headerH
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_TEXT, "text")

  // Items
  items.forEach((item, idx) => {
    if (y > 250) {
      doc.addPage()
      y = 15
    }

    if (idx % 2 === 0) {
      setColorFromHex(doc, DEFAULT_LIGHT, "fill")
      doc.rect(tableX, y, tableW, rowH, "F")
    }

    x = tableX
    const itemName = doc.splitTextToSize(item.productName, colWidth[0] - 4)
    doc.text(itemName[0] || "", x + 2, y + 3.5)

    x += colWidth[0]
    doc.text(String(item.quantity), x + colWidth[1] - 4, y + 3.5, { align: "right" })

    x += colWidth[1]
    doc.text(`KSh ${Number(item.unitPrice).toLocaleString()}`, x + colWidth[2] - 4, y + 3.5, { align: "right" })

    x += colWidth[2]
    doc.text(`KSh ${Number(item.lineTotal).toLocaleString()}`, x + colWidth[3] - 4, y + 3.5, { align: "right" })

    y += rowH
  })

  return y + 2
}

function drawTotalsSection(doc: jsPDF, subTotal: number, startY: number, branding?: { primaryColor?: string }) {
  const rightX = 12 + 186 - 60
  let y = startY + 3

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  setColorFromHex(doc, DEFAULT_TEXT, "text")

  doc.text("Subtotal", rightX, y)
  doc.text(`KSh ${Number(subTotal).toLocaleString()}`, 198, y, { align: "right" })

  y += 7

  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  setColorFromHex(doc, primary, "draw")
  doc.setLineWidth(0.5)
  doc.line(rightX - 5, y - 1, 198, y - 1)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  setColorFromHex(doc, primary, "text")
  doc.text("Total Credit", rightX, y + 5)
  doc.text(`KSh ${Number(subTotal).toLocaleString()}`, 198, y + 5, { align: "right" })

  return y + 12
}

function drawCreditNoteMetaSection(
  doc: jsPDF,
  params: {
    creditNoteNumber: string
    invoiceNumber: string
    createdAt: Date | string
    reason: string
    reasonDetails?: string
  },
  startY: number,
  branding?: { primaryColor?: string },
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  const boxX = 12
  const boxY = startY + 2
  const boxW = 186
  const boxH = params.reasonDetails ? 24 : 18

  setColorFromHex(doc, primary, "draw")
  doc.setLineWidth(0.35)
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2)

  setColorFromHex(doc, DEFAULT_LIGHT, "fill")
  doc.roundedRect(boxX, boxY, boxW, 6.5, 2, 2, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text("Credit Note Details", boxX + 3, boxY + 4.4)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  setColorFromHex(doc, DEFAULT_GRAY, "text")

  const leftColX = boxX + 3
  const rightColX = boxX + 96
  const line1Y = boxY + 11
  const line2Y = boxY + 16

  doc.text(`Credit Note No: ${params.creditNoteNumber}`, leftColX, line1Y)
  doc.text(`Reference Invoice: ${params.invoiceNumber}`, rightColX, line1Y)
  doc.text(`Issued: ${new Date(params.createdAt).toLocaleDateString("en-KE")}`, leftColX, line2Y)
  doc.text(`Reason: ${params.reason}`, rightColX, line2Y)

  if (params.reasonDetails) {
    const detailsLines = doc.splitTextToSize(params.reasonDetails, 180)
    doc.setFontSize(8)
    doc.text(`Details: ${detailsLines[0]}`, leftColX, boxY + 21)
    if (detailsLines.length > 1) {
      detailsLines.slice(1).forEach((line: string, idx: number) => {
        doc.text(line, leftColX, boxY + 25 + idx * 4)
      })
    }
  }

  return boxY + boxH + (params.reasonDetails ? 4 : 2)
}

export function generateCreditNotePdf(params: {
  creditNoteNumber: string
  invoiceNumber: string
  createdAt: Date | string
  client: DocumentClient
  items: DocumentItem[]
  subTotal: number
  reason: string
  reasonDetails?: string
  branding?: TenantBranding
  preparedBy?: string
  watermarkText?: string
}): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" })

  drawWatermark(doc, params.watermarkText)

  // Keep the layout aligned with the invoice template for consistency
  drawModernHeader(
    doc,
    "Credit Note",
    "Credit Note No",
    params.creditNoteNumber,
    String(params.createdAt),
    params.branding
  )

  const contactBottom = drawContactSlotBelowLogo(doc, params.branding)

  const partiesBottom = drawPartiesSection(doc, params.client, contactBottom + 1, params.branding)
  const metaBottom = drawCreditNoteMetaSection(
    doc,
    {
      creditNoteNumber: params.creditNoteNumber,
      invoiceNumber: params.invoiceNumber,
      createdAt: params.createdAt,
      reason: params.reason,
      reasonDetails: params.reasonDetails,
    },
    partiesBottom,
    params.branding,
  )

  const endY = drawItemsTable(doc, metaBottom, params.items, params.branding)

  drawTotalsSection(doc, params.subTotal, endY, params.branding)

  // Convert to buffer
  return Buffer.from(doc.output("arraybuffer"))
}
