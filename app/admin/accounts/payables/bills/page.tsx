"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { AlertCircle, FileText } from "lucide-react"

export default function SupplierBillsPage() {
  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Supplier Bills"
      description="Record supplier bills with VAT, due dates, and attachments"
    >
      <FinanceTableCard title="Bills Register">
        <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-t border-dashed">
          <FileText className="h-12 w-12 mb-4 opacity-50 text-blue-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">Module Under Construction</h3>
          <p className="max-w-md text-sm leading-relaxed">
            The Supplier Bills module is currently in development as part of Phase 3.
            This will allow you to record and track supplier invoices, map them to inventory receipts, and manage due dates.
          </p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
