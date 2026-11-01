"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function PaymentMethodsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.cashBanking.listAccounts({ status: "active" }).then((res) => setRows(res.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Payment Methods" />

  return (
    <FinanceDocumentShell
      eyebrow="Accounting Settings"
      title="Payment Methods"
      description="Cash, bank, and M-Pesa accounts used to pay and receive"
    >
      <FinanceTableCard title="Active methods">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Currency</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 capitalize">{row.type}</td>
                <td className="px-4 py-2">{row.currency}</td>
                <td className="px-4 py-2 text-right">{Number(row.currentBalance || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
