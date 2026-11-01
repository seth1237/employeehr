"use client"

import { useEffect, useState } from "react"
import { glApi, stockApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function CustomerAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      glApi.getAccounts(),
      stockApi.getReceivablesClients(),
    ]).then(([coa, rec]) => {
      setAccounts((coa.data || []).filter((row: any) => row.controlType === "customer"))
      setClients(rec.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Customer Accounts" />

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="Customer Accounts"
      description="Third-party customer control accounts and outstanding debtor balances"
      kpis={[
        { label: "Control accounts", value: accounts.length },
        { label: "Customers", value: clients.length },
        { label: "Outstanding", value: clients.reduce((sum, row) => sum + Number(row.balanceRemaining || 0), 0), prefix: "KES" },
      ]}
    >
      <FinanceTableCard title="Control accounts">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Account</th>
              <th className="px-4 py-2">Currency</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.code}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.currency || "KES"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
      <FinanceTableCard title="Customer balances">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2 text-right">Invoiced</th>
              <th className="px-4 py-2 text-right">Paid</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((row) => (
              <tr key={`${row.client?.name}-${row.client?.number}`} className="border-b">
                <td className="px-4 py-2">{row.client?.name}</td>
                <td className="px-4 py-2 text-right">{Number(row.totalInvoiced || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{Number(row.totalPaid || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-medium">{Number(row.balanceRemaining || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
