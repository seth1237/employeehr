import { jsPDF } from "jspdf"
import { companyApi } from "@/lib/api"
import { cleanActivityLabel } from "@/lib/engineer-activity"

const DEFAULT_PRIMARY = "#0f766e"
const DEFAULT_TEXT = "#1f2937"
const DEFAULT_GRAY = "#6b7280"
const PAGE_W = 297
const PAGE_H = 210
const MARGIN = 12
const TABLE_W = PAGE_W - MARGIN * 2
const PAGE_BOTTOM = 190

export type ReportBranding = {
  name?: string
  logo?: string
  primaryColor?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  country?: string
}

export type MachineHistoryEvent = {
  kind: string
  title: string
  status?: string
  when?: string
  person?: string
  detail?: string
}

export type EngineerActivityRow = {
  date?: string
  woNumber?: string
  job: string
  type?: string
  kind?: string
  status?: string
  notes?: string
  machineOkay?: boolean | null
  machine?: string
  serialNumber?: string
  facility?: string
  location?: string
  engineerName?: string
}

function isLoggedActivityRow(row: EngineerActivityRow) {
  const kind = String(row.kind || "").toLowerCase()
  const type = String(row.type || "").toLowerCase()
  return (
    kind === "logged" ||
    kind === "other_activity" ||
    ["cme", "sme_session", "in_office", "in_office_repair", "other"].includes(type)
  )
}

type Column = { id: string; header: string; width: number }

function hexToRgb(hex?: string) {
  const normalized = String(hex || "").replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function brandHex(color?: string) {
  return color?.startsWith("#") ? color : DEFAULT_PRIMARY
}

function setColor(doc: jsPDF, hex: string, kind: "fill" | "text" | "draw") {
  const { r, g, b } = hexToRgb(hex)
  if (kind === "fill") doc.setFillColor(r, g, b)
  if (kind === "text") doc.setTextColor(r, g, b)
  if (kind === "draw") doc.setDrawColor(r, g, b)
}

function resolveAssetUrl(src?: string) {
  if (!src) return ""
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http://") || src.startsWith("https://")) {
    return src
  }
  if (src.startsWith("//")) return `${window.location.protocol}${src}`
  return `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`
}

async function imageDataUrl(src?: string): Promise<string | null> {
  const url = resolveAssetUrl(src)
  if (!url) return null
  if (url.startsWith("data:")) return url
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || "") || null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function imageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG"
  if (dataUrl.startsWith("data:image/webp")) return "WEBP"
  return "PNG"
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function prettyStatus(value?: string) {
  return String(value || "open").replace(/_/g, " ").toUpperCase()
}

function prettyActivityType(kind?: string) {
  const value = String(kind || "").toLowerCase()
  if (value === "installation") return "INSTALLATION"
  if (value === "breakdown" || value === "repair") return "REPAIR"
  if (value === "calibration") return "CALIBRATION"
  if (value === "ticket" || value === "request") return "FAULT REPORT"
  if (value === "logged" || value === "other_activity") return "ACTIVITY"
  return "SERVICE"
}

function fileSafe(value: string) {
  return value.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "report"
}

export async function loadReportBranding(): Promise<ReportBranding> {
  try {
    const res = await companyApi.getBranding()
    const data = res.data || {}
    const logo = await imageDataUrl(data.logo)
    return {
      name: data.name,
      logo: logo || undefined,
      primaryColor: data.primaryColor,
      email: data.email,
      phone: data.phone,
      city: data.city,
      state: data.state,
      country: data.country,
    }
  } catch {
    return {}
  }
}

function drawHeader(doc: jsPDF, title: string, period: string, branding: ReportBranding) {
  const primary = brandHex(branding.primaryColor)
  if (branding.logo) {
    try {
      const props = doc.getImageProperties(branding.logo)
      const maxW = 40
      const maxH = 16
      const ratio = Number(props.width || 1) / Number(props.height || 1)
      let drawW = maxW
      let drawH = drawW / ratio
      if (drawH > maxH) {
        drawH = maxH
        drawW = drawH * ratio
      }
      doc.addImage(branding.logo, imageFormat(branding.logo), MARGIN, 12, drawW, drawH)
    } catch {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      setColor(doc, DEFAULT_TEXT, "text")
      doc.text(branding.name || "ElevateHub", MARGIN, 20)
    }
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    setColor(doc, DEFAULT_TEXT, "text")
    doc.text(branding.name || "ElevateHub", MARGIN, 20)
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  setColor(doc, primary, "text")
  doc.text(title.toUpperCase(), PAGE_W - MARGIN, 20, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  setColor(doc, DEFAULT_GRAY, "text")
  doc.text(period, PAGE_W - MARGIN, 27, { align: "right" })

  setColor(doc, "#e2e8f0", "draw")
  doc.setLineWidth(0.4)
  doc.line(MARGIN, 34, PAGE_W - MARGIN, 34)
  return 40
}

function drawMetaStrip(
  doc: jsPDF,
  y: number,
  cells: Array<{ label: string; value: string }>,
  branding: ReportBranding,
) {
  const primary = brandHex(branding.primaryColor)
  const height = 16
  const gap = 2
  const cellW = (TABLE_W - gap * (cells.length - 1)) / cells.length
  cells.forEach((cell, index) => {
    const x = MARGIN + index * (cellW + gap)
    setColor(doc, "#f8fafc", "fill")
    doc.rect(x, y, cellW, height, "F")
    setColor(doc, primary, "draw")
    doc.setLineWidth(0.3)
    doc.rect(x, y, cellW, height)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    setColor(doc, DEFAULT_GRAY, "text")
    doc.text(cell.label.toUpperCase(), x + 3, y + 5)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    setColor(doc, DEFAULT_TEXT, "text")
    const lines = doc.splitTextToSize(cell.value || "—", cellW - 6)
    doc.text(lines[0] || "—", x + 3, y + 11)
  })
  return y + height + 5
}

function drawFooter(doc: jsPDF, branding: ReportBranding, page: number, pages: number) {
  const company = [branding.name, branding.phone, branding.email].filter(Boolean).join("  ·  ")
  setColor(doc, "#e2e8f0", "draw")
  doc.setLineWidth(0.3)
  doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  setColor(doc, DEFAULT_GRAY, "text")
  doc.text(company || "Technical service report", MARGIN, PAGE_H - 7)
  doc.text(`Page ${page} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" })
}

function applyFooters(doc: jsPDF, branding: ReportBranding) {
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    drawFooter(doc, branding, page, pages)
  }
}

function drawTableHeader(doc: jsPDF, y: number, columns: Column[], primary: string) {
  setColor(doc, primary, "fill")
  doc.rect(MARGIN, y, TABLE_W, 9, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  let x = MARGIN
  columns.forEach((col) => {
    doc.text(col.header, x + 2.5, y + 6)
    x += col.width
  })
  return y + 9
}

function drawRowShell(doc: jsPDF, y: number, height: number, index: number, primary: string) {
  if (index % 2 === 0) {
    doc.setFillColor(248, 250, 252)
    doc.rect(MARGIN, y, TABLE_W, height, "F")
  }
  setColor(doc, primary, "draw")
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, MARGIN, y + height)
  doc.line(MARGIN + TABLE_W, y, MARGIN + TABLE_W, y + height)
  doc.line(MARGIN, y + height, MARGIN + TABLE_W, y + height)
}

function wrapCell(doc: jsPDF, text: string, width: number, maxLines = 4) {
  const lines = doc.splitTextToSize(String(text || "—"), width - 5) as string[]
  return lines.slice(0, maxLines)
}

function drawDataRows(
  doc: jsPDF,
  startY: number,
  columns: Column[],
  rows: Array<Record<string, string>>,
  branding: ReportBranding,
  title: string,
  period: string,
  meta?: Array<{ label: string; value: string }>,
  recordCount?: number,
) {
  const primary = brandHex(branding.primaryColor)
  let y = startY
  y = drawTableHeader(doc, y, columns, primary)

  rows.forEach((row, index) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    const wrapped = columns.map((col) => wrapCell(doc, row[col.id] || "—", col.width, col.id === "report" ? 5 : 3))
    const height = Math.max(9, ...wrapped.map((lines) => lines.length * 3.6 + 4))
    if (y + height > PAGE_BOTTOM) {
      doc.addPage()
      y = drawHeader(doc, title, period, branding)
      if (meta?.length) y = drawMetaStrip(doc, y, meta, branding)
      y = drawTableHeader(doc, y, columns, primary)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
    }
    drawRowShell(doc, y, height, index, primary)
    setColor(doc, DEFAULT_TEXT, "text")
    let x = MARGIN
    columns.forEach((col, colIndex) => {
      const lines = wrapped[colIndex]
      lines.forEach((line, lineIndex) => {
        doc.text(line, x + 2.5, y + 4.2 + lineIndex * 3.6)
      })
      if (x > MARGIN) {
        setColor(doc, primary, "draw")
        doc.setLineWidth(0.15)
        doc.line(x, y, x, y + height)
        setColor(doc, DEFAULT_TEXT, "text")
      }
      x += col.width
    })
    y += height
  })

  if (y + 10 > PAGE_BOTTOM) {
    doc.addPage()
    y = drawHeader(doc, title, period, branding)
  }
  setColor(doc, "#f1f5f9", "fill")
  doc.rect(MARGIN, y, TABLE_W, 9, "F")
  setColor(doc, primary, "draw")
  doc.setLineWidth(0.35)
  doc.rect(MARGIN, y, TABLE_W, 9)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  setColor(doc, DEFAULT_TEXT, "text")
  const count = recordCount ?? rows.length
  doc.text(`${count} record${count === 1 ? "" : "s"}`, MARGIN + 3, y + 6)
  return y + 14
}

function drawSectionTitle(doc: jsPDF, y: number, label: string, branding: ReportBranding) {
  if (y + 16 > PAGE_BOTTOM) {
    doc.addPage()
    y = MARGIN + 8
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  setColor(doc, brandHex(branding.primaryColor), "text")
  doc.text(label, MARGIN, y + 6)
  setColor(doc, DEFAULT_TEXT, "text")
  return y + 10
}

export async function downloadMachineHistoryPdf(params: {
  machineName: string
  serialNumber?: string
  status?: string
  facility?: string
  location?: string
  attendant?: string
  installedBy?: string
  installationDate?: string
  events: MachineHistoryEvent[]
  branding?: ReportBranding
}) {
  const branding = params.branding || (await loadReportBranding())
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" })
  const period = `Generated ${formatDateTime(new Date().toISOString())}`
  const title = "Machine History"
  const meta = [
    { label: "Facility", value: params.facility || "—" },
    { label: "Location", value: params.location || "—" },
    {
      label: "Machine",
      value: [params.machineName, params.serialNumber ? `SN ${params.serialNumber}` : "", params.status ? prettyStatus(params.status) : ""]
        .filter(Boolean)
        .join(" · "),
    },
    {
      label: "In charge / installed",
      value:
        [
          params.attendant,
          params.installedBy
            ? `Installed by ${params.installedBy}${params.installationDate ? ` · ${formatDate(params.installationDate)}` : ""}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ") || "—",
    },
  ]
  let y = drawHeader(doc, title, period, branding)
  y = drawMetaStrip(doc, y, meta, branding)

  const columns: Column[] = [
    { id: "date", header: "Date", width: 28 },
    { id: "type", header: "Type", width: 28 },
    { id: "activity", header: "Activity", width: 52 },
    { id: "engineer", header: "Engineer", width: 36 },
    { id: "status", header: "Status", width: 28 },
    { id: "report", header: "Report", width: 101 },
  ]
  const rows = params.events.map((event) => ({
    date: formatDateTime(event.when),
    type: prettyActivityType(event.kind),
    activity: cleanActivityLabel({ kind: event.kind, title: event.title }),
    engineer: event.person || "—",
    status: prettyStatus(event.status),
    report: event.detail || "—",
  }))
  if (!rows.length) {
    rows.push({
      date: "—",
      type: "—",
      activity: "No service history recorded yet",
      engineer: "—",
      status: "—",
      report: "—",
    })
  }
  drawDataRows(doc, y, columns, rows, branding, title, period, meta, params.events.length)
  applyFooters(doc, branding)
  const name = fileSafe([params.machineName, params.serialNumber, "history"].filter(Boolean).join("-"))
  doc.save(`${name}.pdf`)
}

export async function downloadEngineerActivityPdf(params: {
  engineerName: string
  periodLabel: string
  activities: EngineerActivityRow[]
  branding?: ReportBranding
}) {
  const branding = params.branding || (await loadReportBranding())
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" })
  const title = "Engineer Activity"
  const period = `${params.engineerName}  ·  ${params.periodLabel}`
  const fieldWork = params.activities.filter((row) => !isLoggedActivityRow(row))
  const otherWork = params.activities.filter((row) => isLoggedActivityRow(row))
  const completed = fieldWork.filter((row) => String(row.status || "").toLowerCase() === "completed").length
  const open = fieldWork.filter((row) => {
    const status = String(row.status || "").toLowerCase()
    return status && status !== "completed" && status !== "cancelled"
  }).length
  const meta = [
    { label: "Engineer", value: params.engineerName },
    { label: "Field jobs", value: String(fieldWork.length) },
    { label: "Completed / open", value: `${completed} / ${open}` },
    { label: "Other activities", value: String(otherWork.length) },
  ]
  let y = drawHeader(doc, title, period, branding)
  y = drawMetaStrip(doc, y, meta, branding)

  const showEngineer = params.activities.some((row) => row.engineerName)
  const fieldColumns: Column[] = showEngineer
    ? [
        { id: "date", header: "Date", width: 24 },
        { id: "engineer", header: "Engineer", width: 32 },
        { id: "job", header: "Activity", width: 36 },
        { id: "machine", header: "Machine", width: 40 },
        { id: "facility", header: "Facility", width: 40 },
        { id: "status", header: "Status", width: 22 },
        { id: "report", header: "Report", width: 79 },
      ]
    : [
        { id: "date", header: "Date", width: 26 },
        { id: "job", header: "Activity", width: 40 },
        { id: "machine", header: "Machine", width: 46 },
        { id: "facility", header: "Facility", width: 46 },
        { id: "status", header: "Status", width: 24 },
        { id: "report", header: "Report", width: 91 },
      ]
  const toFieldRow = (row: EngineerActivityRow) => {
    const machine = [row.machine, row.serialNumber ? `SN ${row.serialNumber}` : ""].filter(Boolean).join(" · ")
    const facility = [row.facility, row.location].filter(Boolean).join(" · ")
    const reportBits = [
      row.notes,
      row.machineOkay === true ? "Machine okay" : "",
      row.machineOkay === false ? "Machine not okay" : "",
    ].filter(Boolean)
    return {
      date: formatDate(row.date),
      engineer: row.engineerName || "—",
      job: cleanActivityLabel(row),
      machine: machine || "—",
      facility: facility || "—",
      status: prettyStatus(row.status),
      report: reportBits.join(" · ") || "—",
    }
  }
  const fieldRows = fieldWork.map(toFieldRow)
  if (!fieldRows.length) {
    fieldRows.push({
      date: "—",
      engineer: "—",
      job: "No field jobs in this period",
      machine: "—",
      facility: "—",
      status: "—",
      report: "—",
    })
  }
  y = drawSectionTitle(doc, y, "Field jobs", branding)
  y = drawDataRows(doc, y, fieldColumns, fieldRows, branding, title, period, meta, fieldWork.length)

  const otherColumns: Column[] = showEngineer
    ? [
        { id: "date", header: "Date", width: 28 },
        { id: "engineer", header: "Engineer", width: 40 },
        { id: "job", header: "Activity", width: 48 },
        { id: "status", header: "Status", width: 28 },
        { id: "report", header: "Notes", width: 129 },
      ]
    : [
        { id: "date", header: "Date", width: 32 },
        { id: "job", header: "Activity", width: 52 },
        { id: "status", header: "Status", width: 32 },
        { id: "report", header: "Notes", width: 157 },
      ]
  const otherRows = otherWork.map((row) => ({
    date: formatDate(row.date),
    engineer: row.engineerName || "—",
    job: cleanActivityLabel(row),
    status: prettyStatus(row.status),
    report: row.notes || "—",
  }))
  if (!otherRows.length) {
    otherRows.push({
      date: "—",
      engineer: "—",
      job: "No office, CME, or other activities in this period",
      status: "—",
      report: "—",
    })
  }
  y = drawSectionTitle(doc, y, "Other activities", branding)
  drawDataRows(doc, y, otherColumns, otherRows, branding, title, period, meta, otherWork.length)
  applyFooters(doc, branding)
  doc.save(`${fileSafe(`engineer-activity-${params.engineerName}-${params.periodLabel}`)}.pdf`)
}
