"use client"

import { PayslipWorkspace } from "@/components/payroll/payslip-workspace"

export default function EmployeePayrollPage() {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My payslips</h1>
        <p className="text-sm text-muted-foreground">Earnings, deductions, and net pay for each processed month.</p>
      </div>
      <PayslipWorkspace />
    </div>
  )
}
