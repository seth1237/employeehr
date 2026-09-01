"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { AlertCircle, FileMinus } from "lucide-react"

export default function PurchaseCreditNotesPage() {
  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Purchase Credit Notes"
      description="Supplier credit notes and purchase adjustments"
    >
      <FinanceTableCard title="Credit Notes">
        <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-t border-dashed">
          <FileMinus className="h-12 w-12 mb-4 opacity-50 text-amber-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">Module Under Construction</h3>
          <p className="max-w-md text-sm leading-relaxed">
            Purchase Credit Notes are currently in development.
            Use this to record supplier refunds, returns, or adjustments against existing bills.
          </p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
