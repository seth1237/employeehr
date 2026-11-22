"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, ExternalLink, RefreshCw } from "lucide-react"
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  StatusBadge,
  TechnicalServiceHeader,
  TechnicalServicePage,
  downloadCsv,
  money,
  monthStart,
  todayIso,
  whenLabel,
} from "@/components/admin/technical-service-ui"

export default function TechnicalServiceExpensesPage() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayIso)
  const [engineerId, setEngineerId] = useState("")
  const [data, setData] = useState<any>(null)

  const load = () => {
    setLoading(true)
    engineeringApi
      .getReport({ from, to, engineerId: engineerId || undefined })
      .then((res) => setData(res.data || res))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await engineeringApi.exportReport({
        from,
        to,
        engineerId: engineerId || undefined,
      })
      const payload = res.data || res
      const engineerName = String(payload.engineerName || "all-engineers").replace(/\s+/g, "-").toLowerCase()
      downloadCsv(
        `engineer-expenses-${engineerName}-${from}_to_${to}.csv`,
        ["Claim", "Engineer", "Purpose", "Amount", "Status", "Date", "Work order"],
        (payload.expenses || []).map((row: any) => [
          row.claimNumber,
          row.engineer,
          row.purpose,
          row.amount,
          row.status,
          whenLabel(row.date),
          row.woId,
        ]),
      )
    } catch (error) {
      console.error(error)
      window.alert("Could not export expenses.")
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) return <PageLoadingSkeleton title="Engineer expenses" />

  const engineers = data?.engineers || []
  const finance = data?.finance || {}
  const claims = data?.expenses || []
  const accountsQuery = engineerId
    ? `/admin/accounts/expenses/claims?source=engineer&employeeId=${engineerId}`
    : "/admin/accounts/expenses/claims?source=engineer"

  return (
    <TechnicalServicePage>
      <TechnicalServiceHeader
        title="Engineer expenses"
        description="Job labour and field claims for the selected period. Accounts holds the live claims register."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={accountsQuery}>
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Accounts claims
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/accounts/expenses">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Accounts expenses
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/accounts/financial-breakdown">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Financial breakdown
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>From</Label>
          <Input type="date" className="mt-1 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" className="mt-1 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label>Engineer</Label>
          <select
            className="mt-1 h-9 rounded-md border px-3 text-sm"
            value={engineerId}
            onChange={(e) => setEngineerId(e.target.value)}
          >
            <option value="">All engineers</option>
            {engineers.map((engineer: any) => (
              <option key={engineer._id} value={engineer._id}>
                {engineer.name}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Apply
        </Button>
        <Button size="sm" variant="outline" onClick={() => void exportData()} disabled={exporting}>
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Job cost</p>
            <p className="mt-1 text-xl font-semibold">{money(finance.jobCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Field claims</p>
            <p className="mt-1 text-xl font-semibold">{money(finance.expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total spend</p>
            <p className="mt-1 text-xl font-semibold">{money(finance.totalSpend)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By engineer</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DesktopTableShell>
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Engineer</th>
                    <th className="px-4 py-3">Job cost</th>
                    <th className="px-4 py-3">Expenses</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(finance.byEngineer || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No costings in this period.
                      </td>
                    </tr>
                  ) : (
                    (finance.byEngineer || []).map((row: any) => (
                      <tr key={row._id} className="border-t">
                        <td className="px-4 py-3">{row.name}</td>
                        <td className="px-4 py-3">{money(row.jobCost)}</td>
                        <td className="px-4 py-3">{money(row.expenses)}</td>
                        <td className="px-4 py-3 font-medium">{money(row.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DesktopTableShell>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claims by purpose</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DesktopTableShell>
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Count</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(finance.byPurpose || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No field claims in this period.
                      </td>
                    </tr>
                  ) : (
                    (finance.byPurpose || []).map((row: any) => (
                      <tr key={row.purpose} className="border-t">
                        <td className="px-4 py-3">{row.purpose}</td>
                        <td className="px-4 py-3">{row.count}</td>
                        <td className="px-4 py-3">{money(row.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DesktopTableShell>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claims by status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DesktopTableShell>
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Count</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(finance.byStatus || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No field claims in this period.
                      </td>
                    </tr>
                  ) : (
                    (finance.byStatus || []).map((row: any) => (
                      <tr key={row.status} className="border-t">
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3">{row.count}</td>
                        <td className="px-4 py-3">{money(row.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DesktopTableShell>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Claims register</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href={accountsQuery}>Open in Accounts</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Engineer</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No engineer claims in this period.
                    </td>
                  </tr>
                ) : (
                  claims.map((row: any) => (
                    <tr key={row._id} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.claimNumber}</td>
                      <td className="px-4 py-3">{row.employeeName}</td>
                      <td className="px-4 py-3">{row.purpose}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">{money(row.totalAmount)}</td>
                      <td className="px-4 py-3">{whenLabel(row.submittedAt || row.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DesktopTableShell>
          <MobileCardList label="Claims">
            {claims.map((row: any) => (
              <MobileCard key={row._id}>
                <p className="font-medium">{row.claimNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {row.employeeName} · {row.purpose} · {money(row.totalAmount)}
                </p>
              </MobileCard>
            ))}
          </MobileCardList>
        </CardContent>
      </Card>
    </TechnicalServicePage>
  )
}
