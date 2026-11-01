"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function AccountingSettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([glApi.getAccounts(), glApi.getCurrencies()]).then(([a, c]) => {
      setAccounts(a.data || [])
      setCurrencies(c.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Accounting Settings" />

  const functional = currencies.find((row) => row.isFunctional)

  return (
    <FinanceDocumentShell
      eyebrow="Accounting Settings"
      title="Accounting Settings"
      description="Default accounts, numbering, rounding, and base currency"
      kpis={[
        { label: "Functional currency", value: functional?.code || "KES" },
        { label: "Ledger accounts", value: accounts.length },
      ]}
    >
      <FinanceTableCard title="System accounts">
        <table className="w-full text-sm">
          <tbody>
            {accounts.filter((row) => row.isSystem).map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.code}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 capitalize">{row.type}</td>
                <td className="px-4 py-2">{row.controlType || "none"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
