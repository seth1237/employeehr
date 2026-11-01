"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function GlReconciliationPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getAccountReconciliation().then((res) => setData(res.data)).catch((err) => window.alert(err.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Account Reconciliation" />

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="Account Reconciliation"
      description="Compare cashbook balances with cash, bank, and M-Pesa control accounts"
      kpis={[
        { label: "Cashbook", value: data?.cashbook || 0, prefix: "KES" },
        { label: "GL cash accounts", value: data?.glCash || 0, prefix: "KES" },
        { label: "Difference", value: data?.difference || 0, prefix: "KES" },
      ]}
    >
      <FinanceTableCard title="Control check">
        <div className="p-4 text-sm space-y-2">
          <p>Active cash/bank/M-Pesa accounts: {data?.accounts || 0}</p>
          <p>A difference means a cash movement was not posted to the ledger, or a journal was posted without a cashbook line.</p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
