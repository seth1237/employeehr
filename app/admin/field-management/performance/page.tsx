"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, ExternalLink, MapPin, RefreshCw, Save, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

type PeriodKey = "weekly" | "monthly" | "quarterly"

type GpsPoint = { lat: number; lng: number; accuracy?: number }

type SalesSlice = {
  label: string
  actual: number
  target: number
  count: number
  percent: number | null
}

type ExpenseSlice = {
  label: string
  transport: number
  nightOuts: number
  nightOutAmount?: number
  total?: number
  visitCount: number
}

type AttendanceSlice = {
  expected: number
  present: number
  closed: number
  incomplete: number
  absent: number
  withLocation: number
  hours: number
  visits: number
  rate: number | null
}

type DayVisit = {
  clientName: string
  at?: string
  gps?: GpsPoint | null
}

type DayRow = {
  date: string
  startAt?: string | null
  endAt?: string | null
  hours: number
  startGps?: GpsPoint | null
  endGps?: GpsPoint | null
  visitCount: number
  visits: DayVisit[]
}

type LocationRow = {
  date: string
  kind: "start" | "end" | "visit"
  label: string
  at?: string | null
  gps: GpsPoint
}

type PeriodMeta = {
  label: string
  from: string
  to: string
  workdays: string[]
}

type RepRow = {
  userId: string
  name: string
  email: string
  status: string
  weeklyAmount: number
  monthlyAmount: number
  quarterlyAmount: number
  sales: Record<PeriodKey, SalesSlice>
  expenses: Record<PeriodKey, ExpenseSlice>
  attendance: Record<PeriodKey, AttendanceSlice>
  days: DayRow[]
  locations: LocationRow[]
}

type Draft = {
  weeklyAmount: string
  monthlyAmount: string
  quarterlyAmount: string
}

function kes(value: number) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

function toDraft(rep: RepRow): Draft {
  return {
    weeklyAmount: String(rep.weeklyAmount || 0),
    monthlyAmount: String(rep.monthlyAmount || 0),
    quarterlyAmount: String(rep.quarterlyAmount || 0),
  }
}

function mapsUrl(gps: GpsPoint) {
  return `https://maps.google.com/?q=${gps.lat},${gps.lng}`
}

function gpsText(gps?: GpsPoint | null) {
  if (!gps) return ""
  return `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
}

function timeLabel(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
}

function dayStatus(day?: DayRow | null) {
  if (day?.startAt && day?.endAt) return { label: "Present", tone: "present" as const }
  if (day?.startAt) return { label: "In field", tone: "incomplete" as const }
  if (day && day.visitCount > 0) return { label: "Visits only", tone: "visits" as const }
  return { label: "Absent", tone: "absent" as const }
}

function GpsLink({ gps, label }: { gps?: GpsPoint | null; label?: string }) {
  if (!gps) return <span className="text-muted-foreground">No location</span>
  return (
    <a
      href={mapsUrl(gps)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-teal-800 hover:underline"
    >
      <MapPin className="h-3.5 w-3.5" />
      {label || gpsText(gps)}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

export default function FieldPerformancePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState("")
  const [period, setPeriod] = useState<PeriodKey>("monthly")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState("all")
  const [periods, setPeriods] = useState<Record<PeriodKey, PeriodMeta>>({
    weekly: { label: "This week", from: "", to: "", workdays: [] },
    monthly: { label: "This month", from: "", to: "", workdays: [] },
    quarterly: { label: "This quarter", from: "", to: "", workdays: [] },
  })
  const [reps, setReps] = useState<RepRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.sales.adminGetPerformance()
      const list: RepRow[] = res.data?.reps || []
      setPeriods({
        weekly: res.data?.periods?.weekly || { label: "This week", from: "", to: "", workdays: [] },
        monthly: res.data?.periods?.monthly || { label: "This month", from: "", to: "", workdays: [] },
        quarterly: res.data?.periods?.quarterly || { label: "This quarter", from: "", to: "", workdays: [] },
      })
      setReps(list)
      setDrafts(Object.fromEntries(list.map((rep) => [rep.userId, toDraft(rep)])))
      setSelectedId((current) => {
        if (current !== "all" && list.some((rep) => rep.userId === current)) return current
        return list[0]?.userId || "all"
      })
    } catch (error: any) {
      toast({
        title: "Could not load performance",
        description: error?.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reps
    return reps.filter(
      (rep) =>
        rep.name.toLowerCase().includes(query) ||
        String(rep.email || "").toLowerCase().includes(query),
    )
  }, [reps, search])

  const selected = selectedId === "all" ? null : reps.find((rep) => rep.userId === selectedId) || null

  const save = async (rep: RepRow) => {
    const draft = drafts[rep.userId] || toDraft(rep)
    setSavingId(rep.userId)
    try {
      await api.sales.adminSetTarget(rep.userId, {
        weeklyAmount: Number(draft.weeklyAmount || 0),
        monthlyAmount: Number(draft.monthlyAmount || 0),
        quarterlyAmount: Number(draft.quarterlyAmount || 0),
      })
      toast({ title: `Targets saved for ${rep.name}` })
      await load()
    } catch (error: any) {
      toast({
        title: "Could not save targets",
        description: error?.message,
        variant: "destructive",
      })
    } finally {
      setSavingId("")
    }
  }

  const updateDraft = (userId: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || { weeklyAmount: "0", monthlyAmount: "0", quarterlyAmount: "0" }),
        [field]: value,
      },
    }))
  }

  if (loading && reps.length === 0) {
    return <PageLoadingSkeleton title="Loading sales performance" rows={6} />
  }

  const workdays = periods[period]?.workdays || []
  const periodFrom = periods[period]?.from || ""
  const periodTo = periods[period]?.to || "9999-99-99"
  const attendanceDays = selected
    ? workdays.map((date) => {
        const day = selected.days?.find((item) => item.date === date)
        return { date, day }
      })
    : []
  const periodLocations = (selected?.locations || []).filter((row) => {
    if (!periodFrom) return true
    return row.date >= periodFrom && row.date < periodTo
  })

  return (
    <div className="flex min-h-0 flex-col gap-4 p-4 lg:h-[calc(100vh-4rem)] lg:overflow-hidden lg:p-6">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales performance</h1>
          <p className="text-sm text-muted-foreground">
            Open one sales person for attendance, locations from Start day / visits, and sales vs target.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            {([
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
              ["quarterly", "Quarterly"],
            ] as const).map(([key, label]) => (
              <Button key={key} size="sm" variant={period === key ? "secondary" : "ghost"} onClick={() => setPeriod(key)}>
                {label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <p className="shrink-0 text-xs text-muted-foreground">{periods[period]?.label}</p>

      {reps.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <BarChart3 className="h-8 w-8 opacity-40" />
            <p>No sales reps yet. Add a user with the sales_rep role first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-12 lg:overflow-hidden">
          <Card className="flex min-h-0 flex-col lg:col-span-4 lg:overflow-hidden">
            <CardHeader className="shrink-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Sales people
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="shrink-0"
              />
              <div className="shrink-0 lg:hidden">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a sales person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sales people</SelectItem>
                    {filtered.map((rep) => (
                      <SelectItem key={rep.userId} value={rep.userId}>
                        {rep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain lg:block">
                <button
                  type="button"
                  onClick={() => setSelectedId("all")}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selectedId === "all" ? "border-teal-700 bg-teal-50" : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  All sales people
                </button>
                {filtered.map((rep) => {
                  const sales = rep.sales[period]
                  const attendance = rep.attendance?.[period]
                  const active = selectedId === rep.userId
                  return (
                    <button
                      key={rep.userId}
                      type="button"
                      onClick={() => setSelectedId(rep.userId)}
                      className={`w-full rounded-md border px-3 py-2 text-left ${
                        active ? "border-teal-700 bg-teal-50" : "border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <p className="text-sm font-medium">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sales?.percent == null ? "No target" : `${sales.percent}% of target`}
                        {" · "}
                        {attendance?.present || 0}/{attendance?.expected || 0} days
                      </p>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain lg:col-span-8">
            {selectedId === "all" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">All sales people</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rep</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Locations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((rep) => {
                        const sales = rep.sales[period]
                        const attendance = rep.attendance?.[period]
                        return (
                          <TableRow
                            key={rep.userId}
                            className="cursor-pointer"
                            onClick={() => setSelectedId(rep.userId)}
                          >
                            <TableCell>
                              <p className="font-medium">{rep.name}</p>
                              <p className="text-xs text-muted-foreground">{rep.email}</p>
                            </TableCell>
                            <TableCell>
                              <p className="tabular-nums">{kes(sales?.actual || 0)}</p>
                              <p className="text-xs text-muted-foreground">
                                {sales?.percent == null ? "No target" : `${sales.percent}% of target`}
                              </p>
                            </TableCell>
                            <TableCell>
                              {attendance?.present || 0}/{attendance?.expected || 0} present
                            </TableCell>
                            <TableCell className="tabular-nums">{Number(attendance?.hours || 0).toFixed(1)}</TableCell>
                            <TableCell>{attendance?.withLocation || 0} days with GPS</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : selected ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                      <span>{selected.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{selected.email}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Invoices</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">{kes(selected.sales[period]?.actual || 0)}</p>
                      <p className="text-xs text-muted-foreground">
                        {selected.sales[period]?.percent == null
                          ? "No target"
                          : `${selected.sales[period].percent}% of ${kes(selected.sales[period].target)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Present days</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">
                        {selected.attendance[period]?.present || 0}/{selected.attendance[period]?.expected || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selected.attendance[period]?.rate == null
                          ? "No workdays yet"
                          : `${selected.attendance[period].rate}% attendance`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Field hours</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">
                        {Number(selected.attendance[period]?.hours || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selected.attendance[period]?.incomplete || 0} day
                        {selected.attendance[period]?.incomplete === 1 ? "" : "s"} not closed
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expenses</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">
                        {kes(Number(selected.expenses[period]?.total || selected.expenses[period]?.transport || 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selected.expenses[period]?.nightOuts || 0} night out
                        {selected.expenses[period]?.nightOuts === 1 ? "" : "s"}
                        {Number(selected.expenses[period]?.nightOutAmount || 0) > 0
                          ? ` · ${kes(Number(selected.expenses[period]?.nightOutAmount || 0))}`
                          : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attendanceDays.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No workdays in this period yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start</TableHead>
                            <TableHead>Start location</TableHead>
                            <TableHead>End</TableHead>
                            <TableHead>End location</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Visits</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceDays.map(({ date, day }) => {
                            const status = dayStatus(day)
                            return (
                              <TableRow key={date}>
                                <TableCell className="whitespace-nowrap">{date}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={status.tone === "present" ? "default" : "outline"}
                                    className={
                                      status.tone === "absent"
                                        ? "border-red-200 bg-red-50 text-red-800"
                                        : status.tone === "incomplete"
                                          ? "border-amber-200 bg-amber-50 text-amber-800"
                                          : undefined
                                    }
                                  >
                                    {status.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>{timeLabel(day?.startAt)}</TableCell>
                                <TableCell>
                                  <GpsLink gps={day?.startGps} />
                                </TableCell>
                                <TableCell>{timeLabel(day?.endAt)}</TableCell>
                                <TableCell>
                                  <GpsLink gps={day?.endGps} />
                                </TableCell>
                                <TableCell className="tabular-nums">{Number(day?.hours || 0).toFixed(1)}</TableCell>
                                <TableCell>{day?.visitCount || 0}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Locations from the sales app</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {periodLocations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No GPS yet this period. Location is stored when the rep starts the day, ends the day, or files a visit.
                      </p>
                    ) : (
                      <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
                        {periodLocations.map((row, index) => (
                          <div key={`${row.date}-${row.kind}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {row.kind === "start" ? "Start day" : row.kind === "end" ? "End day" : row.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {row.date}
                                {row.at ? ` · ${timeLabel(row.at)}` : ""}
                                {row.kind === "visit" ? " · Visit" : ""}
                              </p>
                            </div>
                            <GpsLink gps={row.gps} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sales targets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`${selected.userId}-weekly`}>Weekly target (KES)</Label>
                        <Input
                          id={`${selected.userId}-weekly`}
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={(drafts[selected.userId] || toDraft(selected)).weeklyAmount}
                          onChange={(event) => updateDraft(selected.userId, "weeklyAmount", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${selected.userId}-monthly`}>Monthly target (KES)</Label>
                        <Input
                          id={`${selected.userId}-monthly`}
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={(drafts[selected.userId] || toDraft(selected)).monthlyAmount}
                          onChange={(event) => updateDraft(selected.userId, "monthlyAmount", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${selected.userId}-quarterly`}>Quarterly target (KES)</Label>
                        <Input
                          id={`${selected.userId}-quarterly`}
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={(drafts[selected.userId] || toDraft(selected)).quarterlyAmount}
                          onChange={(event) => updateDraft(selected.userId, "quarterlyAmount", event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => void save(selected)} disabled={savingId === selected.userId}>
                        <Save className="mr-1.5 h-4 w-4" />
                        {savingId === selected.userId ? "Saving…" : "Save targets"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-sm text-muted-foreground">Choose a sales person.</CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
