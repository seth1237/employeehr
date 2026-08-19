"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { FileText, Quote, Footprints, Calendar, User, MapPin, RefreshCw } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function SalesHistoryPage() {
  const branding = useSalesBranding()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const historyRes = await salesApi.getHistory()
      setData(historyRes.data || { reports: [], visits: [], quotes: [] })
    } catch {
      setError("We couldn't load your sales history.")
      setData({ reports: [], visits: [], quotes: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading && !data) {
    return <PageLoadingSkeleton title="Loading activity history" rows={6} />
  }

  if (error && !data?.visits && !data?.quotes && !data?.reports) {
    return (
      <SalesPage>
        <SalesEmpty
          title={error}
          action={
            <Button onClick={() => void load()}>
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

  return (
    <SalesPage>
      <SalesHeader
        title="History"
        description="Your visits, reports, and quotes."
        color={branding.primaryColor}
      />

      <div className="grid grid-cols-3 gap-2">
        <SalesKpi label="Reports" value={stats.reports} icon={FileText} color={branding.primaryColor} />
        <SalesKpi label="Quotes" value={stats.quotes} icon={Quote} color={branding.secondaryColor} />
        <SalesKpi label="Visits" value={stats.visits} icon={Footprints} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden />
              Field reports
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[450px] flex-1 overflow-y-auto p-0">
            {(data?.reports || []).length === 0 ? (
              <SalesEmpty
                title="No reports yet"
                description="Submitted visit reports appear here."
                action={
                  <Button asChild variant="outline">
                    <Link href="/sales/report">Record a visit</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.reports.map((report: any) => (
                  <div key={report._id} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
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
        </Card>

        <Card className="flex flex-col overflow-hidden border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Quote className="h-4 w-4" aria-hidden />
                Quotes
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href="/sales/quotes">Open</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[450px] flex-1 overflow-y-auto p-0">
            {(data?.quotes || []).length === 0 ? (
              <SalesEmpty
                title="No quotes yet"
                action={
                  <Button asChild variant="outline">
                    <Link href="/sales/quotes">Create a quote</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.quotes.map((quote: any) => (
                  <div key={quote._id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {quote.quotationNumber || quote.quoteNumber || "Draft quote"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {quote.client?.name || quote.clientName || "Unknown client"}
                        </p>
                      </div>
                      <SalesStatusBadge status={quote.status || "draft"} />
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                      <span className="text-xs text-slate-500">Total</span>
                      <span className="text-sm font-semibold tabular-nums">
                        KES {Number(quote.grandTotal || quote.subTotal || 0).toLocaleString("en-KE")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4" aria-hidden />
            Visit timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(data?.visits || []).length === 0 ? (
            <SalesEmpty
              title="No visits logged yet"
              description="Check in after you meet a client."
              action={
                <Button asChild>
                  <Link href="/sales/report">Record visit</Link>
                </Button>
              }
            />
          ) : (
            <div className="max-h-[500px] divide-y divide-slate-100 overflow-y-auto">
              {data.visits.map((visit: any) => {
                const when = visit.visitDate || visit.checkInAt
                return (
                  <div key={visit._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: branding.primarySoft, color: branding.primaryColor }}
                        >
                          <User className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{visit.clientName || "Unknown client"}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {visit.personMet ? (
                              <>
                                Met with <span className="font-medium text-slate-800">{visit.personMet}</span>
                                {visit.personRole ? ` (${visit.personRole})` : ""}
                              </>
                            ) : (
                              <>
                                {visit.visitType || "Field visit"} · {visit.outcome || "No outcome logged"}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {when ? (
                          <>
                            <p className="flex items-center justify-end gap-1 text-xs font-medium text-slate-500">
                              <Calendar className="h-3 w-3" aria-hidden />
                              {new Date(when).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            {visit.checkInAt ? (
                              <p className="mt-0.5 tabular-nums text-[11px] text-slate-400">
                                {new Date(visit.checkInAt).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" /> No date
                          </p>
                        )}
                        <div className="mt-1">
                          <SalesStatusBadge status={visit.status || visit.outcome || "logged"} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </SalesPage>
  )
}
