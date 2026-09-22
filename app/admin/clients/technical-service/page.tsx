"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, RefreshCw, Wallet, Wrench, X } from "lucide-react"
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  PreviewCard,
  StatusBadge,
  TechnicalServiceHeader,
  TechnicalServicePage,
  TS_BASE,
  downloadCsv,
  money,
  monthStart,
  todayIso,
  whenLabel,
} from "@/components/admin/technical-service-ui"
import { useCompanyBranding } from "@/hooks/use-sales-branding"

function TechnicalServiceHub() {
  const branding = useCompanyBranding()
  const searchParams = useSearchParams()
  const machineIdFromUrl = searchParams.get("machineId") || ""
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayIso)
  const [engineerId, setEngineerId] = useState("")
  const [data, setData] = useState<any>(null)
  const [assetHistory, setAssetHistory] = useState<any>(null)

  const load = () => {
    setLoading(true)
    engineeringApi
      .getReport({ from, to, engineerId: engineerId || undefined, limit: 40 })
      .then((res) => setData(res.data || res))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!machineIdFromUrl) {
      setAssetHistory(null)
      return
    }
    engineeringApi
      .getAssetHistory(machineIdFromUrl)
      .then((res) => setAssetHistory(res.data || res))
      .catch(() => setAssetHistory(null))
  }, [machineIdFromUrl])

  const summary = data?.summary || {}
  const finance = data?.finance || {}
  const engineers = data?.engineers || []
  const pending = (data?.pendingInstallations || []).slice(0, 5)
  const activity = (data?.activity || []).slice(0, 5)
  const liveJobs = (data?.liveJobs || []).slice(0, 5)
  const focusedAsset = assetHistory?.asset

  const kpis = useMemo(
    () => [
      { label: "Open jobs", value: summary.openJobs ?? 0 },
      { label: "In progress", value: summary.inProgress ?? 0 },
      { label: "Completed", value: summary.completed ?? 0 },
      { label: "Pending installs", value: summary.pendingInstallations ?? 0 },
      { label: "Job cost", value: money(summary.jobCost) },
      { label: "Expenses", value: money(summary.expenses) },
    ],
    [summary],
  )

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
      const stamp = `${from}_to_${to}`
      downloadCsv(
        `technical-service-jobs-${engineerName}-${stamp}.csv`,
        ["WO", "Type", "Job", "Status", "Engineer", "Machine", "Client", "Started", "Completed", "Job cost"],
        (payload.jobs || []).map((row: any) => [
          row.woNumber,
          row.type,
          row.serviceType,
          row.status,
          row.engineer,
          row.machine,
          row.client,
          whenLabel(row.startedAt),
          whenLabel(row.completedDate),
          row.cost,
        ]),
      )
      downloadCsv(
        `technical-service-expenses-${engineerName}-${stamp}.csv`,
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
      window.alert("Could not export this period.")
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) return <PageLoadingSkeleton title="Technical Service" />

  return (
    <TechnicalServicePage>
      <TechnicalServiceHeader
        title="Engineer overview"
        description="Jobs, installations, and field costings. Open a section for the full list."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/installed-machines">
                <Wrench className="mr-1.5 h-4 w-4" />
                Machines
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/accounts/expenses/claims?source=engineer">
                <Wallet className="mr-1.5 h-4 w-4" />
                Accounts
              </Link>
            </Button>
          </>
        }
      />

      {focusedAsset ? (
        <Card style={{ borderColor: branding.primaryBorder, backgroundColor: branding.primarySoft }}>
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: branding.primaryColor }}>
                Focused machine
              </p>
              <p className="font-semibold">{focusedAsset.productName}</p>
              <p className="text-sm text-muted-foreground">
                {focusedAsset.client?.name || "No client"}
                {focusedAsset.serialNumber ? ` · SN ${focusedAsset.serialNumber}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/admin/clients/installed-machines?machineId=${focusedAsset._id}`}>Open machine</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={TS_BASE}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
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
            {exporting ? "Exporting…" : "Export period"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 md:p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-lg font-semibold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Engineers this period</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Engineer</th>
                  <th className="px-4 py-3">Live</th>
                  <th className="px-4 py-3">Done</th>
                  <th className="px-4 py-3">Job cost</th>
                  <th className="px-4 py-3">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {engineers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No engineer activity in this period.
                    </td>
                  </tr>
                ) : (
                  engineers.map((engineer: any) => (
                    <tr key={engineer._id} className="border-t">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="font-medium hover:underline"
                          onClick={() => {
                            setEngineerId(engineer._id)
                            engineeringApi
                              .getReport({ from, to, engineerId: engineer._id })
                              .then((res) => setData(res.data || res))
                          }}
                        >
                          {engineer.name}
                        </button>
                      </td>
                      <td className="px-4 py-3">{engineer.inProgress ?? 0}</td>
                      <td className="px-4 py-3">{engineer.completed}</td>
                      <td className="px-4 py-3">{money(engineer.cost)}</td>
                      <td className="px-4 py-3">{money(engineer.expenseTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DesktopTableShell>
          <MobileCardList label="Engineers">
            {engineers.map((engineer: any) => (
              <MobileCard key={engineer._id}>
                <p className="font-medium">{engineer.name}</p>
                <p className="text-xs text-muted-foreground">
                  Live {engineer.inProgress ?? 0} · Done {engineer.completed} · Cost {money(engineer.cost)}
                </p>
              </MobileCard>
            ))}
          </MobileCardList>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PreviewCard title="Pending installations" href={`${TS_BASE}/installations`}>
          <DesktopTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Machine</th>
                  <th className="px-4 py-2">Client</th>
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                      No pending installations.
                    </td>
                  </tr>
                ) : (
                  pending.map((machine: any) => (
                    <tr key={machine._id} className="border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/clients/installed-machines?machineId=${machine._id}`}
                          className="font-medium hover:underline"
                        >
                          {machine.productName}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{machine.client?.name || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DesktopTableShell>
          <MobileCardList label="Pending installations">
            {pending.map((machine: any) => (
              <MobileCard key={machine._id}>
                <Link href={`/admin/clients/installed-machines?machineId=${machine._id}`} className="block">
                  <p className="font-medium">{machine.productName}</p>
                  <p className="text-xs text-muted-foreground">{machine.client?.name || "No client"}</p>
                </Link>
              </MobileCard>
            ))}
          </MobileCardList>
        </PreviewCard>

        <PreviewCard title="Recent activity" href={`${TS_BASE}/activity`}>
          <DesktopTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Job</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                      No recent work orders.
                    </td>
                  </tr>
                ) : (
                  activity.map((row: any) => (
                    <tr key={row._id} className="border-t">
                      <td className="px-4 py-2">
                        <p className="font-medium">{row.woNumber || row.serviceType || "Work order"}</p>
                        <p className="text-xs text-muted-foreground">{row.machine?.productName || row.technician}</p>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DesktopTableShell>
          <MobileCardList label="Recent activity">
            {activity.map((row: any) => (
              <MobileCard key={row._id}>
                <p className="font-medium">{row.woNumber || row.serviceType || "Work order"}</p>
                <p className="text-xs text-muted-foreground">
                  {row.technician || "Unassigned"} · {String(row.status || "open").replace("_", " ")}
                </p>
              </MobileCard>
            ))}
          </MobileCardList>
        </PreviewCard>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
          <CardTitle className="text-base">Financial snapshot</CardTitle>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href={`${TS_BASE}/expenses`}>View more</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Job cost</p>
            <p className="text-lg font-semibold">{money(finance.jobCost ?? summary.jobCost)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Field expenses</p>
            <p className="text-lg font-semibold">{money(finance.expenses ?? summary.expenses)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total spend</p>
            <p className="text-lg font-semibold">{money(finance.totalSpend ?? summary.totalSpend)}</p>
          </div>
          <p className="sm:col-span-3 text-sm text-muted-foreground">
            Job labour from completed work orders, plus engineer expense claims. Open Accounts to approve and post them.
          </p>
        </CardContent>
      </Card>

      {liveJobs.length > 0 ? (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Work in progress now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
            {liveJobs.map((row: any) => (
              <div key={row._id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.woNumber || row.serviceType || "Work order"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.technician || "Unassigned"} · {whenLabel(row.startedAt)}
                  </p>
                </div>
                <StatusBadge status="in_progress" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </TechnicalServicePage>
  )
}

export default function TechnicalServiceHubPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Technical Service" />}>
      <TechnicalServiceHub />
    </Suspense>
  )
}
