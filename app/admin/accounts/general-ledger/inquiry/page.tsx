"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AccountInquiryPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    accountId: "",
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    glApi.getAccounts().then((res) => {
      const list = res.data || []
      setAccounts(list)
      if (list[0]) setFilters((prev) => ({ ...prev, accountId: list[0]._id }))
    }).finally(() => setLoading(false))
  }, [])

  const load = async () => {
    if (!filters.accountId) return
    setLoading(true)
    try {
      const res = await glApi.getInquiry(filters)
      setData(res.data)
    } catch (error: any) {
      window.alert(error.message || "Failed to load inquiry")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (filters.accountId) void load()
  }, [filters.accountId])

  if (loading && !data) return <PageLoadingSkeleton title="Account Inquiry" />

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="Account Inquiry"
      description="Opening balance, movements, and closing balance for one ledger account"
      kpis={[
        { label: "Opening", value: data?.openingBalance || 0, prefix: "KES" },
        { label: "Closing", value: data?.closingBalance || 0, prefix: "KES" },
        { label: "Lines", value: data?.lines?.length || 0 },
      ]}
      toolbar={
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">Account</Label>
            <select className="mt-1 h-9 w-72 rounded-md border bg-background px-3 text-sm" value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}>
              {accounts.map((acc) => <option key={acc._id} value={acc._id}>{acc.code} {acc.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => void load()}>Apply</Button>
        </div>
      }
    >
      <FinanceTableCard title={data?.account ? `${data.account.code} ${data.account.name}` : "Movements"}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Entry</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-right">Debit</th>
              <th className="px-4 py-2 text-right">Credit</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(data?.lines || []).map((line: any, idx: number) => (
              <tr key={`${line.entryNumber}-${idx}`} className="border-b">
                <td className="px-4 py-2">{new Date(line.date).toLocaleDateString()}</td>
                <td className="px-4 py-2">{line.entryNumber}</td>
                <td className="px-4 py-2">{line.description}</td>
                <td className="px-4 py-2 text-right">{line.debit || ""}</td>
                <td className="px-4 py-2 text-right">{line.credit || ""}</td>
                <td className="px-4 py-2 text-right font-medium">{line.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
