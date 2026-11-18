import type ExcelJS from "exceljs"

export const REGISTER_FONT = "Trebuchet MS"
export const MONEY_FORMAT = '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-'
export const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
}
const THIN: ExcelJS.BorderStyle = "thin"
export const BOX: Partial<ExcelJS.Borders> = {
  top: { style: THIN, color: { argb: "FF7F7F7F" } },
  left: { style: THIN, color: { argb: "FF7F7F7F" } },
  bottom: { style: THIN, color: { argb: "FF7F7F7F" } },
  right: { style: THIN, color: { argb: "FF7F7F7F" } },
}

export type RegisterColumn = {
  key: string
  label: string
  kind: "text" | "id" | "money"
  width: number
  group?: string
  subLabel?: string
  stub?: string
  align?: ExcelJS.Alignment["horizontal"]
}

export type RegisterSummaryItem = {
  label: string
  keys: string[]
}

export type RegisterSpec = {
  companyName: string
  month: string
  documentName: string
  sheetKind: string
  summaryTitle?: string
  columns: RegisterColumn[]
  rows: Array<Record<string, string | number>>
  summary: RegisterSummaryItem[]
  addSummaryTotal?: boolean
}

export function colLetter(indexZeroBased: number) {
  let n = indexZeroBased
  let out = ""
  while (n >= 0) {
    out = String.fromCharCode((n % 26) + 65) + out
    n = Math.floor(n / 26) - 1
  }
  return out
}

export function monthParts(month: string) {
  const [yearPart, monthPart] = String(month || "").split("-")
  const year = Number(yearPart)
  const monthIndex = Number(monthPart)
  const date = year && monthIndex ? new Date(year, monthIndex - 1, 1) : new Date()
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const longLabel = lastDay.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  const shortLabel = lastDay
    .toLocaleDateString("en-GB", { month: "short" })
    .toUpperCase()
    .replace(".", "")
  return {
    lastDay,
    longLabel,
    shortLabel,
    periodLabel: `${lastDay.getDate()} ${longLabel}`,
    fileMonth: longLabel.toUpperCase(),
  }
}

export function employeeOf(payroll: any, employees: any[]) {
  return employees.find((entry) => String(entry._id) === String(payroll.user_id)) || null
}

export function splitEmployeeName(employee: any) {
  const last = String(employee?.lastName ?? employee?.last_name ?? "").trim()
  const first = String(employee?.firstName ?? employee?.first_name ?? "").trim()
  return {
    surname: last.toUpperCase(),
    otherNames: first.toUpperCase(),
  }
}

export function employeeField(employee: any, keys: string[]) {
  for (const key of keys) {
    const value = key.includes(".")
      ? key.split(".").reduce((current: any, part) => current?.[part], employee)
      : employee?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return ""
}

export function moneyAmount(value: number) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0
}

export function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { name: REGISTER_FONT, size: 10, bold: true, color: { argb: "FF1F1F1F" } }
  cell.fill = HEADER_FILL
  cell.border = BOX
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
}

export function styleText(cell: ExcelJS.Cell, align: ExcelJS.Alignment["horizontal"] = "left") {
  cell.font = { name: REGISTER_FONT, size: 10 }
  cell.border = BOX
  cell.alignment = { horizontal: align, vertical: "middle" }
}

export function styleMoney(cell: ExcelJS.Cell, bold = false) {
  cell.font = { name: REGISTER_FONT, size: 10, bold }
  cell.numFmt = MONEY_FORMAT
  cell.border = BOX
  cell.alignment = { horizontal: "right", vertical: "middle" }
}

export function paintRow(ws: ExcelJS.Worksheet, row: number, lastCol: number, painter: (cell: ExcelJS.Cell) => void) {
  for (let c = 1; c <= lastCol; c += 1) painter(ws.getCell(row, c))
}

export function registerSheetOptions(freezeRows = 5): Partial<ExcelJS.AddWorksheetOptions> {
  return {
    views: [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: freezeRows, zoomScale: 90 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 8,
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  }
}

export async function createRegisterWorkbook(companyName: string) {
  const ExcelRuntime = (await import("exceljs")).default
  const workbook = new ExcelRuntime.Workbook()
  workbook.creator = companyName || "Elevate HR"
  workbook.created = new Date()
  return workbook
}

export function downloadExcelBuffer(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function groupRange(columns: RegisterColumn[], start: number) {
  const group = columns[start].group
  if (!group) return { start, end: start }
  let end = start
  while (end + 1 < columns.length && columns[end + 1].group === group) end += 1
  return { start, end }
}

function columnIndex(columns: RegisterColumn[], key: string) {
  return columns.findIndex((column) => column.key === key) + 1
}

export async function buildRegisterWorkbook(spec: RegisterSpec) {
  const { shortLabel, periodLabel, fileMonth } = monthParts(spec.month)
  const columns = spec.columns
  const lastCol = columns.length
  const sheetName = `${shortLabel} _${spec.sheetKind}`.slice(0, 31)
  const workbook = await createRegisterWorkbook(spec.companyName)
  const ws = workbook.addWorksheet(sheetName, registerSheetOptions(5))

  columns.forEach((column, index) => {
    ws.getColumn(index + 1).width = column.width
  })

  ws.getRow(1).height = 18
  ws.getRow(2).height = 16
  ws.getRow(3).height = 18
  ws.getRow(4).height = 32
  ws.getRow(5).height = 16

  const titleStart = Math.min(2, lastCol)
  const titleEnd = Math.min(lastCol, titleStart + 2)
  ws.mergeCells(1, titleStart, 1, titleEnd)
  const title = ws.getCell(1, titleStart)
  title.value = String(spec.companyName || "COMPANY").toUpperCase()
  title.font = { name: REGISTER_FONT, size: 12, bold: true }

  ws.mergeCells(2, titleStart, 2, titleEnd)
  const period = ws.getCell(2, titleStart)
  period.value = `${periodLabel}  ·  ${spec.documentName}`
  period.font = { name: REGISTER_FONT, size: 10, bold: true }

  paintRow(ws, 3, lastCol, styleHeader)
  paintRow(ws, 4, lastCol, styleHeader)
  paintRow(ws, 5, lastCol, styleHeader)

  let index = 0
  while (index < columns.length) {
    const { start, end } = groupRange(columns, index)
    const startCol = start + 1
    const endCol = end + 1
    const hasSub = columns.slice(start, end + 1).some((column) => column.subLabel)
    ws.getCell(3, startCol).value = columns[start].label
    if (endCol > startCol) {
      if (hasSub) ws.mergeCells(3, startCol, 3, endCol)
      else ws.mergeCells(3, startCol, 4, endCol)
    } else if (!hasSub) {
      ws.mergeCells(3, startCol, 4, startCol)
    }
    if (hasSub) {
      for (let i = start; i <= end; i += 1) {
        ws.getCell(4, i + 1).value = columns[i].subLabel || ""
      }
    }
    index = end + 1
  }

  columns.forEach((column, colIndex) => {
    ws.getCell(5, colIndex + 1).value = column.stub || (column.kind === "money" ? "Ksh" : "")
  })

  const firstDataRow = 6
  spec.rows.forEach((row, rowIndex) => {
    const rowNumber = firstDataRow + rowIndex
    ws.getRow(rowNumber).height = 16
    columns.forEach((column, colIndex) => {
      const cell = ws.getCell(rowNumber, colIndex + 1)
      const value = row[column.key]
      if (column.kind === "money") {
        cell.value = moneyAmount(Number(value || 0))
        styleMoney(cell)
      } else {
        cell.value = value == null ? "" : String(value)
        styleText(cell, column.align || (column.kind === "id" ? "center" : "left"))
      }
    })
  })

  const lastDataRow = spec.rows.length ? firstDataRow + spec.rows.length - 1 : firstDataRow
  const totalRow = spec.rows.length ? lastDataRow + 1 : firstDataRow
  const surnameCol = columnIndex(columns, "surname") || 2
  const otherNamesCol = columnIndex(columns, "otherNames") || surnameCol
  ws.getRow(totalRow).height = 18
  if (otherNamesCol > surnameCol) ws.mergeCells(totalRow, surnameCol, totalRow, otherNamesCol)
  paintRow(ws, totalRow, lastCol, (cell) => {
    cell.fill = HEADER_FILL
    cell.border = BOX
    cell.font = { name: REGISTER_FONT, size: 10, bold: true }
  })
  ws.getCell(totalRow, surnameCol).value = "GRAND TOTAL"
  ws.getCell(totalRow, surnameCol).alignment = { horizontal: "left", vertical: "middle" }

  if (spec.rows.length) {
    columns.forEach((column, colIndex) => {
      if (column.kind !== "money") return
      const letter = colLetter(colIndex)
      const cell = ws.getCell(totalRow, colIndex + 1)
      cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` }
      styleMoney(cell, true)
      cell.fill = HEADER_FILL
    })
  }

  const amountCol = columns.findIndex((column) => column.kind === "money") + 1 || Math.min(4, lastCol)
  const summaryStart = totalRow + 3
  if (otherNamesCol > surnameCol) ws.mergeCells(summaryStart, surnameCol, summaryStart, otherNamesCol)
  const summaryTitle = ws.getCell(summaryStart, surnameCol)
  summaryTitle.value = spec.summaryTitle || `${spec.documentName} SUMMARY`
  summaryTitle.font = { name: REGISTER_FONT, size: 10, bold: true }
  summaryTitle.fill = HEADER_FILL
  summaryTitle.border = BOX
  const ksh = ws.getCell(summaryStart, amountCol)
  ksh.value = "Ksh"
  ksh.font = { name: REGISTER_FONT, size: 10, bold: true }
  ksh.border = BOX
  ksh.alignment = { horizontal: "center" }

  spec.summary.forEach((item, itemIndex) => {
    const rowNumber = summaryStart + 1 + itemIndex
    if (otherNamesCol > surnameCol) ws.mergeCells(rowNumber, surnameCol, rowNumber, otherNamesCol)
    const label = ws.getCell(rowNumber, surnameCol)
    label.value = item.label
    label.font = { name: REGISTER_FONT, size: 10 }
    label.border = BOX
    const amount = ws.getCell(rowNumber, amountCol)
    const formula = item.keys
      .map((key) => {
        const col = columnIndex(columns, key)
        return col ? `${colLetter(col - 1)}${totalRow}` : "0"
      })
      .join("+")
    amount.value = { formula: formula || "0" }
    styleMoney(amount, true)
  })

  if (spec.addSummaryTotal !== false) {
    const totalSummaryRow = summaryStart + 1 + spec.summary.length
    if (otherNamesCol > surnameCol) ws.mergeCells(totalSummaryRow, surnameCol, totalSummaryRow, otherNamesCol)
    const totalSummaryLabel = ws.getCell(totalSummaryRow, surnameCol)
    totalSummaryLabel.value = "TOTAL"
    totalSummaryLabel.font = { name: REGISTER_FONT, size: 10, bold: true }
    totalSummaryLabel.fill = HEADER_FILL
    totalSummaryLabel.border = BOX
    const totalSummaryAmount = ws.getCell(totalSummaryRow, amountCol)
    totalSummaryAmount.value = {
      formula: spec.summary.length
        ? `SUM(${colLetter(amountCol - 1)}${summaryStart + 1}:${colLetter(amountCol - 1)}${totalSummaryRow - 1})`
        : "0",
    }
    styleMoney(totalSummaryAmount, true)
    totalSummaryAmount.fill = HEADER_FILL
  }

  ws.headerFooter.oddFooter = `&L${String(spec.companyName || "").toUpperCase()}&C${sheetName}&RPage &P of &N`

  return {
    workbook,
    filename: `${spec.documentName} FOR ${fileMonth}.xlsx`,
  }
}

export async function downloadRegisterWorkbook(spec: RegisterSpec) {
  const { workbook, filename } = await buildRegisterWorkbook(spec)
  const buffer = await workbook.xlsx.writeBuffer()
  downloadExcelBuffer(buffer, filename)
}
