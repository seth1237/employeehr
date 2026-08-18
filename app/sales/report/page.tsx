"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { salesApi } from "@/lib/api"

const DEFAULT_ROLES = [
  "Doctor",
  "Director",
  "Lab Technician",
  "Nurse",
  "Procurement",
  "Facility Manager",
  "Accountant",
  "Reception",
  "Other",
]

const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
]

function weekOfMonth(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  return Math.ceil((date.getDate() + first.getDay()) / 7)
}

function monthKey(dateStr: string) {
  return String(dateStr || "").slice(0, 7)
}

function monthLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("en-KE", { month: "long", year: "numeric" })
}

function dateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
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

type PlannerVisit = {
  clientName: string
  clientId?: string
  reason?: string
  customReason?: string
}

type Planner = {
  _id: string
  date: string
  status: string
  visits: PlannerVisit[]
}

const emptyForm = {
  personMet: "",
  personRole: "Doctor",
  customRole: "",
  personPhone: "",
  personEmail: "",
  facilityPhone: "",
  county: "",
  notes: "",
}

export default function SalesReportPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [planners, setPlanners] = useState<Planner[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES)
  const [counties, setCounties] = useState<string[]>(KENYA_COUNTIES)
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedPlanner, setSelectedPlanner] = useState<Planner | null>(null)
  const [selectedClient, setSelectedClient] = useState<PlannerVisit | null>(null)
  const [matchedClient, setMatchedClient] = useState<any | null>(null)
  const [matching, setMatching] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadPlanners = useCallback(async () => {
    setLoading(true)
    try {
      const [plannerRes, optionsRes] = await Promise.all([
        salesApi.getPlanners(),
        salesApi.getClientOptions().catch(() => ({ data: { roles: DEFAULT_ROLES, counties: KENYA_COUNTIES } })),
      ])
      const list = (plannerRes.data || []).filter((p: Planner) => p.status !== "rejected")
      setPlanners(list)
      setRoles(optionsRes.data?.roles?.length ? optionsRes.data.roles : DEFAULT_ROLES)
      setCounties(optionsRes.data?.counties?.length ? optionsRes.data.counties : KENYA_COUNTIES)
    } catch (error: any) {
      toast({ title: "Could not load planners", description: error?.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadPlanners()
  }, [loadPlanners])

  const loadVisits = useCallback(async (date: string) => {
    try {
      const res = await salesApi.getReport(date)
      setVisits(res.data?.visits || [])
    } catch {
      setVisits([])
    }
  }, [])

  useEffect(() => {
    if (selectedPlanner?.date) void loadVisits(selectedPlanner.date)
  }, [selectedPlanner?.date, loadVisits])

  const months = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>()
    for (const planner of planners) {
      const key = monthKey(planner.date)
      const current = map.get(key)
      if (current) current.count += 1
      else map.set(key, { key, label: monthLabel(planner.date), count: 1 })
    }
    return Array.from(map.values())
  }, [planners])

  const weeks = useMemo(() => {
    if (!selectedMonth) return []
    const map = new Map<number, number>()
    for (const planner of planners.filter((p) => monthKey(p.date) === selectedMonth)) {
      const week = weekOfMonth(planner.date)
      map.set(week, (map.get(week) || 0) + 1)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, count]) => ({ week, count }))
  }, [planners, selectedMonth])

  const datedPlanners = useMemo(() => {
    if (!selectedMonth || !selectedWeek) return []
    return planners
      .filter((p) => monthKey(p.date) === selectedMonth && weekOfMonth(p.date) === selectedWeek)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [planners, selectedMonth, selectedWeek])

  const matchClient = async (planned: PlannerVisit) => {
    setMatching(true)
    setMatchedClient(null)
    try {
      if (planned.clientId) {
        const book = await salesApi.getClientBook(planned.clientId)
        if (book.data?.client) {
          setMatchedClient(book.data.client)
          setForm((c) => ({ ...c, facilityPhone: book.data.client.phone || "" }))
          return
        }
      }
      const res = await salesApi.searchClients(planned.clientName)
      const exact = (res.data || []).find(
        (client: any) =>
          String(client.name || "").trim().toLowerCase() === String(planned.clientName).trim().toLowerCase(),
      )
      if (exact) {
        setMatchedClient(exact)
        setForm((c) => ({
          ...c,
          facilityPhone: exact.phone || "",
          county: exact.location || "",
        }))
      }
    } catch {
      setMatchedClient(null)
    } finally {
      setMatching(false)
    }
  }

  const pickClient = (planned: PlannerVisit) => {
    setSelectedClient(planned)
    setForm(emptyForm)
    void matchClient(planned)
  }

  const resolvedRole = form.personRole === "Other" ? form.customRole.trim() : form.personRole
  const clientSaved = Boolean(matchedClient?._id)

  const logVisit = async () => {
    if (!selectedPlanner || !selectedClient) return
    if (!form.personMet.trim()) {
      toast({ title: "Person met is required", variant: "destructive" })
      return
    }
    if (!resolvedRole) {
      toast({ title: "Select the role of the person met", variant: "destructive" })
      return
    }
    if (!clientSaved) {
      if (!form.facilityPhone.trim() || !form.county.trim()) {
        toast({
          title: "This facility is not in the system",
          description: "Add the facility number and county before saving the visit.",
          variant: "destructive",
        })
        return
      }
      if (!form.personPhone.trim()) {
        toast({ title: "Add the number of the person you met", variant: "destructive" })
        return
      }
    }

    setSaving(true)
    try {
      let customerId = matchedClient?._id
      if (!clientSaved) {
        const created = await salesApi.createClient({
          name: selectedClient.clientName,
          phone: form.facilityPhone.trim(),
          location: form.county.trim(),
          contactPerson: form.personMet.trim(),
          contactPersonRole: form.personRole,
          contactPersonCustomRole: form.customRole,
          email: form.personEmail.trim() || undefined,
        })
        customerId = created.data?._id
        setMatchedClient(created.data)
        if (customerId && form.personPhone.trim()) {
          await salesApi.addClientContact(customerId, {
            name: form.personMet.trim(),
            role: form.personRole,
            customRole: form.customRole,
            phone: form.personPhone.trim(),
            email: form.personEmail.trim() || undefined,
          }).catch(() => null)
        }
      }

      const gps = await readGps()
      await salesApi.createVisit({
        date: selectedPlanner.date,
        plannerId: selectedPlanner._id,
        clientName: selectedClient.clientName,
        clientPhone: form.facilityPhone.trim() || matchedClient?.phone,
        customer_id: customerId,
        visitType: "scheduled",
        purpose: selectedClient.reason === "Other" ? selectedClient.customReason : selectedClient.reason,
        personMet: form.personMet.trim(),
        personRole: resolvedRole,
        personPhone: form.personPhone.trim() || undefined,
        personEmail: form.personEmail.trim() || undefined,
        notes: form.notes.trim() || undefined,
        gps,
      })
      toast({ title: "Visit report saved" })
      setForm(emptyForm)
      void loadVisits(selectedPlanner.date)
    } catch (error: any) {
      toast({ title: "Could not save visit", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveFacilityContact = async () => {
    if (!matchedClient?._id) return
    if (!form.personMet.trim() || !resolvedRole) {
      toast({ title: "Add the contact name and role", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await salesApi.addClientContact(matchedClient._id, {
        name: form.personMet.trim(),
        role: form.personRole,
        customRole: form.customRole,
        phone: form.personPhone.trim() || undefined,
        email: form.personEmail.trim() || undefined,
      })
      setMatchedClient(res.data)
      toast({ title: "Contact added to this facility" })
    } catch (error: any) {
      toast({ title: "Could not add contact", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading reports…</div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Open a visit planner, pick the client, then record who you met.
        </p>
      </div>

      {planners.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No visit planners yet.{" "}
            <Link href="/sales/planner" className="text-teal-700 underline">
              Create a planner
            </Link>{" "}
            first, then come back here to report the visit.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Choose the planner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Month</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {months.map((month) => (
                <Button
                  key={month.key}
                  size="sm"
                  variant={selectedMonth === month.key ? "default" : "outline"}
                  onClick={() => {
                    setSelectedMonth(month.key)
                    setSelectedWeek(null)
                    setSelectedPlanner(null)
                    setSelectedClient(null)
                    setMatchedClient(null)
                  }}
                >
                  {month.label}
                  <span className="ml-2 text-xs opacity-80">{month.count}</span>
                </Button>
              ))}
            </div>
          </div>

          {selectedMonth ? (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Week</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {weeks.map((item) => (
                  <Button
                    key={item.week}
                    size="sm"
                    variant={selectedWeek === item.week ? "default" : "outline"}
                    onClick={() => {
                      setSelectedWeek(item.week)
                      setSelectedPlanner(null)
                      setSelectedClient(null)
                      setMatchedClient(null)
                    }}
                  >
                    Week {item.week}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {selectedWeek ? (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {datedPlanners.map((planner) => (
                  <Button
                    key={planner._id}
                    size="sm"
                    variant={selectedPlanner?._id === planner._id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedPlanner(planner)
                      setSelectedClient(null)
                      setMatchedClient(null)
                    }}
                  >
                    {dateLabel(planner.date)}
                    <Badge variant="secondary" className="ml-2 capitalize">
                      {planner.status}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedPlanner ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Select the client from this planner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(selectedPlanner.visits || []).map((visit, index) => {
              const logged = visits.some(
                (item) =>
                  String(item.clientName || "").toLowerCase() === String(visit.clientName).toLowerCase(),
              )
              return (
                <Button
                  key={`${visit.clientName}-${index}`}
                  size="sm"
                  variant={selectedClient?.clientName === visit.clientName ? "default" : "outline"}
                  className={logged ? "border-emerald-300" : ""}
                  onClick={() => pickClient(visit)}
                >
                  {visit.clientName}
                  {logged ? " ✓" : ""}
                </Button>
              )
            })}
            {(selectedPlanner.visits || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">This planner has no clients.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {selectedClient ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">3. Visit report — {selectedClient.clientName}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedClient.reason === "Other" ? selectedClient.customReason : selectedClient.reason}
                  {matching ? " · Checking if this facility is saved…" : ""}
                </p>
              </div>
              {clientSaved ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700">Saved client</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  Not in system
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!clientSaved && !matching ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                This planner client is not saved. Add the facility number, county, and the person you met
                before you can file the report.
              </div>
            ) : null}

            {!clientSaved ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Facility number</Label>
                  <Input
                    value={form.facilityPhone}
                    onChange={(e) => setForm((c) => ({ ...c, facilityPhone: e.target.value }))}
                    placeholder="Main facility phone"
                  />
                </div>
                <div className="space-y-1">
                  <Label>County</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.county}
                    onChange={(e) => setForm((c) => ({ ...c, county: e.target.value }))}
                  >
                    <option value="">Select county</option>
                    {counties.map((county) => (
                      <option key={county} value={county}>
                        {county}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
                <div>
                  <p className="font-medium">{matchedClient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {matchedClient.phone} {matchedClient.location ? `· ${matchedClient.location}` : ""}
                  </p>
                </div>
              </div>
            )}

            {clientSaved && (matchedClient.contacts || []).length > 0 ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Facility contacts</Label>
                <div className="flex flex-wrap gap-2">
                  {(matchedClient.contacts || []).map((contact: any, index: number) => (
                    <button
                      key={`${contact.name}-${index}`}
                      type="button"
                      className="rounded-full border bg-white px-3 py-1 text-left text-xs hover:bg-slate-50"
                      onClick={() =>
                        setForm((c) => ({
                          ...c,
                          personMet: contact.name || "",
                          personRole: roles.includes(contact.role) ? contact.role : "Other",
                          customRole: roles.includes(contact.role) ? "" : contact.role || "",
                          personPhone: contact.phone || "",
                          personEmail: contact.email || "",
                        }))
                      }
                    >
                      {contact.name}
                      <span className="text-muted-foreground"> · {contact.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Person met</Label>
                <Input
                  value={form.personMet}
                  onChange={(e) => setForm((c) => ({ ...c, personMet: e.target.value }))}
                  placeholder="Name of the person you met"
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.personRole}
                  onChange={(e) => setForm((c) => ({ ...c, personRole: e.target.value }))}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              {form.personRole === "Other" ? (
                <div className="space-y-1 md:col-span-2">
                  <Label>Custom role</Label>
                  <Input
                    value={form.customRole}
                    onChange={(e) => setForm((c) => ({ ...c, customRole: e.target.value }))}
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label>Number</Label>
                <Input
                  value={form.personPhone}
                  onChange={(e) => setForm((c) => ({ ...c, personPhone: e.target.value }))}
                  placeholder="Phone of the person met"
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.personEmail}
                  onChange={(e) => setForm((c) => ({ ...c, personEmail: e.target.value }))}
                  placeholder="Email"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {clientSaved ? (
                <Button variant="outline" onClick={() => void saveFacilityContact()} disabled={saving}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Add contact people
                </Button>
              ) : null}
              <Button onClick={() => void logVisit()} disabled={saving || matching}>
                Save visit report
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selectedPlanner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Visits on {dateLabel(selectedPlanner.date)} ({visits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visit reports for this date yet.</p>
            ) : (
              visits.map((visit) => (
                <div key={visit._id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{visit.clientName}</span>
                    <span className="text-xs text-muted-foreground">
                      {visit.checkInAt ? new Date(visit.checkInAt).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {visit.personMet
                      ? `${visit.personMet}${visit.personRole ? ` · ${visit.personRole}` : ""}`
                      : visit.purpose || "—"}
                    {visit.personPhone ? ` · ${visit.personPhone}` : ""}
                    {visit.personEmail ? ` · ${visit.personEmail}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      <Button asChild variant="ghost" size="sm">
        <Link href="/sales/planner">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to planner
        </Link>
      </Button>
    </div>
  )
}
