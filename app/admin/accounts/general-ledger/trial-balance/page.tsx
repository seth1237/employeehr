"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function TrialBalancePage() {
  const [loading, setLoading] = useState(true)
  const [trialBalance, setTrialBalance] = useState<any[]>([])
  
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: new Date().toISOString().slice(0, 10)
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await glApi.getTrialBalance(filters)
      setTrialBalance(res.data || [])
    } catch (err: any) {
      window.alert(err.message || "Failed to load trial balance")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && trialBalance.length === 0) return <PageLoadingSkeleton title="Trial Balance" />

  const totalDebit = trialBalance.reduce((s, row) => s + (row.balance > 0 && ["asset", "expense"].includes(row.type) ? row.balance : row.balance < 0 && ["liability", "equity", "revenue"].includes(row.type) ? Math.abs(row.balance) : 0), 0)
  const totalCredit = trialBalance.reduce((s, row) => s + (row.balance > 0 && ["liability", "equity", "revenue"].includes(row.type) ? row.balance : row.balance < 0 && ["asset", "expense"].includes(row.type) ? Math.abs(row.balance) : 0), 0)

  // A more precise TB calculation:
  let calcDebit = 0;
  let calcCredit = 0;

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="Trial Balance"
      description="Debit and credit balances for all accounts"
      toolbar={
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input type="date" className="h-9 mt-1" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input type="date" className="h-9 mt-1" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          </div>
          <Button onClick={loadData} className="h-9">Refresh</Button>
        </div>
      }
    >
      <FinanceTableCard title="Trial Balance Report">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground border-b">
              <tr className="text-left">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No data found.</td></tr>
              ) : (
                trialBalance.map((row, idx) => {
                  let isDebitBalance = false;
                  let amount = Math.abs(row.balance);
                  
                  if (["asset", "expense"].includes(row.type)) {
                    isDebitBalance = row.balance >= 0;
                  } else {
                    isDebitBalance = row.balance < 0;
                  }

                  if (isDebitBalance) calcDebit += amount;
                  else calcCredit += amount;

                  if (amount === 0) return null; // Hide zero balance accounts

                  return (
                    <tr key={row.accountId} className={`border-b ${idx % 2 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2 text-right">{isDebitBalance ? amount.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}</td>
                      <td className="px-4 py-2 text-right">{!isDebitBalance ? amount.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {trialBalance.length > 0 && (
              <tfoot className="bg-muted/30 font-semibold border-t-2">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right">Totals:</td>
                  <td className="px-4 py-3 text-right">{calcDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-4 py-3 text-right">{calcCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
