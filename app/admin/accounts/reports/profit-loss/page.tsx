"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function ProfitAndLossPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await glApi.getProfitAndLoss(filters)
      setData(res.data)
    } catch (err: any) {
      window.alert(err.message || "Failed to load profit and loss")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && !data) return <PageLoadingSkeleton title="Profit & Loss" />

  return (
    <FinanceDocumentShell
      eyebrow="Financial Reports"
      title="Profit & Loss"
      description="Formal P&L from the general ledger"
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
      <div className="max-w-4xl">
        <FinanceTableCard title="Profit & Loss Statement">
          <div className="p-6">
            {!data ? (
              <div className="text-center text-muted-foreground py-8">No data available</div>
            ) : (
              <div className="space-y-6">
                
                {/* Revenue Section */}
                <div>
                  <h3 className="font-semibold border-b pb-2 mb-2">Revenue</h3>
                  {data.details.revenueAccounts.map((acc: any) => (
                    <div key={acc.accountId} className="flex justify-between py-1 text-sm">
                      <span>{acc.name}</span>
                      <span>{acc.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 mt-2 font-medium border-t text-sm">
                    <span>Total Revenue</span>
                    <span>{data.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>

                {/* COGS Section */}
                {data.details.cogsAccounts.length > 0 && (
                  <div>
                    <h3 className="font-semibold border-b pb-2 mb-2">Cost of Goods Sold</h3>
                    {data.details.cogsAccounts.map((acc: any) => (
                      <div key={acc.accountId} className="flex justify-between py-1 text-sm">
                        <span>{acc.name}</span>
                        <span>{acc.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 mt-2 font-medium border-t text-sm">
                      <span>Total COGS</span>
                      <span>{data.cogs.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                )}

                {/* Gross Profit */}
                <div className="flex justify-between py-3 bg-muted/30 px-3 rounded font-semibold border text-primary">
                  <span>Gross Profit</span>
                  <span>{data.grossProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>

                {/* Operating Expenses Section */}
                <div>
                  <h3 className="font-semibold border-b pb-2 mb-2">Operating Expenses</h3>
                  {data.details.expenseAccounts.map((acc: any) => (
                    <div key={acc.accountId} className="flex justify-between py-1 text-sm">
                      <span>{acc.name}</span>
                      <span>{acc.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 mt-2 font-medium border-t text-sm">
                    <span>Total Operating Expenses</span>
                    <span>{data.expenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>

                {/* Net Income */}
                <div className="flex justify-between py-4 bg-primary text-primary-foreground px-4 rounded-md font-bold text-lg">
                  <span>Net Income</span>
                  <span>{data.netIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                
              </div>
            )}
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
