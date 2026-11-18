import { getDeductionAmountByAliases, PERSONAL_RELIEF } from "@/lib/payroll-calculator"
import {
  buildRegisterWorkbook,
  downloadExcelBuffer,
  employeeField,
  employeeOf,
  moneyAmount,
  splitEmployeeName,
  type RegisterColumn,
  type RegisterSpec,
} from "@/lib/excel-register"

export type RemunerationReportType = "net" | "sha" | "tax" | "nssf" | "helb"

export type RemunerationColumn = {
  key: string
  label: string
}

type NamedAmount = { name?: string; amount?: number }

const getDeductionAmount = (payroll: any, name: string) => {
  if (name === "SHA" || name === "SHIF") {
    return getDeductionAmountByAliases(payroll, ["SHA", "SHIF", "NHIF"])
  }
  if (name === "PAYE") return getDeductionAmountByAliases(payroll, ["PAYE", "tax"])
  return getDeductionAmountByAliases(payroll, [name])
}

const getBankName = (employee: any) =>
  employeeField(employee, ["bankDetails.bankName", "bank_name", "bankName", "bank_type", "bankType"])

const getBankBranch = (employee: any) =>
  employeeField(employee, ["bankDetails.bankBranch", "bank_branch", "bankBranch", "branch"])

const getAccountNumber = (employee: any) =>
  employeeField(employee, ["bankDetails.accountNumber", "bank_account_number", "accountNumber"])

function payrollGross(payroll: any) {
  const basic = moneyAmount(payroll.base_salary)
  const benefits = moneyAmount(
    Number(payroll.bonus || 0) +
      ((payroll.other_bonus_items || []) as NamedAmount[]).reduce((sum, item) => sum + Number(item.amount || 0), 0),
  )
  return { basic, benefits, gross: moneyAmount(basic + benefits) }
}

function sortPayrolls(payrolls: any[], employees: any[]) {
  return [...payrolls].sort((left, right) => {
    const a = splitEmployeeName(employeeOf(left, employees))
    const b = splitEmployeeName(employeeOf(right, employees))
    return `${a.surname} ${a.otherNames}`.localeCompare(`${b.surname} ${b.otherNames}`)
  })
}

export function buildRemunerationRegisterRows(payrolls: any[], employees: any[], reportType: RemunerationReportType) {
  return sortPayrolls(payrolls, employees).map((payroll, index) => {
    const employee = employeeOf(payroll, employees)
    const names = splitEmployeeName(employee)
    const { gross } = payrollGross(payroll)
    const nssf = moneyAmount(getDeductionAmount(payroll, "NSSF"))
    const shif = moneyAmount(getDeductionAmount(payroll, "SHA"))
    const housing = moneyAmount(getDeductionAmountByAliases(payroll, ["Housing Levy"]))
    const netPaye = moneyAmount(getDeductionAmount(payroll, "PAYE"))
    const helb = moneyAmount(getDeductionAmount(payroll, "HELB"))
    const relief = payroll.deductions_disabled ? 0 : PERSONAL_RELIEF
    const grossPaye = netPaye > 0 ? moneyAmount(netPaye + relief) : 0
    const chargeable = moneyAmount(Math.max(0, gross - nssf - housing))

    return {
      payrollNo: String(index + 1).padStart(4, "0"),
      surname: names.surname,
      otherNames: names.otherNames,
      nationalId: employeeField(employee, ["national_id", "nationalId"]),
      kraPin: employeeField(employee, ["kra_pin", "kraPin"]).toUpperCase(),
      shaAccount: employeeField(employee, ["sha_id", "shaId"]),
      nssfAccount: employeeField(employee, ["nssf_number", "nssf"]),
      bankName: getBankName(employee).toUpperCase(),
      bankBranch: getBankBranch(employee).toUpperCase(),
      accountNumber: getAccountNumber(employee),
      gross,
      chargeable,
      grossPaye,
      relief,
      paye: netPaye,
      shif,
      nssf,
      nssfEmployer: nssf,
      nssfTotal: moneyAmount(nssf * 2),
      helb,
      totalDeductions: moneyAmount(payroll.total_deductions),
      netPay: moneyAmount(payroll.net_pay),
    }
  })
}

export const buildRemunerationRows = (
  payrolls: any[],
  employees: any[],
  reportType: RemunerationReportType,
) => buildRemunerationRegisterRows(payrolls, employees, reportType)

export const generateRemunerationReport = (
  payrolls: any[],
  employees: any[],
  reportType: RemunerationReportType,
) => buildRemunerationRegisterRows(payrolls, employees, reportType)

const NAME_COLUMNS: RegisterColumn[] = [
  { key: "payrollNo", label: "PAYROLL NO.", kind: "id", width: 12, stub: "" },
  { key: "surname", label: "EMPLOYEE NAME", kind: "text", width: 18, group: "name", stub: "SURNAME" },
  { key: "otherNames", label: "EMPLOYEE NAME", kind: "text", width: 20, group: "name", stub: "OTHER NAMES", align: "center" },
]

function columnsFor(reportType: RemunerationReportType): RegisterColumn[] {
  switch (reportType) {
    case "sha":
      return [
        ...NAME_COLUMNS,
        { key: "nationalId", label: "NATIONAL ID", kind: "id", width: 14, stub: "ID No" },
        { key: "shaAccount", label: "SHA / SHIF NO.", kind: "id", width: 16, stub: "MEMBER NO." },
        { key: "gross", label: "GROSS SALARY", kind: "money", width: 16 },
        { key: "shif", label: "SHIF (2.75%)", kind: "money", width: 16 },
      ]
    case "tax":
      return [
        ...NAME_COLUMNS,
        { key: "kraPin", label: "KRA", kind: "id", width: 16, stub: "PIN" },
        { key: "nationalId", label: "NATIONAL ID", kind: "id", width: 14, stub: "ID No" },
        { key: "gross", label: "GROSS SALARY", kind: "money", width: 15 },
        { key: "chargeable", label: "CHARGEABLE PAY", kind: "money", width: 16 },
        { key: "grossPaye", label: "GROSS PAYE", kind: "money", width: 14 },
        { key: "relief", label: "MONTHLY PERSONAL RELIEF", kind: "money", width: 14 },
        { key: "paye", label: "NET PAYE", kind: "money", width: 14 },
      ]
    case "nssf":
      return [
        ...NAME_COLUMNS,
        { key: "nationalId", label: "NATIONAL ID", kind: "id", width: 14, stub: "ID No" },
        { key: "nssfAccount", label: "NSSF NO.", kind: "id", width: 16, stub: "MEMBER NO." },
        { key: "gross", label: "GROSS SALARY", kind: "money", width: 15 },
        { key: "nssfEmployer", label: "NSSF CONTRIBUTIONS", kind: "money", width: 14, group: "nssf", subLabel: "EMPLOYER" },
        { key: "nssf", label: "NSSF CONTRIBUTIONS", kind: "money", width: 14, group: "nssf", subLabel: "EMPLOYEE" },
        { key: "nssfTotal", label: "TOTAL NSSF", kind: "money", width: 14 },
      ]
    case "helb":
      return [
        ...NAME_COLUMNS,
        { key: "nationalId", label: "NATIONAL ID", kind: "id", width: 14, stub: "ID No" },
        { key: "helb", label: "HELB DEDUCTION", kind: "money", width: 16 },
      ]
    case "net":
    default:
      return [
        ...NAME_COLUMNS,
        { key: "nationalId", label: "NATIONAL ID", kind: "id", width: 14, stub: "ID No" },
        { key: "bankName", label: "BANK DETAILS", kind: "text", width: 16, group: "bank", subLabel: "BANK" },
        { key: "bankBranch", label: "BANK DETAILS", kind: "text", width: 16, group: "bank", subLabel: "BRANCH" },
        { key: "accountNumber", label: "BANK DETAILS", kind: "id", width: 16, group: "bank", subLabel: "ACCOUNT NO." },
        { key: "gross", label: "GROSS SALARY", kind: "money", width: 15 },
        { key: "totalDeductions", label: "TOTAL DEDUCTIONS", kind: "money", width: 16 },
        { key: "netPay", label: "NET PAY", kind: "money", width: 15 },
      ]
  }
}

function metaFor(reportType: RemunerationReportType) {
  switch (reportType) {
    case "sha":
      return {
        documentName: "SHA",
        sheetKind: "SHA",
        summaryTitle: "SHA / SHIF SUMMARY",
        summary: [{ label: "SHIF", keys: ["shif"] }],
      }
    case "tax":
      return {
        documentName: "PAYE",
        sheetKind: "PAYE",
        summaryTitle: "PAYE SUMMARY",
        summary: [{ label: "NET PAYE", keys: ["paye"] }],
      }
    case "nssf":
      return {
        documentName: "NSSF",
        sheetKind: "NSSF",
        summaryTitle: "NSSF SUMMARY",
        summary: [
          { label: "EMPLOYEE", keys: ["nssf"] },
          { label: "EMPLOYER", keys: ["nssfEmployer"] },
        ],
      }
    case "helb":
      return {
        documentName: "HELB",
        sheetKind: "HELB",
        summaryTitle: "HELB SUMMARY",
        summary: [{ label: "HELB", keys: ["helb"] }],
      }
    case "net":
    default:
      return {
        documentName: "NET PAY",
        sheetKind: "NET",
        summaryTitle: "NET PAY SUMMARY",
        summary: [
          { label: "GROSS SALARY", keys: ["gross"] },
          { label: "TOTAL DEDUCTIONS", keys: ["totalDeductions"] },
          { label: "NET PAY", keys: ["netPay"] },
        ],
        addSummaryTotal: false,
      }
  }
}

export const getReportColumns = (reportType: RemunerationReportType): RemunerationColumn[] =>
  columnsFor(reportType).map((column) => {
    if (column.key === "payrollNo") return { key: column.key, label: "Payroll no." }
    if (column.key === "surname") return { key: column.key, label: "Surname" }
    if (column.key === "otherNames") return { key: column.key, label: "Other names" }
    if (column.subLabel) return { key: column.key, label: column.subLabel }
    return { key: column.key, label: column.label }
  })

export async function buildRemunerationWorkbook(input: {
  companyName: string
  month: string
  reportType: RemunerationReportType
  payrolls: any[]
  employees: any[]
}) {
  const rows = buildRemunerationRegisterRows(input.payrolls, input.employees, input.reportType)
  const meta = metaFor(input.reportType)
  const spec: RegisterSpec = {
    companyName: input.companyName,
    month: input.month,
    documentName: meta.documentName,
    sheetKind: meta.sheetKind,
    summaryTitle: meta.summaryTitle,
    columns: columnsFor(input.reportType),
    rows,
    summary: meta.summary,
    addSummaryTotal: meta.addSummaryTotal,
  }
  return buildRegisterWorkbook(spec)
}

export async function downloadRemunerationWorkbook(input: {
  companyName: string
  month: string
  reportType: RemunerationReportType
  payrolls: any[]
  employees: any[]
}) {
  const { workbook, filename } = await buildRemunerationWorkbook(input)
  const buffer = await workbook.xlsx.writeBuffer()
  downloadExcelBuffer(buffer, filename)
}

export const calculateReportSummaries = (payrolls: any[]) => {
  return {
    netSalaries: payrolls.reduce((sum, payroll) => sum + Number(payroll.net_pay || 0), 0),
    totalSHA: payrolls.reduce((sum, payroll) => sum + getDeductionAmount(payroll, "SHA"), 0),
    totalTax: payrolls.reduce((sum, payroll) => sum + getDeductionAmount(payroll, "PAYE"), 0),
    totalNSSF: payrolls.reduce((sum, payroll) => sum + getDeductionAmount(payroll, "NSSF"), 0),
    totalHELB: payrolls.reduce((sum, payroll) => sum + getDeductionAmount(payroll, "HELB"), 0),
    totalEmployees: payrolls.length,
  }
}
