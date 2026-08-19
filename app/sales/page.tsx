"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Banknote,
  BookUser,
  CalendarDays,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Footprints,
  Hourglass,
  MapPin,
  PhoneCall,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { salesApi } from "@/lib/api"
import { downloadSalesQuotePdf } from "@/lib/sales-quote-pdf"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { useSalesBranding } from "@/hooks/use-sales-branding"
import {
  SalesEmpty,
  SalesKpi,
  SalesPage,
  SalesQuickAction,
  SalesStatusBadge,
  telHref,
} from "@/components/sales/sales-ui"
import { SalesCompanion } from "@/components/sales/companion"
import { dateLabel } from "@/lib/sales-calendar"

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function readGps() {
  try {
    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined
    return await new Promise<{ lat: number; lng: number; accuracy?: number } | undefined>((resolve) => {
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
  } catch {
    return undefined
  }
}

export default function SalesDashboardPage() {
  const { toast } = useToast()
  const branding = useSalesBranding()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<any>(null)
  const [acting, setActing] = useState<"start" | "end" | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await salesApi.getDashboard(todayKey())
      setData(res.data)
    } catch (err: any) {
      setError("We couldn't load your sales activities.")
      toast({ title: "Could not load today", description: "Check your connection and try again.", variant: "destructive" })
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
  const todayPlanner = data?.todayPlanner
  const loggedNames = useMemo(
    () => new Set((data?.visits || []).map((item: any) => String(item.clientName || "").toLowerCase())),
    [data?.visits],
  )

  const startDay = async () => {
    setActing("start")
    try {
      let gps
      try {
        gps = await readGps()
      } catch {
        gps = undefined
      }
      await salesApi.startDay({ date: todayKey(), ...(gps ? { gps } : {}) })
      toast({ title: "You're on", description: "Have a good day in the field." })
      void load()
    } catch (err: any) {
      toast({ title: "Couldn't start the day", description: "Try again in a moment.", variant: "destructive" })
    } finally {
      setActing(null)
    }
  }

  const endDay = async () => {
    setActing("end")
    try {
      let gps
      try {
        gps = await readGps()
      } catch {
        gps = undefined
      }
      await salesApi.endDay({ date: todayKey(), ...(gps ? { gps } : {}) })
      toast({ title: "Day closed", description: "See you tomorrow." })
      void load()
    } catch (err: any) {
      toast({ title: "Couldn't close the day", description: "Try again in a moment.", variant: "destructive" })
    } finally {
      setActing(null)
    }
  }

  if (loading && !data) {
    return <PageLoadingSkeleton title="Loading your desk" rows={8} />
  }

  if (error && !data) {
    return (
      <SalesPage>
        <SalesEmpty
          title={error}
          description="Check your connection and try again."
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

  const plannedCount = Number(kpis?.plannedVisits || todayPlanner?.visits?.length || 0)
  const completedCount = Number(kpis?.visitsToday || 0)
  const quoteValue = Number(kpis?.quoteValueThisWeek || 0)
  const reminderCount =
    (reminders?.followUpsDue || []).length +
    (reminders?.quotesNeedingRevision || []).length +
    (reminders?.quotesAwaitingDownload || []).length

  const firstOpenVisit = (todayPlanner?.visits || []).find(
    (visit: any) => !loggedNames.has(String(visit.clientName || "").toLowerCase()),
  )
  const firstVisitName = todayPlanner?.visits?.[0]?.clientName
  const nextVisitName = firstOpenVisit?.clientName

  return (
    <SalesPage>
      <SalesCompanion
        color={branding.primaryColor}
        started={Boolean(report?.dayStartAt)}
        acting={acting}
        plannedCount={plannedCount}
        completedCount={completedCount}
        followUps={Number(kpis?.followUpsDue || 0)}
        firstVisitName={firstVisitName}
        nextVisitName={nextVisitName}
        quotesNeedingRevision={(reminders?.quotesNeedingRevision || []).length}
        quotesAwaitingDownload={(reminders?.quotesAwaitingDownload || []).length}
        plannerStatus={todayPlanner?.status}
        onStartDay={() => void startDay()}
        onEndDay={() => void endDay()}
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SalesKpi
          label="Visits"
          value={`${completedCount}/${plannedCount || completedCount || 0}`}
          hint={plannedCount ? `${plannedCount} planned today` : "Logged today"}
          icon={Footprints}
          color={branding.primaryColor}
        />
        <SalesKpi
          label="Follow-ups"
          value={kpis?.followUpsDue || 0}
          hint="Need action now"
          icon={Clock}
          tone={(kpis?.followUpsDue || 0) > 0 ? "alert" : "default"}
          color={branding.primaryColor}
        />
        <SalesKpi
          label="Quote value (week)"
          value={`KES ${quoteValue.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`}
          hint={`${kpis?.quotesThisWeek || 0} quotes this week`}
          icon={Banknote}
          color={branding.primaryColor}
        />
        <SalesKpi
          label="Pending quotes"
          value={kpis?.quotesPending || 0}
          hint="Waiting on admin"
          icon={Hourglass}
          color={branding.primaryColor}
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Today’s plan</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/sales/planner">
              <Plus className="mr-1 h-4 w-4" />
              Plan visit
            </Link>
          </Button>
        </div>
        {!todayPlanner?.visits?.length ? (
          <Card>
            <SalesEmpty
              title="The planner is empty"
              description="Who should we see first?"
              action={
                <Button asChild>
                  <Link href="/sales/planner">Plan my day</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {todayPlanner.visits.map((visit: any, index: number) => {
              const done = loggedNames.has(String(visit.clientName || "").toLowerCase())
              return (
                <Card key={`${visit.clientName}-${index}`} className="border-slate-200">
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{visit.clientName}</p>
                        <p className="text-xs text-slate-500">
                          {visit.reason === "Other" ? visit.customReason : visit.reason}
                        </p>
                      </div>
                      <SalesStatusBadge status={done ? "completed" : "planned"} label={done ? "Done" : "Planned"} />
                    </div>
                    {visit.location ? (
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" /> {visit.location}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      {done ? (
                        <Button asChild size="sm" className="min-h-10 flex-1">
                          <Link href="/sales/report">View report</Link>
                        </Button>
                      ) : todayPlanner?.status === "approved" ? (
                        <Button asChild size="sm" className="min-h-10 flex-1">
                          <Link href="/sales/report">Record visit</Link>
                        </Button>
                      ) : (
                        <p className="text-xs text-amber-700">
                          {todayPlanner?.status === "rejected"
                            ? "This plan was rejected."
                            : "Waiting for admin approval before you can complete visits."}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>What needs attention</span>
              {reminderCount ? <SalesStatusBadge status="pending" label={`${reminderCount} open`} /> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reminderCount === 0 ? (
              <SalesEmpty title="Nothing overdue" description="Log visits and calls as you go." />
            ) : (
              <>
                {(reminders?.followUpsDue || []).map((item: any) => (
                  <div key={item._id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.clientName}</p>
                      <p className="text-xs text-slate-500">
                        Follow-up {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString("en-KE") : "due"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {telHref(item.clientPhone) ? (
                        <Button asChild size="sm" variant="outline" className="min-h-10">
                          <a href={telHref(item.clientPhone)}>
                            <PhoneCall className="mr-1 h-4 w-4" /> Call
                          </a>
                        </Button>
                      ) : null}
                      <Button asChild size="sm" className="min-h-10">
                        <Link href="/sales/clients">Open client</Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {(reminders?.quotesNeedingRevision || []).map((item: any) => (
                  <div key={item._id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{item.quoteNumber} · {item.clientName}</p>
                      <p className="text-xs text-slate-500">{item.rejectionReason || "Needs revision"}</p>
                    </div>
                    <Button asChild size="sm" className="min-h-10">
                      <Link href="/sales/quotes">Open quotation</Link>
                    </Button>
                  </div>
                ))}
                {(reminders?.quotesAwaitingDownload || []).map((item: any) => (
                  <div key={item._id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{item.quoteNumber} · {item.clientName}</p>
                      <p className="text-xs text-slate-500">Approved — send the PDF</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => void downloadSalesQuotePdf(item).then(() => toast({ title: "Quote PDF downloaded" }))}
                    >
                      <Download className="mr-1 h-4 w-4" /> Download
                    </Button>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
          <div className="grid gap-2">
            <SalesQuickAction href="/sales/report" icon={ClipboardList} title="Record visit" description="File a visit from today’s planner" color={branding.primaryColor} />
            <SalesQuickAction href="/sales/planner" icon={CalendarDays} title="Plan visit" description="Build tomorrow’s route" color={branding.primaryColor} />
            <SalesQuickAction href="/sales/quotes" icon={FileText} title="Create quotation" description="Quote from live stock" color={branding.primaryColor} />
            <SalesQuickAction href="/sales/clients" icon={BookUser} title="New client / call" description="Search the book or log a call" color={branding.primaryColor} />
          </div>
        </div>
      </section>

      {(data?.upcomingPlanners || []).length > 0 ? (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingPlanners.map((planner: any) => (
              <div key={planner._id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{dateLabel(planner.date)}</p>
                  <p className="text-xs text-slate-500">{planner.visits?.length || 0} planned</p>
                </div>
                <SalesStatusBadge status={planner.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="hidden gap-3 lg:grid lg:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quote pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              ["Draft", pipeline.draft],
              ["Submitted", pipeline.submitted],
              ["Approved", pipeline.approved],
              ["Converted", pipeline.downloaded],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-semibold tabular-nums">{value || 0}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Clients</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href="/sales/clients">Open</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.myClients || []).slice(0, 6).map((client: any) => (
              <div key={client._id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  <p className="truncate text-xs text-slate-500">{client.phone}</p>
                </div>
                {telHref(client.phone) ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={telHref(client.phone)}>Call</a>
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentActivities || []).slice(0, 6).map((item: any) => (
              <div key={item._id}>
                <p className="truncate text-sm font-medium">{item.clientName}</p>
                <p className="text-xs text-slate-500">
                  {item.type?.replace("_", " ")} · {item.outcome || "Logged"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4" />
            Logged visits today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.visits || []).length === 0 ? (
            <SalesEmpty title="No visits logged yet" description="Record a visit after you meet the client." action={<Button asChild><Link href="/sales/report">Record visit</Link></Button>} />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.visits.map((visit: any) => (
                <div key={visit._id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{visit.clientName}</p>
                    <p className="text-xs text-slate-500">
                      {visit.outcome || visit.purpose || "Visit"} ·{" "}
                      {visit.checkInAt ? new Date(visit.checkInAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  {telHref(visit.clientPhone) ? (
                    <a className="text-sm font-medium text-teal-800" href={telHref(visit.clientPhone)}>
                      {visit.clientPhone}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
        <Users className="h-4 w-4" />
        {kpis?.myClients || 0} clients in your book · {kpis?.callsToday || 0} calls today ·{" "}
        <Link href="/sales/history" className="font-medium text-teal-800">
          History
        </Link>
      </div>
    </SalesPage>
  )
}
