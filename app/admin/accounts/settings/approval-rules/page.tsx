"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"

export default function ApprovalRulesPage() {
  const rules = [
    { name: "Manual journals", threshold: "Any amount", approver: "company_admin / HR" },
    { name: "Supplier payments", threshold: "Account must be selected", approver: "company_admin" },
    { name: "Payroll mark paid", threshold: "After processed draft", approver: "company_admin / HR" },
    { name: "Period close", threshold: "Monthly", approver: "company_admin" },
  ]

  return (
    <FinanceDocumentShell
      eyebrow="Accounting Settings"
      title="Approval Rules"
      description="Who can post money movements and close periods"
    >
      <FinanceTableCard title="Current rules">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Rule</th>
              <th className="px-4 py-2">Threshold</th>
              <th className="px-4 py-2">Approver</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((row) => (
              <tr key={row.name} className="border-b">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.threshold}</td>
                <td className="px-4 py-2">{row.approver}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
