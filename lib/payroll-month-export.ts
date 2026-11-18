import type ExcelJS from "exceljs"
import {
  BOX,
  HEADER_FILL,
  REGISTER_FONT,
  colLetter,
  createRegisterWorkbook,
  downloadExcelBuffer,
  employeeField,
  employeeOf,
  moneyAmount,
  monthParts,
  paintRow,
  registerSheetOptions,
  splitEmployeeName,
  styleHeader,
  styleMoney,
  styleText,
} from "@/lib/excel-register"
import {
  getDeductionAmountByAliases,
  isStatutoryDeduction,
  PERSONAL_RELIEF,
  statutoryDisplayName,
  statutoryKey,
} from "@/lib/payroll-calculator"

const PREFERRED_EXTRA_DEDUCTIONS = ["Savings", "SACCO", "Welfare", "Loan", "HELB"]
const BASE_WIDTHS = [8, 19, 19, 17, 14, 16, 16, 15, 13, 13, 13, 13, 15, 13, 13, 11, 11, 13, 12, 12, 13, 13]

type NamedAmount = { name?: string; amount?: number }

export type PayrollMonthExportInput = {
  companyName: string
  month: string
  payrolls: any[]
  employees: any[]
}

function extraDeductionColumns(payrolls: any[]) {
  const seen = new Map<string, string>()
  for (const payroll of payrolls) {
    for (const item of (payroll?.deduction_items || []) as NamedAmount[]) {
      const key = statutoryKey(item.name || "")
      if (!key || isStatutoryDeduction(item.name || "") || key === "advance") continue
      if (!seen.has(key)) {
        seen.set(key, statutoryDisplayName(item.name || "") || String(item.name))
      }
    }
  }

  const ordered: { key: string; label: string }[] = []
  for (const name of PREFERRED_EXTRA_DEDUCTIONS) {
    const key = statutoryKey(name)
    const label = seen.get(key)
    if (label) {
      ordered.push({ key, label: label.toUpperCase() })
      seen.delete(key)
    }
  }
  for (const [key, label] of [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))) {
    ordered.push({ key, label: label.toUpperCase() })
  }
  return ordered
}

export async function buildMonthPayrollWorkbook({
  companyName,
  month,
  payrolls,
  employees,
}: PayrollMonthExportInput) {
  const { longLabel, shortLabel, periodLabel } = monthParts(month)
  const sheetName = `${shortLabel} _PAYROLL`
  const extras = extraDeductionColumns(payrolls)

  const col = {
    payrollNo: 1,
    surname: 2,
    otherNames: 3,
    pin: 4,
    idNo: 5,
    basic: 6,
    benefits: 7,
    gross: 8,
    nssfEr: 9,
    nssfEe: 10,
    shif: 11,
    housing: 12,
    chargeable: 13,
    grossPaye: 14,
    relief: 15,
    shifRelief: 16,
    ahlRelief: 17,
    netPaye: 18,
    shifDed: 19,
    nssfDed: 20,
    housingDed: 21,
    advance: 22,
  }
  const extraStart = 23
  const totalDedCol = extraStart + extras.length
  const netCol = totalDedCol + 1
  const lastCol = netCol
  const deductionEnd = extras.length ? extraStart + extras.length - 1 : col.advance

  const rows = [...payrolls].sort((a, b) => {
    const left = splitEmployeeName(employeeOf(a, employees))
    const right = splitEmployeeName(employeeOf(b, employees))
    return `${left.surname} ${left.otherNames}`.localeCompare(`${right.surname} ${right.otherNames}`)
  })

  const workbook = await createRegisterWorkbook(companyName)
  const ws = workbook.addWorksheet(sheetName, registerSheetOptions(5))

  ;[...BASE_WIDTHS, ...extras.map(() => 13), 15, 14].forEach((width, index) => {
    ws.getColumn(index + 1).width = width
  })

  ws.getRow(1).height = 18
  ws.getRow(2).height = 16
  ws.getRow(3).height = 18
  ws.getRow(4).height = 32
  ws.getRow(5).height = 16

  ws.mergeCells(1, col.basic, 1, col.gross)
  const title = ws.getCell(1, col.basic)
  title.value = String(companyName || "COMPANY").toUpperCase()
  title.font = { name: REGISTER_FONT, size: 12, bold: true }

  ws.mergeCells(2, col.basic, 2, col.gross)
  const period = ws.getCell(2, col.basic)
  period.value = periodLabel
  period.font = { name: REGISTER_FONT, size: 10, bold: true }

  const merges: Array<[number, number, number, number]> = [
    [3, col.payrollNo, 4, col.payrollNo],
    [3, col.surname, 4, col.otherNames],
    [3, col.pin, 4, col.idNo],
    [3, col.basic, 4, col.basic],
    [3, col.benefits, 4, col.benefits],
    [3, col.gross, 4, col.gross],
    [3, col.nssfEr, 3, col.nssfEe],
    [3, col.shif, 4, col.shif],
    [3, col.housing, 4, col.housing],
    [3, col.chargeable, 4, col.chargeable],
    [3, col.grossPaye, 4, col.grossPaye],
    [3, col.relief, 4, col.relief],
    [3, col.shifRelief, 4, col.shifRelief],
    [3, col.ahlRelief, 4, col.ahlRelief],
    [3, col.netPaye, 3, deductionEnd],
    [3, totalDedCol, 4, totalDedCol],
    [3, netCol, 4, netCol],
  ]
  for (const [sr, sc, er, ec] of merges) ws.mergeCells(sr, sc, er, ec)

  paintRow(ws, 3, lastCol, styleHeader)
  paintRow(ws, 4, lastCol, styleHeader)
  paintRow(ws, 5, lastCol, styleHeader)

  const header3: Array<[number, string]> = [
    [col.payrollNo, "PAYROLL NO."],
    [col.surname, "EMPLOYEE NAME"],
    [col.pin, "KRA"],
    [col.basic, "BASIC SALARY"],
    [col.benefits, "COMM/ NON CASH BENEFITS"],
    [col.gross, "GROSS SALARY"],
    [col.nssfEr, "NSSF CONTRIBUTIONS"],
    [col.shif, "SHIF(2.75%)"],
    [col.housing, "Housing Levy(1.5%)"],
    [col.chargeable, "CHARGEABLE PAY"],
    [col.grossPaye, "GROSS PAYE"],
    [col.relief, "MONTHLY PERSONAL RELIEF"],
    [col.shifRelief, "SHIF RELIEF(15%)"],
    [col.ahlRelief, "AHL RELIEF (15%)"],
    [col.netPaye, "DEDUCTIONS"],
    [totalDedCol, "TOTAL DEDUCTIONS"],
    [netCol, "NET PAY"],
  ]
  for (const [c, label] of header3) ws.getCell(3, c).value = label

  const header4: Array<[number, string]> = [
    [col.nssfEr, "EMPLOYER"],
    [col.nssfEe, "EMPLOYEE"],
    [col.netPaye, "NET PAYE"],
    [col.shifDed, "SHIF"],
    [col.nssfDed, "NSSF"],
    [col.housingDed, `HOUSING LEVY ${shortLabel}`],
    [col.advance, "SALARY ADVANCE"],
    ...extras.map((extra, index) => [extraStart + index, extra.label] as [number, string]),
  ]
  for (const [c, label] of header4) ws.getCell(4, c).value = label

  ws.getCell(5, col.surname).value = "SURNAME"
  ws.getCell(5, col.otherNames).value = "OTHER NAMES"
  ws.getCell(5, col.pin).value = "PIN"
  ws.getCell(5, col.idNo).value = "ID No"
  for (let c = col.basic; c <= lastCol; c += 1) ws.getCell(5, c).value = "Ksh"

  const firstDataRow = 6
  rows.forEach((payroll, index) => {
    const rowNumber = firstDataRow + index
    const employee = employeeOf(payroll, employees)
    const names = splitEmployeeName(employee)
    const basic = moneyAmount(payroll.base_salary)
    const benefits = moneyAmount(
      Number(payroll.bonus || 0) +
        ((payroll.other_bonus_items || []) as NamedAmount[]).reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        ),
    )
    const gross = moneyAmount(basic + benefits)
    const nssf = moneyAmount(getDeductionAmountByAliases(payroll, ["NSSF"]))
    const shif = moneyAmount(getDeductionAmountByAliases(payroll, ["SHIF", "SHA", "NHIF"]))
    const housing = moneyAmount(getDeductionAmountByAliases(payroll, ["Housing Levy"]))
    const netPaye = moneyAmount(getDeductionAmountByAliases(payroll, ["PAYE", "tax"]))
    const advance = moneyAmount(getDeductionAmountByAliases(payroll, ["Advance"]))
    const relief = payroll.deductions_disabled ? 0 : PERSONAL_RELIEF
    const grossPaye = netPaye > 0 ? moneyAmount(netPaye + relief) : 0
    const chargeable = moneyAmount(Math.max(0, gross - nssf - shif - housing))
    const extraAmounts = extras.map((extra) => moneyAmount(getDeductionAmountByAliases(payroll, [extra.key, extra.label])))
    const totalDeductions = moneyAmount(
      netPaye + shif + nssf + housing + advance + extraAmounts.reduce((sum, value) => sum + value, 0),
    )
    const netPay = moneyAmount(payroll.net_pay ?? gross - totalDeductions)

    ws.getRow(rowNumber).height = 16
    paintRow(ws, rowNumber, lastCol, (cell) => styleMoney(cell))

    const textCells: Array<[number, string, ExcelJS.Alignment["horizontal"]]> = [
      [col.payrollNo, String(index + 1).padStart(4, "0"), "center"],
      [col.surname, names.surname, "left"],
      [col.otherNames, names.otherNames, "center"],
      [col.pin, employeeField(employee, ["kra_pin", "kraPin"]).toUpperCase(), "center"],
      [col.idNo, employeeField(employee, ["national_id", "nationalId"]), "center"],
    ]
    for (const [c, value, align] of textCells) {
      const cell = ws.getCell(rowNumber, c)
      cell.value = value
      styleText(cell, align)
    }

    const amounts: Array<[number, number]> = [
      [col.basic, basic],
      [col.benefits, benefits],
      [col.gross, gross],
      [col.nssfEr, nssf],
      [col.nssfEe, nssf],
      [col.shif, shif],
      [col.housing, housing],
      [col.chargeable, chargeable],
      [col.grossPaye, grossPaye],
      [col.relief, relief],
      [col.netPaye, netPaye],
      [col.shifDed, shif],
      [col.nssfDed, nssf],
      [col.housingDed, housing],
      [col.advance, advance],
      ...extras.map((extra, extraIndex) => [extraStart + extraIndex, extraAmounts[extraIndex]] as [number, number]),
      [totalDedCol, totalDeductions],
      [netCol, netPay],
    ]
    for (const [c, value] of amounts) {
      const cell = ws.getCell(rowNumber, c)
      cell.value = value
      styleMoney(cell)
    }
  })

  const lastDataRow = rows.length ? firstDataRow + rows.length - 1 : firstDataRow
  const totalRow = rows.length ? lastDataRow + 1 : firstDataRow
  ws.getRow(totalRow).height = 18
  ws.mergeCells(totalRow, col.surname, totalRow, col.otherNames)
  paintRow(ws, totalRow, lastCol, (cell) => {
    cell.fill = HEADER_FILL
    cell.border = BOX
    cell.font = { name: REGISTER_FONT, size: 10, bold: true }
  })
  ws.getCell(totalRow, col.surname).value = "GRAND TOTAL"
  ws.getCell(totalRow, col.surname).alignment = { horizontal: "left", vertical: "middle" }

  if (rows.length) {
    for (let c = col.basic; c <= lastCol; c += 1) {
      const letter = colLetter(c - 1)
      const cell = ws.getCell(totalRow, c)
      cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` }
      styleMoney(cell, true)
      cell.fill = HEADER_FILL
    }
  }

  const summaryStart = totalRow + 3
  const summaryItems: Array<{ label: string; formula: string }> = [
    { label: "NET PAY", formula: `${colLetter(netCol - 1)}${totalRow}` },
    { label: "PAYE", formula: `${colLetter(col.netPaye - 1)}${totalRow}` },
    { label: "SHIF", formula: `${colLetter(col.shif - 1)}${totalRow}` },
    { label: "NSSF", formula: `${colLetter(col.nssfDed - 1)}${totalRow}+${colLetter(col.nssfEr - 1)}${totalRow}` },
    { label: "AHL", formula: `${colLetter(col.housingDed - 1)}${totalRow}` },
  ]
  if (rows.some((payroll) => getDeductionAmountByAliases(payroll, ["Advance"]))) {
    summaryItems.push({
      label: "SALARY ADVANCE",
      formula: `${colLetter(col.advance - 1)}${totalRow}`,
    })
  }
  for (let index = 0; index < extras.length; index += 1) {
    summaryItems.push({
      label: extras[index].label,
      formula: `${colLetter(extraStart + index - 1)}${totalRow}`,
    })
  }

  ws.mergeCells(summaryStart, col.surname, summaryStart, col.otherNames)
  const summaryTitle = ws.getCell(summaryStart, col.surname)
  summaryTitle.value = "PAYROLL SUMMARY"
  summaryTitle.font = { name: REGISTER_FONT, size: 10, bold: true }
  summaryTitle.fill = HEADER_FILL
  summaryTitle.border = BOX
  const ksh = ws.getCell(summaryStart, col.pin)
  ksh.value = "Ksh"
  ksh.font = { name: REGISTER_FONT, size: 10, bold: true }
  ksh.border = BOX
  ksh.alignment = { horizontal: "center" }

  summaryItems.forEach((item, index) => {
    const rowNumber = summaryStart + 1 + index
    ws.mergeCells(rowNumber, col.surname, rowNumber, col.otherNames)
    const label = ws.getCell(rowNumber, col.surname)
    label.value = item.label
    label.font = { name: REGISTER_FONT, size: 10 }
    label.border = BOX
    const amount = ws.getCell(rowNumber, col.pin)
    amount.value = { formula: item.formula }
    styleMoney(amount, true)
  })

  const totalSummaryRow = summaryStart + 1 + summaryItems.length
  ws.mergeCells(totalSummaryRow, col.surname, totalSummaryRow, col.otherNames)
  const totalSummaryLabel = ws.getCell(totalSummaryRow, col.surname)
  totalSummaryLabel.value = "TOTAL"
  totalSummaryLabel.font = { name: REGISTER_FONT, size: 10, bold: true }
  totalSummaryLabel.fill = HEADER_FILL
  totalSummaryLabel.border = BOX
  const totalSummaryAmount = ws.getCell(totalSummaryRow, col.pin)
  totalSummaryAmount.value = {
    formula: `SUM(${colLetter(col.pin - 1)}${summaryStart + 1}:${colLetter(col.pin - 1)}${totalSummaryRow - 1})`,
  }
  styleMoney(totalSummaryAmount, true)
  totalSummaryAmount.fill = HEADER_FILL

  ws.headerFooter.oddFooter = `&L${String(companyName || "").toUpperCase()}&C${sheetName}&RPage &P of &N`

  return { workbook, filename: `PAYROLL FOR ${longLabel.toUpperCase()}.xlsx` }
}

export async function downloadMonthPayrollWorkbook(input: PayrollMonthExportInput) {
  const { workbook, filename } = await buildMonthPayrollWorkbook(input)
  const buffer = await workbook.xlsx.writeBuffer()
  downloadExcelBuffer(buffer, filename)
}
