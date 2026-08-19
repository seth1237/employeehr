"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { salesApi } from "@/lib/api"
import {
  SalesEmpty,
  SalesHeader,
  SalesKpi,
  SalesPage,
  SalesStatusBadge,
} from "@/components/sales/sales-ui"
import { useSalesBranding } from "@/hooks/use-sales-branding"
import { FileText, Footprints, Calendar, User, MapPin, RefreshCw, Target, Wallet, ChevronRight } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

type PeriodKey = "weekly" | "monthly" | "quarterly"
type HistoryTab = "sales" | "expenses" | "reports" | "quotes" | "visits"

function kes(value: number) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

/**
 * Full-width, equal-column segmented control on mobile so each target
 * is comfortably tappable (>= 44px tall) instead of a cramped pill row.
 */
function PeriodToggle({
  value,
  onChange,
  color,
}: {
  value: PeriodKey
  onChange: (next: PeriodKey) => void
  color: string
}) {
  return (
    <div className="grid w-full grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
      {([
        ["weekly", "Weekly"],
        ["monthly", "Monthly"],
        ["quarterly", "Quarterly"],
      ] as const).map(([key, label]) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="min-h-[36px] touch-manipulation rounded-md px-2.5 text-sm font-medium transition-all active:scale-[0.97]"
            style={
              active
                ? { backgroundColor: "white", color, boxShadow: "0 1px 2px rgba(15,23,42,0.08)" }
                : { color: "#64748b" }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default function SalesHistoryPage() {
  const branding = useSalesBranding()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [period, setPeriod] = useState<PeriodKey>("monthly")
  const [tab, setTab] = useState<HistoryTab>("sales")

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const historyRes = await salesApi.getHistory()
      setData(historyRes.data || { reports: [], visits: [], quotes: [] })
    } catch {
      setError("We couldn't load your sales history.")
      setData((prev: any) => prev || { reports: [], visits: [], quotes: [] })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading && !data) {
    return <PageLoadingSkeleton title="Loading activity history" rows={6} />
  }

  if (error && !data?.visits?.length && !data?.quotes?.length && !data?.reports?.length) {
    return (
      <SalesPage>
        <SalesEmpty
          title={error}
          action={
            <Button className="min-h-11 touch-manipulation" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          }
        />
      </SalesPage>
    )
  }

  const stats = {
    reports: data?.reports?.length || 0,
    quotes: data?.quotes?.length || 0,
    visits: data?.visits?.length || 0,
  }
  const sales = data?.sales?.[period]
  const expenses = data?.expenses?.[period]
  const actual = Number(sales?.actual || 0)
  const target = Number(sales?.target || 0)
  const percent = target > 0 ? Math.min(Math.round((actual / target) * 100), 999) : null
  const bar = Math.min(percent || 0, 100)
  const transport = Number(expenses?.transport || 0)
  const nightOuts = Number(expenses?.nightOuts || 0)
  const nightOutAmount = Number(expenses?.nightOutAmount || 0)
  const expenseTotal = Number(expenses?.total || transport + nightOutAmount)
  const lines = expenses?.lines || []

  const tabs: Array<{ id: HistoryTab; label: string; count?: number }> = [
    { id: "sales", label: "My sales" },
    { id: "expenses", label: "My expenses" },
    { id: "reports", label: "Field reports", count: stats.reports },
    { id: "quotes", label: "Quotes", count: stats.quotes },
    { id: "visits", label: "Visits", count: stats.visits },
  ]

  return (
    <SalesPage>
      <SalesHeader
        title="History"
        description="Pick a section. Totals stay up top; details stay in one panel."
        color={branding.primaryColor}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 w-full touch-manipulation active:scale-[0.97] sm:w-auto"
            onClick={() => void load({ silent: true })}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {/* KPI row: 2-up on phones so each tile stays large enough to tap confidently */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <button
          type="button"
          className="touch-manipulation rounded-2xl text-left transition-transform active:scale-[0.97]"
          onClick={() => setTab("sales")}
          aria-pressed={tab === "sales"}
        >
          <SalesKpi
            label="My sales"
            value={kes(actual)}
            hint={target > 0 ? `${percent}% of ${kes(target)}` : "No target set"}
            icon={Target}
            color={branding.primaryColor}
          />
        </button>
        <button
          type="button"
          className="touch-manipulation rounded-2xl text-left transition-transform active:scale-[0.97]"
          onClick={() => setTab("expenses")}
          aria-pressed={tab === "expenses"}
        >
          <SalesKpi
            label="My expenses"
            value={kes(expenseTotal)}
            hint={`${nightOuts} night out${nightOuts === 1 ? "" : "s"}`}
            icon={Wallet}
            color={branding.secondaryColor}
          />
        </button>
        <button
          type="button"
          className="touch-manipulation rounded-2xl text-left transition-transform active:scale-[0.97]"
          onClick={() => setTab("reports")}
          aria-pressed={tab === "reports"}
        >
          <SalesKpi label="Reports" value={stats.reports} icon={FileText} color={branding.primaryColor} />
        </button>
        <button
          type="button"
          className="touch-manipulation rounded-2xl text-left transition-transform active:scale-[0.97]"
          onClick={() => setTab("visits")}
          aria-pressed={tab === "visits"}
        >
          <SalesKpi label="Visits" value={stats.visits} icon={Footprints} tone="success" />
        </button>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="space-y-3 border-b border-slate-100 bg-white/95 p-3 pb-3 backdrop-blur sm:p-4">
          {/* Scrollable, snap-aligned tab strip — avoids cramped tabs wrapping awkwardly on narrow screens */}
          <div
            className="-mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((item) => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className="min-h-10 shrink-0 touch-manipulation snap-start rounded-full border px-3.5 text-sm font-medium transition-all active:scale-[0.97]"
                  style={
                    active
                      ? {
                          backgroundColor: branding.primarySoft,
                          color: branding.primaryColor,
                          borderColor: branding.primaryColor,
                        }
                      : { backgroundColor: "transparent", color: "#475569", borderColor: "#e2e8f0" }
                  }
                >
                  {item.label}
                  {item.count != null ? (
                    <span
                      className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums"
                      style={active ? { backgroundColor: "white" } : { backgroundColor: "#f1f5f9" }}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          {tab === "sales" || tab === "expenses" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {tab === "sales" ? sales?.label : expenses?.label}
                {tab === "expenses" ? " · from approved plans" : ""}
              </p>
              <PeriodToggle value={period} onChange={setPeriod} color={branding.primaryColor} />
            </div>
          ) : tab === "quotes" ? (
            <div className="flex justify-end">
              <Button asChild size="sm" variant="outline" className="min-h-9 touch-manipulation">
                <Link href="/sales/quotes">Open quotes</Link>
              </Button>
            </div>
          ) : null}
        </CardHeader>

        {tab === "sales" ? (
          <CardContent className="space-y-4 p-3.5 sm:p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                <p className="text-xs text-slate-500">Invoices generated</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{kes(actual)}</p>
                <p className="text-xs text-slate-500">
                  {Number(sales?.count || 0)} invoice{Number(sales?.count || 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                <p className="text-xs text-slate-500">Sales target</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">
                  {target > 0 ? kes(target) : "Not set"}
                </p>
                <p className="text-xs text-slate-500">Set by admin</p>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1 sm:bg-transparent sm:p-0">
                <p className="text-xs text-slate-500">Vs target</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">
                  {percent == null ? "—" : `${percent}%`}
                </p>
                <p className="text-xs text-slate-500">
                  {target > 0 ? `${kes(Math.max(target - actual, 0))} remaining` : "Ask admin to set a target"}
                </p>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${bar}%`, backgroundColor: branding.primaryColor }}
              />
            </div>
            {(data?.invoices || []).length ? (
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                {data.invoices.slice(0, 8).map((invoice: any) => (
                  <div
                    key={invoice._id}
                    className="flex min-h-[60px] touch-manipulation items-center justify-between gap-3 px-3.5 py-2.5 active:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invoice.invoiceNumber}</p>
                      <p className="truncate text-xs text-slate-500">{invoice.clientName || "Client"}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{kes(invoice.grandTotal)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <SalesEmpty title="No invoices generated this quarter yet" />
            )}
          </CardContent>
        ) : null}

        {tab === "expenses" ? (
          <CardContent className="space-y-4 p-3.5 sm:p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                <p className="text-xs text-slate-500">Transport</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{kes(transport)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                <p className="text-xs text-slate-500">Night out</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{kes(nightOutAmount)}</p>
                <p className="text-xs text-slate-500">{nightOuts} day{nightOuts === 1 ? "" : "s"}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1 sm:bg-transparent sm:p-0">
                <p className="text-xs text-slate-500">Day totals</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">
                  {kes(expenseTotal)}
                </p>
              </div>
            </div>
            {lines.length === 0 ? (
              <SalesEmpty
                title="No expenses in this period"
                description="Transport and night outs from approved plans show here."
              />
            ) : (
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                {lines.map((line: any, index: number) => (
                  <div
                    key={`${line.date}-${line.clientName}-${index}`}
                    className="flex min-h-[60px] touch-manipulation items-center justify-between gap-3 px-3.5 py-2.5 active:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {line.date}
                        {line.nightOut ? " · Night out" : ""}
                      </p>
                    </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{kes(line.total ?? line.transport)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        ) : null}

        {tab === "reports" ? (
          <CardContent className="max-h-[26rem] overflow-y-auto p-0">
            {(data?.reports || []).length === 0 ? (
              <SalesEmpty
                title="No reports yet"
                description="Submitted visit reports appear here."
                action={
                  <Button asChild variant="outline" className="min-h-11 touch-manipulation">
                    <Link href="/sales/report">Record a visit</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.reports.map((report: any) => (
                  <div
                    key={report._id}
                    className="flex min-h-[64px] touch-manipulation items-center justify-between gap-3 px-3.5 py-3 active:bg-slate-50 sm:px-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: branding.primarySoft, color: branding.primaryColor }}
                      >
                        <Calendar className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{report.date || "Unnamed report"}</p>
                        <p className="text-xs text-slate-500">Field visit report</p>
                      </div>
                    </div>
                    <SalesStatusBadge status={report.status || "pending"} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        ) : null}

        {tab === "quotes" ? (
          <CardContent className="max-h-[26rem] overflow-y-auto p-0">
            {(data?.quotes || []).length === 0 ? (
              <SalesEmpty
                title="No quotes yet"
                action={
                  <Button asChild variant="outline" className="min-h-11 touch-manipulation">
                    <Link href="/sales/quotes">Create a quote</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.quotes.map((quote: any) => (
                  <Link
                    key={quote._id}
                    href="/sales/quotes"
                    className="flex min-h-[64px] touch-manipulation items-center justify-between gap-3 px-3.5 py-3 active:bg-slate-50 sm:px-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {quote.quotationNumber || quote.quoteNumber || "Draft quote"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {quote.client?.name || quote.clientName || "Unknown client"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <div>
                        <p className="text-sm font-semibold tabular-nums">
                          {kes(Number(quote.grandTotal || quote.subTotal || 0))}
                        </p>
                        <SalesStatusBadge status={quote.status || "draft"} />
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        ) : null}

        {tab === "visits" ? (
          <CardContent className="max-h-[26rem] overflow-y-auto p-0">
            {(data?.visits || []).length === 0 ? (
              <SalesEmpty
                title="No visits logged yet"
                description="Check in after you meet a client."
                action={
                  <Button asChild className="min-h-11 touch-manipulation">
                    <Link href="/sales/report">Record visit</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.visits.map((visit: any) => {
                  const when = visit.visitDate || visit.checkInAt
                  return (
                    <div
                      key={visit._id}
                      className="flex min-h-[64px] touch-manipulation items-center justify-between gap-3 px-3.5 py-3 active:bg-slate-50 sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: branding.primarySoft, color: branding.primaryColor }}
                        >
                          <User className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{visit.clientName || "Unknown client"}</p>
                          <p className="truncate text-xs text-slate-500">
                            {visit.personMet
                              ? `Met ${visit.personMet}${visit.personRole ? ` (${visit.personRole})` : ""}`
                              : visit.outcome || visit.visitType || "Field visit"}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {when ? (
                          <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" aria-hidden />
                            {new Date(when).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                        ) : (
                          <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            No date
                          </p>
                        )}
                        <div className="mt-1 flex justify-end">
                          <SalesStatusBadge status={visit.status || visit.outcome || "logged"} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        ) : null}
      </Card>
    </SalesPage>
  )
}