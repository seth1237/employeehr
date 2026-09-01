"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function GeneralLedgerPage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  const [ledger, setLedger] = useState<any[]>([])
  
  const [filters, setFilters] = useState({
    accountId: "",
    startDate: "",
    endDate: new Date().toISOString().slice(0, 10)
  })

  const loadAccounts = async () => {
    try {
      const res = await glApi.getAccounts()
      const data = res.data || []
      setAccounts(data)
      if (data.length > 0 && !filters.accountId) {
        setFilters(prev => ({ ...prev, accountId: data[0]._id }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadLedger = async () => {
    if (!filters.accountId) return
    try {
      setLoading(true)
      const res = await glApi.getLedger(filters)
      setLedger(res.data || [])
    } catch (err: any) {
      window.alert(err.message || "Failed to load ledger")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (filters.accountId) {
      loadLedger()
    }
  }, [filters.accountId])

  if (loading && accounts.length === 0) return <PageLoadingSkeleton title="General Ledger" />

  const selectedAccount = accounts.find(a => a._id === filters.accountId)
  let runningBalance = 0

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="General Ledger Detail"
      description="View detailed transaction history for a specific account"
      toolbar={
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <Label className="text-xs text-muted-foreground">Account</Label>
            <select 
              className="h-9 w-64 rounded-md border bg-background px-3 text-sm mt-1"
              value={filters.accountId}
              onChange={e => setFilters({...filters, accountId: e.target.value})}
            >
              <option value="">Select Account...</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>{acc.code} - {acc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input type="date" className="h-9 mt-1" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input type="date" className="h-9 mt-1" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          </div>
          <Button onClick={loadLedger} className="h-9">Refresh</Button>
        </div>
      }
    >
      <FinanceTableCard title={selectedAccount ? `Ledger: ${selectedAccount.code} - ${selectedAccount.name}` : "Ledger"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground border-b sticky top-0">
              <tr className="text-left">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Entry #</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No transactions found for this account in the selected period.</td></tr>
              ) : (
                ledger.map((line, idx) => {
                  // Running balance calculation depends on account type
                  if (selectedAccount?.type === "asset" || selectedAccount?.type === "expense") {
                    runningBalance += (line.debit || 0) - (line.credit || 0)
                  } else {
                    runningBalance += (line.credit || 0) - (line.debit || 0)
                  }
                  
                  return (
                    <tr key={`${line.entryNumber}-${idx}`} className={`border-b ${idx % 2 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-2">{new Date(line.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-mono text-xs">{line.entryNumber}</td>
                      <td className="px-4 py-2">{line.description}</td>
                      <td className="px-4 py-2 text-right">{line.debit ? line.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}</td>
                      <td className="px-4 py-2 text-right">{line.credit ? line.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}</td>
                      <td className="px-4 py-2 text-right font-medium">{runningBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
