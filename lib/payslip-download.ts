import { jsPDF } from "jspdf"

export type EmployeePayslipDownload = {
  payslip: {
    month: string
    base_salary: number
    bonus: number
    other_bonus_items?: { name: string; amount: number }[]
    deduction_items?: { name: string; amount: number }[]
    total_deductions: number
    net_pay: number
    generated_at?: string
    status?: string
  }
  user: {
    firstName?: string
    lastName?: string
    first_name?: string
    last_name?: string
    employee_id?: string
    position?: string
    department?: string
  }
  company: {
    name?: string
    logo?: string
    email?: string
    phone?: string
    city?: string
    state?: string
    country?: string
  }
}

export function formatPayslipAmount(value: number, negative = false) {
  const formatted = Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return negative ? `-${formatted}` : formatted
}

export function payrollPeriodLabel(month: string) {
  const parsed = new Date(`${month}-01`)
  if (Number.isNaN(parsed.getTime())) return month
  return parsed.toLocaleDateString("en-KE", { month: "long", year: "numeric" })
}

function hexRgb(hex: string) {
  const normalized = String(hex || "").replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function brandHex(color?: string) {
  return color?.startsWith("#") ? color : "#0f766e"
}

function personName(user: EmployeePayslipDownload["user"]) {
  return `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || "Employee"
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

type Row = { label: string; amount: string; kind: "item" | "subtotal" | "section" }

export async function downloadEmployeePayslip(
  detail: EmployeePayslipDownload,
  primaryColor = "#0f766e",
) {
  const { payslip, user, company } = detail
  const brand = brandHex(primaryColor)
  const rgb = hexRgb(brand)
  const extras = payslip.other_bonus_items || []
  const deductions = payslip.deduction_items || []
  const gross =
    Number(payslip.base_salary || 0) +
    Number(payslip.bonus || 0) +
    extras.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const status = String(payslip.status || "processed").toLowerCase()
  const statusLabel = status === "paid" ? "Paid" : status === "draft" ? "Draft" : "Processed"
  const place = [company.city, company.state, company.country].filter(Boolean).join(", ")
  const contact = [company.email, company.phone].filter(Boolean).join("  |  ")
  const logo = await imageDataUrl(company.logo)

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = 210
  const left = 18
  const right = pageW - 18
  const width = right - left
  const amountX = right
  const labelX = left
  let y = 20

  if (logo) {
    try {
      const props = doc.getImageProperties(logo)
      const maxW = 32
      const maxH = 12
      const ratio = Number(props.width || 1) / Number(props.height || 1)
      let drawW = maxW
      let drawH = drawW / ratio
      if (drawH > maxH) {
        drawH = maxH
        drawW = drawH * ratio
      }
      doc.addImage(logo, imageFormat(logo), left, y, drawW, drawH)
    } catch {
      // company name is enough if the logo cannot be embedded
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text("PAYSLIP", right, y + 4, { align: "right" })
  doc.setFontSize(16)
  doc.text(payrollPeriodLabel(payslip.month), right, y + 12, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(statusLabel, right, y + 18, { align: "right" })

  y += 16
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(company.name || "Company", left, y)
  y += 5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  if (contact) {
    doc.text(contact, left, y)
    y += 4.5
  }
  if (place) {
    doc.text(place, left, y)
    y += 4.5
  }

  y += 4
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.4)
  doc.line(left, y, right, y)
  y += 8

  const facts: Array<[string, string]> = [
    ["Employee", personName(user)],
    ["Employee ID", user.employee_id || "-"],
    ["Position", user.position || "-"],
    ["Department", user.department || "-"],
  ]
  const factW = width / 4
  facts.forEach(([label, value], index) => {
    const x = left + factW * index
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(label, x, y)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(doc.splitTextToSize(value, factW - 4)[0] || "-", x, y + 5)
  })

  y += 14
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(left, y, right, y)
  y += 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text("DESCRIPTION", labelX, y)
  doc.text("AMOUNT (KES)", amountX, y, { align: "right" })
  y += 3
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.35)
  doc.line(left, y, right, y)
  y += 7

  const rows: Row[] = [
    { label: "Earnings", amount: "", kind: "section" },
    { label: "Basic salary", amount: formatPayslipAmount(payslip.base_salary), kind: "item" },
  ]
  if (Number(payslip.bonus || 0) > 0) {
    rows.push({ label: "Bonus", amount: formatPayslipAmount(payslip.bonus), kind: "item" })
  }
  extras.forEach((item) => {
    rows.push({ label: item.name, amount: formatPayslipAmount(item.amount), kind: "item" })
  })
  rows.push({ label: "Gross pay", amount: formatPayslipAmount(gross), kind: "subtotal" })
  rows.push({ label: "Deductions", amount: "", kind: "section" })
  if (deductions.length) {
    deductions.forEach((item) => {
      rows.push({ label: item.name, amount: formatPayslipAmount(item.amount, true), kind: "item" })
    })
  } else {
    rows.push({ label: "None", amount: formatPayslipAmount(0), kind: "item" })
  }
  rows.push({
    label: "Total deductions",
    amount: formatPayslipAmount(payslip.total_deductions, true),
    kind: "subtotal",
  })

  rows.forEach((row) => {
    if (row.kind === "section") {
      y += 2
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(row.label.toUpperCase(), labelX, y)
      y += 6
      return
    }

    if (row.kind === "subtotal") {
      doc.setFillColor(248, 250, 252)
      doc.rect(left, y - 4.5, width, 8, "F")
    }

    doc.setFont("helvetica", row.kind === "subtotal" ? "bold" : "normal")
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(row.label, labelX, y)
    doc.setFont("courier", row.kind === "subtotal" ? "bold" : "normal")
    doc.setFontSize(10)
    if (row.amount.startsWith("-")) doc.setTextColor(15, 23, 42)
    doc.text(row.amount, amountX, y, { align: "right" })
    y += 7
  })

  y += 3
  doc.setFillColor(rgb.r, rgb.g, rgb.b)
  doc.rect(left, y, width, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Net pay", left + 4, y + 8)
  doc.setFont("courier", "bold")
  doc.setFontSize(12)
  doc.text(formatPayslipAmount(payslip.net_pay), right - 4, y + 8, { align: "right" })

  y += 20
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text("This is a computer-generated payslip and does not require a signature.", pageW / 2, y, {
    align: "center",
  })

  doc.save(`Payslip-${payrollPeriodLabel(payslip.month).replace(/\s+/g, "-")}.pdf`)
}
