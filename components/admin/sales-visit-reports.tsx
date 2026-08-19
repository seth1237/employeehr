"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { salesApi } from "@/lib/api"
import { dateLabel } from "@/lib/sales-calendar"
import { MonthWeekDayNav } from "@/components/sales-month-week-day"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import type { TenantBranding } from "@/lib/stock-document-pdf"

type VisitReport = {
  _id: string
  clientName: string
  clientPhone?: string
  purpose?: string
  outcome?: string
  outcomeDetail?: string
  personMet?: string
  personRole?: string
  personPhone?: string
  personEmail?: string
  notes?: string
  gps?: { lat: number; lng: number }
  interestCategories?: Array<{ categoryId: string; categoryName: string; note?: string }>
  checkInAt?: string
  visitDate?: string
  repName?: string
  reportDate?: string
  reportStatus?: string
  status?: "locked" | "unlocked"
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function AdminSalesVisitReports({ title = "Visit reports" }: { title?: string }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState<VisitReport[]>([])
  const [q, setQ] = useState("")
  const [appliedQ, setAppliedQ] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [revokingId, setRevokingId] = useState("")
  const [branding, setBranding] = useState<TenantBranding>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const token = getToken()
        const res = await fetch(`${API_URL}/api/company/branding`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const json = await res.json()
          setBranding(json.data || {})
        }
      } catch (e) {
        console.error("Failed to load branding", e)
      }
    }
    fetchBranding()
  }, [])

  const load = useCallback(async (search = appliedQ) => {
    setLoading(true)
    try {
      const res = await salesApi.adminListVisits({ q: search.trim() || undefined })
      setVisits(res.data || [])
    } catch (error: any) {
      toast({ title: "Could not load visit reports", description: error?.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [appliedQ, toast])

  useEffect(() => {
    void load()
  }, [load])

  const dates = useMemo(
    () => visits.map((visit) => visit.visitDate || visit.reportDate || "").filter(Boolean),
    [visits],
  )

  const dayVisits = useMemo(
    () =>
      visits.filter((visit) => (visit.visitDate || visit.reportDate || "") === selectedDate),
    [visits, selectedDate],
  )

  const revoke = async (id: string) => {
    setRevokingId(id)
    try {
      await salesApi.adminRevokeVisit(id)
      toast({ title: "Report unlocked", description: "The sales rep can now edit this visit report." })
      void load()
    } catch (error: any) {
      toast({ title: "Could not revoke report", description: error?.message, variant: "destructive" })
    } finally {
      setRevokingId("")
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Banner with Gradient Branding */}
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: primaryColor }}
            >
              Field Sales
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Review, unlock, and manage field visit reports submitted by your sales team.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setAppliedQ(q)
              void load(q)
            }}
          >
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Label>Search reports</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Rep, client, outcome, category..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setAppliedQ(q)
                      void load(q)
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setAppliedQ(q)
                  void load(q)
                }}
              >
                Apply search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Choose the visit date</p>
          <MonthWeekDayNav
            dates={dates}
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
            selectedDate={selectedDate}
            onSelectMonth={(month) => {
              setSelectedMonth(month)
              setSelectedWeek(null)
              setSelectedDate("")
            }}
            onSelectWeek={(week) => {
              setSelectedWeek(week)
              setSelectedDate("")
            }}
            onSelectDate={setSelectedDate}
          />
        </CardContent>
      </Card>

      {/* Visit List Section */}
      {loading ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
            Loading {title.toLowerCase()}…
          </CardContent>
        </Card>
      ) : !selectedDate ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
            Select a month, week, and day to open the reports.
          </CardContent>
        </Card>
      ) : dayVisits.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
            No visit reports for {dateLabel(selectedDate)}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {dateLabel(selectedDate)}
            </p>
            <Badge variant="secondary" className="text-xs">
              {dayVisits.length} visit{dayVisits.length === 1 ? "" : "s"}
            </Badge>
          </div>
          
          <div className="grid gap-3">
            {dayVisits.map((visit) => {
              const locked = visit.status !== "unlocked"
              return (
                <Card key={visit._id} className="shadow-sm overflow-hidden">
                  <CardHeader className="border-b bg-muted/20 pb-3">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{visit.clientName}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Visited by {visit.repName || "Unknown Rep"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {visit.purpose ? (
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {visit.purpose}
                          </Badge>
                        ) : null}
                        <Badge 
                          variant="outline" 
                          className={`text-[11px] capitalize ${locked ? "border-slate-200 bg-slate-50 text-slate-600" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                        >
                          {locked ? "Locked" : "Unlocked"}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-sm">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Person Met</p>
                        <p className="font-medium text-foreground">
                          {visit.personMet || "—"}
                          {visit.personRole ? <span className="text-muted-foreground font-normal"> · {visit.personRole}</span> : ""}
                        </p>
                        {(visit.personPhone || visit.personEmail) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[visit.personPhone, visit.personEmail].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Client Response</p>
                        <p className="font-medium text-foreground">
                          {visit.outcome || "—"}
                        </p>
                        {visit.outcomeDetail && (
                          <p className="text-xs text-muted-foreground">{visit.outcomeDetail}</p>
                        )}
                      </div>
                    </div>

                    {(visit.interestCategories || []).length > 0 ? (
                      <div 
                        className="rounded-lg border px-3 py-2.5"
                        style={{ 
                          borderColor: primaryBorderColor, 
                          backgroundColor: primarySoftColor 
                        }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: primaryColor }}>
                          Product of interest
                        </p>
                        <ul className="space-y-1">
                          {visit.interestCategories!.map((item) => (
                            <li key={`${visit._id}-${item.categoryId}`} className="text-sm text-foreground flex items-start gap-2">
                              <span className="font-medium">{item.categoryName}</span>
                              {item.note ? <span className="text-muted-foreground">— {item.note}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {visit.notes ? (
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Notes</p>
                        <p className="text-sm text-muted-foreground bg-muted/40 p-2 rounded-md">{visit.notes}</p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>
                          Carried out {dateLabel(visit.visitDate || visit.reportDate || selectedDate)}
                        </span>
                        {visit.checkInAt && (
                          <span>Filed {new Date(visit.checkInAt).toLocaleString("en-KE")}</span>
                        )}
                        {visit.gps?.lat && visit.gps?.lng ? (
                          <a
                            href={`https://maps.google.com/?q=${visit.gps.lat},${visit.gps.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-800 hover:underline"
                          >
                            Location {Number(visit.gps.lat).toFixed(5)}, {Number(visit.gps.lng).toFixed(5)}
                          </a>
                        ) : null}
                        {visit.clientPhone && <span>{visit.clientPhone}</span>}
                      </div>
                      
                      {locked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={revokingId === visit._id}
                          onClick={() => void revoke(visit._id)}
                        >
                          {revokingId === visit._id ? "Revoking..." : "Unlock for editing"}
                        </Button>
                      ) : (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                          Unlocked. Rep can edit; locks on save.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}