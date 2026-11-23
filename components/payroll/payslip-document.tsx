"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  downloadEmployeePayslip,
  formatPayslipAmount,
  payrollPeriodLabel,
  type EmployeePayslipDownload,
} from "@/lib/payslip-download"

export function kes(value: number, negative = false) {
  return formatPayslipAmount(value, negative)
}

function personName(user: EmployeePayslipDownload["user"]) {
  return `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || "Employee"
}

function companyPlace(company: EmployeePayslipDownload["company"]) {
  return [company.city, company.state, company.country].filter(Boolean).join(", ")
}

function grossPay(payslip: EmployeePayslipDownload["payslip"]) {
  const extras = (payslip.other_bonus_items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  return Number(payslip.base_salary || 0) + Number(payslip.bonus || 0) + extras
}

export function PayslipDocument({
  detail,
  primaryColor = "#0f766e",
  actions,
  framed = true,
}: {
  detail: EmployeePayslipDownload
  primaryColor?: string
  actions?: boolean
  framed?: boolean
}) {
  const { payslip, user, company } = detail
  const status = String(payslip.status || "processed").toLowerCase()
  const paid = status === "paid"
  const extras = payslip.other_bonus_items || []
  const deductions = payslip.deduction_items || []

  return (
    <div className={framed ? "overflow-hidden rounded-2xl border bg-white" : "bg-white"}>
      {actions !== false ? (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">Payslip</p>
            <p className="text-sm font-medium text-slate-900">{payrollPeriodLabel(payslip.month)}</p>
          </div>
          <Button size="sm" onClick={() => void downloadEmployeePayslip(detail, primaryColor)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      ) : null}

      <article className="px-5 py-6 sm:px-8">
        <header className="flex items-start justify-between gap-4 border-b border-slate-900 pb-4">
          <div className="min-w-0">
            {company.logo ? (
              <img src={company.logo} alt="" className="mb-3 h-10 w-auto max-w-[140px] object-contain" />
            ) : null}
            <h2 className="text-lg font-semibold text-slate-900">{company.name || "Company"}</h2>
            <p className="text-xs text-slate-500">{[company.email, company.phone].filter(Boolean).join("  |  ")}</p>
            {companyPlace(company) ? <p className="text-xs text-slate-500">{companyPlace(company)}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold tracking-wide text-slate-500">PAYSLIP</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{payrollPeriodLabel(payslip.month)}</p>
            <p className="mt-1 text-xs text-slate-600">{paid ? "Paid" : status === "draft" ? "Draft" : "Processed"}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-x-4 gap-y-3 border-b py-4 text-sm sm:grid-cols-4">
          <Fact label="Employee" value={personName(user)} />
          <Fact label="Employee ID" value={user.employee_id || "-"} />
          <Fact label="Position" value={user.position || "-"} />
          <Fact label="Department" value={user.department || "-"} />
        </section>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-900">
              <th className="py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Description
              </th>
              <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Amount (KES)
              </th>
            </tr>
          </thead>
          <tbody>
            <SectionRow label="Earnings" />
            <AmountRow label="Basic salary" amount={formatPayslipAmount(payslip.base_salary)} />
            {Number(payslip.bonus || 0) > 0 ? (
              <AmountRow label="Bonus" amount={formatPayslipAmount(payslip.bonus)} />
            ) : null}
            {extras.map((item) => (
              <AmountRow key={item.name} label={item.name} amount={formatPayslipAmount(item.amount)} />
            ))}
            <AmountRow label="Gross pay" amount={formatPayslipAmount(grossPay(payslip))} strong />
            <SectionRow label="Deductions" />
            {deductions.length ? (
              deductions.map((item) => (
                <AmountRow
                  key={item.name}
                  label={item.name}
                  amount={formatPayslipAmount(item.amount, true)}
                />
              ))
            ) : (
              <AmountRow label="None" amount={formatPayslipAmount(0)} />
            )}
            <AmountRow
              label="Total deductions"
              amount={formatPayslipAmount(payslip.total_deductions, true)}
              strong
            />
          </tbody>
        </table>

        <div
          className="mt-4 flex items-center justify-between px-3 py-3 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <span className="text-sm font-semibold">Net pay</span>
          <span className="font-mono text-base font-semibold tabular-nums">
            {formatPayslipAmount(payslip.net_pay)}
          </span>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          This is a computer-generated payslip and does not require a signature.
        </p>
      </article>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate font-medium text-slate-900">{value}</p>
    </div>
  )
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={2} className="pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </td>
    </tr>
  )
}

function AmountRow({
  label,
  amount,
  strong,
}: {
  label: string
  amount: string
  strong?: boolean
}) {
  return (
    <tr className={strong ? "bg-slate-50 font-semibold" : ""}>
      <td className="py-1.5 text-slate-800">{label}</td>
      <td className="py-1.5 text-right font-mono tabular-nums text-slate-900">{amount}</td>
    </tr>
  )
}
