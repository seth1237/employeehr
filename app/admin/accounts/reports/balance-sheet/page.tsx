"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  
  const [filters, setFilters] = useState({
    asOfDate: new Date().toISOString().slice(0, 10)
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await glApi.getBalanceSheet(filters)
      setData(res.data)
    } catch (err: any) {
      window.alert(err.message || "Failed to load balance sheet")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && !data) return <PageLoadingSkeleton title="Balance Sheet" />

  return (
    <FinanceDocumentShell
      eyebrow="Financial Reports"
      title="Balance Sheet"
      description="Assets, liabilities, and equity statement"
      toolbar={
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <Label className="text-xs text-muted-foreground">As Of Date</Label>
            <Input type="date" className="h-9 mt-1" value={filters.asOfDate} onChange={e => setFilters({...filters, asOfDate: e.target.value})} />
          </div>
          <Button onClick={loadData} className="h-9">Refresh</Button>
        </div>
      }
    >
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* ASSETS */}
        <div>
          <FinanceTableCard title="Assets">
            <div className="p-6">
              {!data ? (
                <div className="text-center text-muted-foreground py-8">No data</div>
              ) : (
                <div className="space-y-4">
                  {data.details.assetAccounts.map((acc: any) => (
                    <div key={acc.accountId} className="flex justify-between py-1 text-sm">
                      <span>{acc.name}</span>
                      <span>{acc.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 mt-4 bg-muted/30 px-3 rounded font-semibold border text-primary">
                    <span>Total Assets</span>
                    <span>{data.assets.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              )}
            </div>
          </FinanceTableCard>
        </div>

        {/* LIABILITIES & EQUITY */}
        <div className="space-y-6">
          <FinanceTableCard title="Liabilities">
            <div className="p-6">
              {!data ? (
                <div className="text-center text-muted-foreground py-8">No data</div>
              ) : (
                <div className="space-y-4">
                  {data.details.liabilityAccounts.length === 0 && (
                    <div className="text-muted-foreground text-sm py-2">No liabilities</div>
                  )}
                  {data.details.liabilityAccounts.map((acc: any) => (
                    <div key={acc.accountId} className="flex justify-between py-1 text-sm">
                      <span>{acc.name}</span>
                      <span>{Math.abs(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 mt-2 font-medium border-t text-sm">
                    <span>Total Liabilities</span>
                    <span>{Math.abs(data.liabilities).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              )}
            </div>
          </FinanceTableCard>

          <FinanceTableCard title="Equity">
            <div className="p-6">
              {!data ? (
                <div className="text-center text-muted-foreground py-8">No data</div>
              ) : (
                <div className="space-y-4">
                  {data.details.equityAccounts.map((acc: any) => (
                    <div key={acc.accountId} className="flex justify-between py-1 text-sm">
                      <span>{acc.name}</span>
                      <span>{Math.abs(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                  
                  {/* Current Year Net Income */}
                  <div className="flex justify-between py-1 text-sm text-muted-foreground italic">
                    <span>Current Period Net Income</span>
                    <span>{Math.abs(data.details.netIncome).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="flex justify-between py-2 mt-2 font-medium border-t text-sm">
                    <span>Total Equity</span>
                    <span>{Math.abs(data.equity).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              )}
            </div>
          </FinanceTableCard>

          <div className="flex justify-between py-4 bg-primary text-primary-foreground px-4 rounded-md font-bold text-lg">
            <span>Total Liabilities & Equity</span>
            <span>{data ? Math.abs(data.totalLiabilitiesAndEquity).toLocaleString(undefined, {minimumFractionDigits: 2}) : "0.00"}</span>
          </div>

          {data && !data.isBalanced && (
            <div className="p-3 bg-rose-100 text-rose-800 rounded-md border border-rose-200 text-sm font-medium">
              Warning: Balance sheet is out of balance. Assets ≠ Liabilities + Equity
            </div>
          )}
        </div>
      </div>
    </FinanceDocumentShell>
  )
}
