"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function VendorAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([glApi.getAccounts(), glApi.getPayablesCreditors()]).then(([coa, creditors]) => {
      setAccounts((coa.data || []).filter((row: any) => row.controlType === "vendor"))
      setVendors(creditors.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Vendor Accounts" />

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="Vendor Accounts"
      description="Third-party vendor control accounts and outstanding creditor balances"
      kpis={[
        { label: "Control accounts", value: accounts.length },
        { label: "Vendors", value: vendors.length },
        { label: "Outstanding", value: vendors.reduce((sum, row) => sum + Number(row.balance || 0), 0), prefix: "KES" },
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
      <FinanceTableCard title="Vendor balances">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((row) => (
              <tr key={row.supplierId} className="border-b">
                <td className="px-4 py-2">{row.supplierId}</td>
                <td className="px-4 py-2 text-right font-medium">{Number(row.balance || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
