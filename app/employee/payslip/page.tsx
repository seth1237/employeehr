"use client"

import { PayslipWorkspace } from "@/components/payroll/payslip-workspace"

export default function PayslipPage() {
  return (
    <div className="space-y-5 pb-6">
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{ borderColor: "var(--brand-header-border)", background: "var(--brand-header-bg)" }}
      >
        <p className="erp-page-eyebrow text-sm font-medium tracking-wide">Payroll</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">My payslips</h1>
        <p className="text-sm text-muted-foreground">Open a month to see earnings, deductions, and download the slip.</p>
      </div>
      <PayslipWorkspace />
    </div>
  )
}
