"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { AlertCircle } from "lucide-react"

export default function CashFlowPage() {
  return (
    <FinanceDocumentShell
      eyebrow="Financial Reports"
      title="Cash Flow"
      description="Operating, investing, and financing cash flows"
    >
      <FinanceTableCard title="Statement of Cash Flows">
        <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-1">Report Data Being Compiled</h3>
          <p className="max-w-sm text-sm">
            This report is currently being populated with data from the general ledger engine.
            Please check back soon once the transaction sync is complete.
          </p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
