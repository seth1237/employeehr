"use client"

import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { AlertCircle, CalendarClock } from "lucide-react"

export default function PayablesAgingPage() {
  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Aging Report"
      description="Payables aging by due-date buckets"
    >
      <FinanceTableCard title="Payables Aging">
        <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-t border-dashed">
          <CalendarClock className="h-12 w-12 mb-4 opacity-50 text-orange-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">Module Under Construction</h3>
          <p className="max-w-md text-sm leading-relaxed">
            The Payables Aging report is currently in development.
            This will categorize your outstanding supplier bills into 0-30, 31-60, 61-90, and 90+ day buckets.
          </p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
