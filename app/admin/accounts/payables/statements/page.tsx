"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { AlertCircle, ScrollText } from "lucide-react"

export default function SupplierStatementsPage() {
  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Supplier Statements"
      description="Supplier account statements with opening and closing balances"
    >
      <FinanceTableCard title="Supplier Statements">
        <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-t border-dashed">
          <ScrollText className="h-12 w-12 mb-4 opacity-50 text-indigo-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">Module Under Construction</h3>
          <p className="max-w-md text-sm leading-relaxed">
            The Supplier Statements module is currently in development.
            This will provide a complete ledger of all transactions (bills, payments, credit notes) for each supplier.
          </p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
