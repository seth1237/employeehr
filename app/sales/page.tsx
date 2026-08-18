"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  BookUser,
  CalendarClock,
  ClipboardList,
  FileText,
  MapPin,
  PhoneCall,
  Play,
  Square,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { salesApi } from "@/lib/api"
import { downloadSalesQuotePdf } from "@/lib/sales-quote-pdf"

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function telHref(phone?: string) {
  const digits = String(phone || "").replace(/[^\d+]/g, "")
  return digits ? `tel:${digits}` : ""
}

async function readGps() {
  if (!navigator.geolocation) return undefined
  return new Promise<{ lat: number; lng: number; accuracy?: number } | undefined>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  })
}

export default function SalesDashboardPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await salesApi.getDashboard(todayKey())
      setData(res.data)
    } catch (error: any) {
      toast({
        title: "Could not load today",
        description: error?.message || "Try refresh",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const report = data?.report
  const kpis = data?.kpis
  const reminders = data?.reminders
  const pipeline = data?.pipeline || {}

  const startDay = async () => {
    try {
      const gps = await readGps()
      await salesApi.startDay({ date: todayKey(), gps })
      toast({ title: "Day started" })
      void load()
    } catch (error: any) {
      toast({ title: "Could not start day", description: error?.message, variant: "destructive" })
    }
  }

  const endDay = async () => {
    try {
      const gps = await readGps()
      await salesApi.endDay({ date: todayKey(), gps })
      toast({ title: "Day ended" })
      void load()
    } catch (error: any) {
      toast({ title: "Could not end day", description: error?.message, variant: "destructive" })
    }
  }

  const downloadQuote = async (quote: any) => {
    try {
      await downloadSalesQuotePdf(quote)
      toast({ title: "Quote PDF downloaded" })
    } catch (error: any) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" })
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading your desk…
      </div>
    )
  }

  const startedAt = report?.dayStartAt ? new Date(report.dayStartAt).toLocaleTimeString() : null

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">What I need to do</h1>
          <p className="text-sm text-muted-foreground">
            {todayKey()} · {report?.status === "open" ? "Report in progress" : report?.status?.replace("_", " ")}
            {startedAt ? ` · Started ${startedAt}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void startDay()} disabled={Boolean(report?.dayStartAt)}>
            <Play className="mr-1.5 h-4 w-4" />
            {report?.dayStartAt ? "Day started" : "Start day"}
          </Button>
          <Button variant="outline" onClick={() => void endDay()}>
            <Square className="mr-1.5 h-4 w-4" />
            End day
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Visits today",
            value: `${kpis?.visitsToday || 0}${kpis?.plannedVisits ? ` / ${kpis.plannedVisits}` : ""}`,
          },
          { label: "Calls today", value: kpis?.callsToday || 0 },
          { label: "My clients", value: kpis?.myClients || 0 },
          { label: "Follow-ups due", value: kpis?.followUpsDue || 0 },
          { label: "Quotes this week", value: kpis?.quotesThisWeek || 0 },
          { label: "Pending approval", value: kpis?.quotesPending || 0 },
          { label: "Quotes approved", value: kpis?.quotesApproved || 0 },
          {
            label: "Quote value (week)",
            value: `KES ${Number(kpis?.quoteValueThisWeek || 0).toLocaleString("en-KE")}`,
          },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Draft", value: pipeline.draft || 0 },
          { label: "Submitted", value: pipeline.submitted || 0 },
          { label: "Approved", value: pipeline.approved || 0 },
          { label: "Downloaded", value: pipeline.downloaded || 0 },
        ].map((stage) => (
          <div key={stage.label} className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{stage.label}</p>
            <p className="text-lg font-semibold">{stage.value}</p>
          </div>
        ))}
      </div>

      <Card className="border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(reminders?.followUpsDue || []).length === 0 &&
          (reminders?.quotesNeedingRevision || []).length === 0 &&
          (reminders?.quotesAwaitingDownload || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing overdue. Log visits as you go.</p>
          ) : (
            <>
              {(reminders?.followUpsDue || []).map((item: any) => (
                <div key={item._id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{item.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      Follow-up {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Due</Badge>
                    {telHref(item.clientPhone) ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={telHref(item.clientPhone)}>
                          <PhoneCall className="mr-1 h-3.5 w-3.5" />
                          Call
                        </a>
                      </Button>
                    ) : null}
                    {item.customer_id ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/sales/clients">Open book</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {(reminders?.quotesNeedingRevision || []).map((item: any) => (
                <div key={item._id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{item.quoteNumber} · {item.clientName}</p>
                    <p className="text-xs text-muted-foreground">{item.rejectionReason || "Sent back for revision"}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/sales/quotes">Rework</Link>
                  </Button>
                </div>
              ))}
              {(reminders?.quotesAwaitingDownload || []).map((item: any) => (
                <div key={item._id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{item.quoteNumber} · {item.clientName}</p>
                    <p className="text-xs text-muted-foreground">Approved — download the PDF and follow up</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void downloadQuote(item)}>
                    Download PDF
                  </Button>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Button asChild className="h-auto justify-start bg-teal-700 py-4 hover:bg-teal-800">
          <Link href="/sales/clients">
            <BookUser className="mr-2 h-4 w-4" />
            Clients book
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-4">
          <Link href="/sales/report">
            <ClipboardList className="mr-2 h-4 w-4" />
            Log a visit report
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-4">
          <Link href="/sales/quotes">
            <FileText className="mr-2 h-4 w-4" />
            Build a quote from stock
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-4">
          <Link href="/sales/history">
            <CalendarClock className="mr-2 h-4 w-4" />
            My activity history
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" />
                My clients
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href="/sales/clients">Open book</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.myClients || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No clients in your book yet. Create one from the clients page.
              </p>
            ) : (
              data.myClients.map((client: any) => (
                <div key={client._id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.phone} {client.location ? `· ${client.location}` : ""}
                    </p>
                  </div>
                  {telHref(client.phone) ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={telHref(client.phone)}>
                        <PhoneCall className="mr-1 h-3.5 w-3.5" />
                        Call
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentActivities || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Calls and notes you log will show here.</p>
            ) : (
              data.recentActivities.map((item: any) => (
                <div key={item._id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.clientName}</span>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.outcome || item.purpose || "Logged"} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today's visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.visits || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits logged yet.</p>
          ) : (
            data.visits.map((visit: any) => (
              <div key={visit._id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{visit.clientName}</p>
                  <Badge variant="outline">{visit.outcome || visit.visitType}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {visit.purpose || "Visit"} · {new Date(visit.checkInAt).toLocaleTimeString()}
                </p>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  {visit.clientPhone ? (
                    <a className="inline-flex items-center gap-1 text-teal-700" href={telHref(visit.clientPhone)}>
                      <PhoneCall className="h-3 w-3" /> {visit.clientPhone}
                    </a>
                  ) : null}
                  {visit.gps?.lat ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> GPS captured
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
