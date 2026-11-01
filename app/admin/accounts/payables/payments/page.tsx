"use client"

import { useEffect, useState } from "react"
import { api, glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"

export default function SupplierPaymentsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountId, setAccountId] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [bills, cash] = await Promise.all([
      glApi.getPayablesBills(),
      api.cashBanking.listAccounts({ status: "active" }),
    ])
    const list = cash.data || []
    setRows((bills.data || []).filter((row: any) => Number(row.balanceRemaining) > 0))
    setAccounts(list)
    setAccountId((current) => current || list[0]?._id || "")
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  if (loading) return <PageLoadingSkeleton title="Supplier Payments" />

  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Supplier Payments"
      description="Pay open vendor bills from cash, bank, or M-Pesa and post the purchases journal"
    >
      <FinanceTableCard
        title="Open bills"
        headerRight={
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((acc) => <option key={acc._id} value={acc._id}>{acc.name} ({acc.type})</option>)}
          </select>
        }
      >
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Bill</th>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2 text-right">Balance</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.invoiceNumber}</td>
                <td className="px-4 py-2">{row.supplierId}</td>
                <td className="px-4 py-2 text-right">{Number(row.balanceRemaining || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!accountId) {
                      window.alert("Choose a payment account first")
                      return
                    }
                    const amount = Number(window.prompt("Amount", String(row.balanceRemaining)) || 0)
                    try {
                      await glApi.payPayablesBill(row._id, { accountId, amount })
                      await load()
                    } catch (error: any) {
                      window.alert(error.message || "Payment failed")
                    }
                  }}>Pay</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
