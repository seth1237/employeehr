import { format } from "date-fns"
import * as XLSX from "xlsx"

export type RemunerationReportType = 'net' | 'sha' | 'tax' | 'nssf' | 'helb'

export type RemunerationColumn = {
    key: string
    label: string
}

const getFullName = (employee: any) => {
    if (!employee) return "Unknown"
    const firstName = employee.firstName ?? employee.first_name ?? ""
    const lastName = employee.lastName ?? employee.last_name ?? ""
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || employee.email || "Unknown"
}

const getDeductionAmount = (payroll: any, name: string) => {
    return payroll.deduction_items?.find((item: any) => item.name === name)?.amount || 0
}

const getEmployeeField = (employee: any, keys: string[]) => {
    for (const key of keys) {
        const value = employee?.[key]
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value)
        }
    }
    return ""
}

const getBankName = (employee: any) => {
    return (
        employee?.bankDetails?.bankName ||
        employee?.bank_name ||
        employee?.bankName ||
        employee?.bank_type ||
        employee?.bankType ||
        ""
    )
}

export const buildRemunerationRows = (payrolls: any[], employees: any[], reportType: RemunerationReportType) => {
    return payrolls.map((payroll) => {
        const employee = employees.find((entry) => String(entry._id) === String(payroll.user_id))
        const fullName = getFullName(employee)
        const nationalId = getEmployeeField(employee, ["national_id", "nationalId"])
        const kraPin = getEmployeeField(employee, ["kra_pin", "kraPin"])
        const shaAccount = getEmployeeField(employee, ["sha_id", "shaId"])
        const nssfAccount = getEmployeeField(employee, ["nssf_number", "nssf"])
        const bankName = getBankName(employee)
        const bankBranch = getEmployeeField(employee, ["bank_branch", "bankBranch", "branch"])
        const accountNumber = getEmployeeField(employee, ["bank_account_number", "accountNumber", "bankDetails?.accountNumber"])
        const grossSalary = Number(payroll.base_salary || 0)
        const netPay = Number(payroll.net_pay || 0)
        const totalDeductions = Number(payroll.total_deductions || 0)

        const deductionBreakdown = (payroll.deduction_items || [])
            .map((item: any) => `${item.name}: ${Number(item.amount || 0).toLocaleString()}`)
            .join("; ")

        if (reportType === 'net') {
            return {
                'Full Name': fullName,
                'Gross Salary': grossSalary,
                'Net Pay': netPay,
                'Deductions Made': totalDeductions,
                'Deduction Breakdown': deductionBreakdown,
                'KRA PIN': kraPin,
                'SHA Account': shaAccount,
                'NSSF Account': nssfAccount,
                'National ID': nationalId,
                'Bank Type': bankName,
                'Bank Branch': bankBranch,
                'Account Number': accountNumber,
            }
        }

        if (reportType === 'sha') {
            return {
                'Name': fullName,
                'National ID': nationalId,
                'Amount to be paid to SHA': Number(getDeductionAmount(payroll, 'SHA') || 0),
            }
        }

        if (reportType === 'nssf') {
            return {
                'Full Name': fullName,
                'National ID': nationalId,
                'Amount to be paid to the employee': Number(getDeductionAmount(payroll, 'NSSF') || 0),
            }
        }

        if (reportType === 'helb') {
            return {
                'National ID Number': nationalId,
                'Names': fullName,
                'Amount Paid': Number(getDeductionAmount(payroll, 'HELB') || 0),
            }
        }

        return {
            'Full Names': fullName,
            'National ID': nationalId,
            'Amount to be paid to the tax authority': Number(getDeductionAmount(payroll, 'PAYE') || 0),
        }
    })
}

export const generateRemunerationReport = (payrolls: any[], employees: any[], reportType: RemunerationReportType) => {
    return buildRemunerationRows(payrolls, employees, reportType)
}

export const getReportColumns = (reportType: RemunerationReportType): RemunerationColumn[] => {
    switch (reportType) {
        case 'net':
            return [
                { key: 'Full Name', label: 'Full Name' },
                { key: 'Gross Salary', label: 'Gross Salary' },
                { key: 'Net Pay', label: 'Net Pay' },
                { key: 'Deductions Made', label: 'Deductions Made' },
                { key: 'Deduction Breakdown', label: 'Deduction Breakdown' },
                { key: 'KRA PIN', label: 'KRA PIN' },
                { key: 'SHA Account', label: 'SHA Account' },
                { key: 'NSSF Account', label: 'NSSF Account' },
                { key: 'National ID', label: 'National ID' },
                { key: 'Bank Type', label: 'Bank Type' },
                { key: 'Bank Branch', label: 'Bank Branch' },
                { key: 'Account Number', label: 'Account Number' },
            ]
        case 'sha':
            return [
                { key: 'Name', label: 'Name' },
                { key: 'National ID', label: 'National ID' },
                { key: 'Amount to be paid to SHA', label: 'Amount to be paid to SHA' },
            ]
        case 'nssf':
            return [
                { key: 'Full Name', label: 'Full Name' },
                { key: 'National ID', label: 'National ID' },
                { key: 'Amount to be paid to the employee', label: 'Amount to be paid to the employee' },
            ]
        case 'helb':
            return [
                { key: 'National ID Number', label: 'National ID Number' },
                { key: 'Names', label: 'Names' },
                { key: 'Amount Paid', label: 'Amount Paid' },
            ]
        case 'tax':
        default:
            return [
                { key: 'Full Names', label: 'Full Names' },
                { key: 'National ID', label: 'National ID' },
                { key: 'Amount to be paid to the tax authority', label: 'Amount to be paid to the tax authority' },
            ]
    }
}

export const exportToExcel = (data: any[], fileName: string, sheetName = 'Report') => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, `${fileName}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

export const calculateReportSummaries = (payrolls: any[]) => {
    return {
        netSalaries: payrolls.reduce((sum, p) => sum + p.net_pay, 0),
        totalSHA: payrolls.reduce((sum, p) => sum + (p.deduction_items?.find((item: any) => item.name === 'SHA')?.amount || 0), 0),
        totalTax: payrolls.reduce((sum, p) => sum + (p.deduction_items?.find((item: any) => item.name === 'PAYE')?.amount || 0), 0),
        totalNSSF: payrolls.reduce((sum, p) => sum + (p.deduction_items?.find((item: any) => item.name === 'NSSF')?.amount || 0), 0),
        totalHELB: payrolls.reduce((sum, p) => sum + (p.deduction_items?.find((item: any) => item.name === 'HELB')?.amount || 0), 0),
        totalEmployees: payrolls.length,
    }
}
