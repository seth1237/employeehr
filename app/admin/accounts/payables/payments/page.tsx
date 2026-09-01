"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { AlertCircle, CreditCard } from "lucide-react"

export default function SupplierPaymentsPage() {
  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Supplier Payments"
      description="Pay supplier bills via bank, M-Pesa, or cash"
    >
      <FinanceTableCard title="Supplier Payments">
        <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-t border-dashed">
          <CreditCard className="h-12 w-12 mb-4 opacity-50 text-emerald-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">Module Under Construction</h3>
          <p className="max-w-md text-sm leading-relaxed">
            The Supplier Payments module is currently in development.
            It will enable you to issue payments against approved supplier bills and automatically update cashbook balances.
          </p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
