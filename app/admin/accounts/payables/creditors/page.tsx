"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { AlertCircle, Users } from "lucide-react"

export default function CreditorsPage() {
  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Creditors"
      description="Outstanding supplier balances and payment status"
    >
      <FinanceTableCard title="Creditor Balances">
        <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-t border-dashed">
          <Users className="h-12 w-12 mb-4 opacity-50 text-rose-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">Module Under Construction</h3>
          <p className="max-w-md text-sm leading-relaxed">
            The Creditors directory is currently in development.
            It will list all suppliers with open balances, allowing you to prioritize payments.
          </p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
