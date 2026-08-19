"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, PackagePlus, UserPlus, X, Calendar, Users, FileText, MapPin, Lock, Unlock, Plus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { salesApi } from "@/lib/api"
import { dateLabel, monthKey, monthLabel, weekOfMonth } from "@/lib/sales-calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { SalesHeader, SalesPage } from "@/components/sales/sales-ui"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

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
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa",
  "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
  "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
]

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
  outcome: "",
  outcomeDetail: "",
  interestCategoryId: "",
  interestNote: "",
  notes: "",
}

type InterestCategory = {
  categoryId: string
  categoryName: string
  note?: string
}

type OutcomeOption = {
  id: string
  label: string
  placeholder: string
  showsInterest?: boolean
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

function purposeResponses(reason?: string): OutcomeOption[] {
  const value = String(reason || "").toLowerCase()
  if (value.includes("quotation") || value.includes("quote")) {
    return [
      { id: "Quote requested", label: "Quote requested", placeholder: "What to quote and by when", showsInterest: true },
      { id: "Reviewing quotation", label: "Reviewing quotation", placeholder: "Who is reviewing / when they will decide", showsInterest: true },
      { id: "Needs revision", label: "Needs revision", placeholder: "What to change on the quote", showsInterest: true },
      { id: "Awaiting approval", label: "Awaiting client approval", placeholder: "Approver and expected date", showsInterest: true },
      { id: "Ready to order", label: "Ready to convert / order", placeholder: "PO, quantity, or next step", showsInterest: true },
      { id: "Not proceeding", label: "Not proceeding", placeholder: "Why they declined" },
    ]
  }
  if (value.includes("debt") || value.includes("cheque") || value.includes("collection")) {
    return [
      { id: "Cheque collected", label: "Cheque collected", placeholder: "Cheque no, bank, amount, date" },
      { id: "Cash collected", label: "Cash collected", placeholder: "Amount and receipt reference" },
      { id: "Promised payment", label: "Promised payment", placeholder: "Amount and promised date" },
      { id: "Partial payment", label: "Partial payment", placeholder: "Paid / balance remaining" },
      { id: "Disputed", label: "Disputed / query", placeholder: "What they queried" },
      { id: "Not available", label: "Person not available", placeholder: "Who to call next" },
    ]
  }
  if (value.includes("introduction")) {
    return [
      { id: "Interested", label: "Interested", placeholder: "What they asked about", showsInterest: true },
      { id: "Requested follow-up", label: "Requested a follow-up", placeholder: "When and with who", showsInterest: true },
      { id: "Introduced only", label: "Introduced only", placeholder: "Who else to meet" },
      { id: "Not interested", label: "Not interested", placeholder: "Reason" },
    ]
  }
  if (value.includes("inquiry") || value.includes("enquiry") || value.includes("business")) {
    return [
      { id: "Need identified", label: "Need identified", placeholder: "Describe the need", showsInterest: true },
      { id: "Requested information", label: "Requested information", placeholder: "What they want sent", showsInterest: true },
      { id: "To quote later", label: "To quote later", placeholder: "When to follow up", showsInterest: true },
      { id: "Not ready", label: "Not ready", placeholder: "When to check again" },
    ]
  }
  if (value.includes("installation")) {
    return [
      { id: "Installation completed", label: "Installation completed", placeholder: "What was installed", showsInterest: true },
      { id: "Partial installation", label: "Partial installation", placeholder: "What is pending", showsInterest: true },
      { id: "Delayed", label: "Delayed", placeholder: "Reason and new date" },
      { id: "Issues found", label: "Issues found", placeholder: "Describe the issue", showsInterest: true },
    ]
  }
  if (value.includes("service")) {
    return [
      { id: "Service completed", label: "Service completed", placeholder: "Work done", showsInterest: true },
      { id: "Parts needed", label: "Parts / product needed", placeholder: "What is needed", showsInterest: true },
      { id: "Follow-up booked", label: "Follow-up booked", placeholder: "Date and reason", showsInterest: true },
      { id: "Could not complete", label: "Could not complete", placeholder: "Why" },
    ]
  }
  if (value.includes("appointment")) {
    return [
      { id: "Held as planned", label: "Held as planned", placeholder: "Client response", showsInterest: true },
      { id: "Rescheduled", label: "Rescheduled", placeholder: "New date and time" },
      { id: "No-show", label: "No-show", placeholder: "Next action" },
      { id: "Cancelled", label: "Cancelled", placeholder: "Reason" },
    ]
  }
  return [
    { id: "Interested", label: "Interested / need noted", placeholder: "What they need", showsInterest: true },
    { id: "Follow-up needed", label: "Follow-up needed", placeholder: "Next action", showsInterest: true },
    { id: "Information only", label: "Information only", placeholder: "What was shared" },
    { id: "No interest", label: "No interest", placeholder: "Reason" },
    { id: "Complaint", label: "Complaint", placeholder: "Issue raised" },
  ]
}

interface TenantBranding {
  primaryColor?: string
  secondaryColor?: string
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
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([])
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([])
  const [showInterest, setShowInterest] = useState(false)
  const [branding, setBranding] = useState<TenantBranding>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  const loadPlanners = useCallback(async () => {
    setLoading(true)
    try {
      const [plannerRes, optionsRes, categoriesRes] = await Promise.all([
        salesApi.getPlanners(),
        salesApi.getClientOptions().catch(() => ({ data: { roles: DEFAULT_ROLES, counties: KENYA_COUNTIES } })),
        salesApi.getCategories().catch(() => ({ data: [] })),
      ])
      const list = (plannerRes.data || []).filter((p: Planner) => p.status !== "rejected")
      setPlanners(list)
      setRoles(optionsRes.data?.roles?.length ? optionsRes.data.roles : DEFAULT_ROLES)
      setCounties(optionsRes.data?.counties?.length ? optionsRes.data.counties : KENYA_COUNTIES)
      setCategories(categoriesRes.data || [])
    } catch (error: any) {
      toast({ title: "Could not load planners", description: error?.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadPlanners()
    
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
    const existing = visits.find(
      (item) =>
        String(item.clientName || "").trim().toLowerCase() ===
        String(planned.clientName || "").trim().toLowerCase(),
    )
    if (existing) {
      const roleKnown = roles.includes(existing.personRole)
      setForm({
        ...emptyForm,
        personMet: existing.personMet || "",
        personRole: roleKnown ? existing.personRole : existing.personRole ? "Other" : "Doctor",
        customRole: roleKnown ? "" : existing.personRole || "",
        personPhone: existing.personPhone || "",
        personEmail: existing.personEmail || "",
        outcome: existing.outcome || "",
        outcomeDetail: existing.outcomeDetail || "",
        notes: existing.notes || "",
        facilityPhone: existing.clientPhone || "",
      })
      setInterestCategories(existing.interestCategories || [])
      setShowInterest((existing.interestCategories || []).length > 0)
    } else {
      setForm(emptyForm)
      setInterestCategories([])
      setShowInterest(false)
    }
    void matchClient(planned)
  }

  const resolvedRole = form.personRole === "Other" ? form.customRole.trim() : form.personRole
  const clientSaved = Boolean(matchedClient?._id)
  const purpose = selectedClient?.reason === "Other" ? selectedClient.customReason : selectedClient?.reason
  const outcomeOptions = purposeResponses(purpose)
  const selectedOutcome = outcomeOptions.find((option) => option.id === form.outcome)
  const needsInterest = Boolean(selectedOutcome?.showsInterest) || showInterest
  const existingVisit = visits.find(
    (item) =>
      String(item.clientName || "").trim().toLowerCase() ===
      String(selectedClient?.clientName || "").trim().toLowerCase(),
  )
  const reportLocked = Boolean(existingVisit) && existingVisit.status !== "unlocked"

  const addInterestCategory = () => {
    const category = categories.find((item) => item._id === form.interestCategoryId)
    if (!category) {
      toast({ title: "Select a product category", variant: "destructive" })
      return
    }
    if (interestCategories.some((item) => item.categoryId === category._id)) {
      toast({ title: "That category is already added" })
      return
    }
    setInterestCategories((current) => [
      ...current,
      { categoryId: category._id, categoryName: category.name, note: form.interestNote.trim() || undefined },
    ])
    setShowInterest(true)
    setForm((c) => ({ ...c, interestCategoryId: "", interestNote: "" }))
  }

  const logVisit = async () => {
    if (!selectedPlanner || !selectedClient) return
    if (reportLocked) {
      toast({
        title: "This report is locked",
        description: "Ask an admin to revoke it before you can edit.",
        variant: "destructive",
      })
      return
    }
    if (!form.personMet.trim()) {
      toast({ title: "Person met is required", variant: "destructive" })
      return
    }
    if (!resolvedRole) {
      toast({ title: "Select the role of the person met", variant: "destructive" })
      return
    }
    if (!form.outcome) {
      toast({ title: "Select the client response / visit outcome", variant: "destructive" })
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
        purpose,
        outcome: form.outcome,
        outcomeDetail: form.outcomeDetail.trim() || undefined,
        interestCategories,
        personMet: form.personMet.trim(),
        personRole: resolvedRole,
        personPhone: form.personPhone.trim() || undefined,
        personEmail: form.personEmail.trim() || undefined,
        notes: form.notes.trim() || undefined,
        gps,
      })
      toast({ title: existingVisit ? "Visit report updated and locked" : "Visit report saved and locked" })
      setForm(emptyForm)
      setInterestCategories([])
      setShowInterest(false)
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
    return <PageLoadingSkeleton title="Loading visit reports" rows={8} />
  }

  return (
    <SalesPage>
      <SalesHeader
        title="Visit reports"
        description="Open a planner date, pick the client, then record who you met and the outcome."
        color={primaryColor}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/sales/planner">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Planner
            </Link>
          </Button>
        }
      />

      {planners.length === 0 ? (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground flex flex-col items-center justify-center text-center gap-2">
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
            <p>No visit planners yet.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/sales/planner" style={{ color: primaryColor }}>
                Create a planner
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 1: Choose Planner */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: primaryColor }} />
            1. Choose the planner
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Month</Label>
            <div className="flex flex-wrap gap-2">
              {months.map((month) => (
                <Button
                  key={month.key}
                  size="sm"
                  variant={selectedMonth === month.key ? "default" : "outline"}
                  className="h-8"
                  style={selectedMonth === month.key ? { backgroundColor: primaryColor, color: 'white' } : undefined}
                  onClick={() => {
                    setSelectedMonth(month.key)
                    setSelectedWeek(null)
                    setSelectedPlanner(null)
                    setSelectedClient(null)
                    setMatchedClient(null)
                  }}
                >
                  {month.label}
                  <span className="ml-1.5 text-xs opacity-80">({month.count})</span>
                </Button>
              ))}
            </div>
          </div>

          {selectedMonth ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Week</Label>
              <div className="flex flex-wrap gap-2">
                {weeks.map((item) => (
                  <Button
                    key={item.week}
                    size="sm"
                    variant={selectedWeek === item.week ? "default" : "outline"}
                    className="h-8"
                    style={selectedWeek === item.week ? { backgroundColor: primaryColor, color: 'white' } : undefined}
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
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
              <div className="flex flex-wrap gap-2">
                {datedPlanners.map((planner) => (
                  <Button
                    key={planner._id}
                    size="sm"
                    variant={selectedPlanner?._id === planner._id ? "default" : "outline"}
                    className="h-8"
                    style={selectedPlanner?._id === planner._id ? { backgroundColor: primaryColor, color: 'white' } : undefined}
                    onClick={() => {
                      setSelectedPlanner(planner)
                      setSelectedClient(null)
                      setMatchedClient(null)
                    }}
                  >
                    {dateLabel(planner.date)}
                    <Badge variant="secondary" className="ml-2 capitalize text-[10px] h-4 px-1.5">
                      {planner.status}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Step 2: Select Client */}
      {selectedPlanner ? (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: primaryColor }} />
              2. Select the client from this planner
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-wrap gap-2">
            {(selectedPlanner.visits || []).map((visit, index) => {
              const existing = visits.find(
                (item) =>
                  String(item.clientName || "").toLowerCase() === String(visit.clientName).toLowerCase(),
              )
              const locked = Boolean(existing) && existing.status !== "unlocked"
              return (
                <Button
                  key={`${visit.clientName}-${index}`}
                  size="sm"
                  variant={selectedClient?.clientName === visit.clientName ? "default" : "outline"}
                  className={`min-h-11 ${existing ? (locked ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100") : ""}`}
                  style={selectedClient?.clientName === visit.clientName ? { backgroundColor: primaryColor, color: 'white', borderColor: primaryColor } : undefined}
                  onClick={() => pickClient(visit)}
                >
                  {visit.clientName}
                  {existing ? (locked ? <Lock className="ml-1.5 h-3 w-3" /> : <Unlock className="ml-1.5 h-3 w-3" />) : null}
                </Button>
              )
            })}
            {(selectedPlanner.visits || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">This planner has no clients.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3: Visit Report Form */}
      {selectedClient ? (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: primaryColor }} />
                  3. Visit report — {selectedClient.clientName}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedClient.reason === "Other" ? selectedClient.customReason : selectedClient.reason}
                  {matching ? " · Checking if this facility is saved…" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {clientSaved ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">Saved client</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                    Not in system
                  </Badge>
                )}
                {existingVisit ? (
                  <Badge variant={reportLocked ? "outline" : "secondary"} className="flex items-center gap-1">
                    {reportLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {reportLocked ? "Locked" : "Unlocked for edit"}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {reportLocked ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 text-slate-500" />
                <span>This visit report is locked. Ask an admin to revoke it if you need to make changes.</span>
              </div>
            ) : existingVisit ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
                <Unlock className="h-4 w-4 mt-0.5 text-amber-600" />
                <span>Admin unlocked this report. Save your changes and it will lock again.</span>
              </div>
            ) : null}

            <fieldset disabled={reportLocked} className="space-y-4 disabled:opacity-90">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client information</p>
            {!clientSaved && !matching ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                This planner client is not saved. Add the facility number, county, and the person you met
                before you can file the report.
              </div>
            ) : null}

            {!clientSaved ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Facility number</Label>
                  <Input
                  className="h-11"
                  value={form.facilityPhone}
                    onChange={(e) => setForm((c) => ({ ...c, facilityPhone: e.target.value }))}
                    placeholder="Main facility phone"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">County</Label>
                  <Select value={form.county} onValueChange={(v) => setForm((c) => ({ ...c, county: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select county" />
                    </SelectTrigger>
                    <SelectContent>
                      {counties.map((county) => (
                        <SelectItem key={county} value={county}>
                          {county}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-background border flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{matchedClient.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {matchedClient.phone} {matchedClient.location ? `· ${matchedClient.location}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {clientSaved && (matchedClient.contacts || []).length > 0 ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Facility contacts</Label>
                <div className="flex flex-wrap gap-2">
                  {(matchedClient.contacts || []).map((contact: any, index: number) => (
                    <button
                      key={`${contact.name}-${index}`}
                      type="button"
                      className="rounded-full border bg-white px-3 py-1.5 text-left text-xs hover:bg-muted/50 transition-colors shadow-sm"
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
                      <span className="font-medium">{contact.name}</span>
                      <span className="text-muted-foreground"> · {contact.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visit details</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Person met <span className="text-red-600">*</span></Label>
                <Input
                  className="h-11"
                  value={form.personMet}
                  onChange={(e) => setForm((c) => ({ ...c, personMet: e.target.value }))}
                  placeholder="Name of the person you met"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Role</Label>
                <Select value={form.personRole} onValueChange={(v) => setForm((c) => ({ ...c, personRole: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.personRole === "Other" ? (
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium">Custom role</Label>
                  <Input
                    className="h-9 text-sm"
                    value={form.customRole}
                    onChange={(e) => setForm((c) => ({ ...c, customRole: e.target.value }))}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Number</Label>
                <Input
                  className="h-11"
                  value={form.personPhone}
                  onChange={(e) => setForm((c) => ({ ...c, personPhone: e.target.value }))}
                  placeholder="Phone of the person met"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  className="h-11"
                  value={form.personEmail}
                  onChange={(e) => setForm((c) => ({ ...c, personEmail: e.target.value }))}
                  placeholder="Email"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">Notes</Label>
                <Textarea
                  className="text-sm min-h-[60px] resize-none"
                  value={form.notes}
                  onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Client response</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Report for {purpose || "this visit"}. Pick the outcome, then fill the box beside it.
                  </p>
                </div>
                <div className="space-y-2">
                  {outcomeOptions.map((option) => {
                    const selected = form.outcome === option.id
                    return (
                      <div
                        key={option.id}
                        className={`rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/5 shadow-sm" : "bg-white hover:bg-muted/20"}`}
                        style={selected ? { borderColor: primaryColor } : undefined}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className="min-h-11 justify-start text-sm sm:min-w-[180px]"
                            style={selected ? { backgroundColor: primaryColor, color: 'white' } : undefined}
                            onClick={() => {
                              setForm((c) => ({ ...c, outcome: option.id, outcomeDetail: "" }))
                              if (option.showsInterest) setShowInterest(true)
                            }}
                          >
                            {option.label}
                          </Button>
                          {selected ? (
                            <Input
                              className="flex-1 h-8 text-xs"
                              value={form.outcomeDetail}
                              onChange={(e) => setForm((c) => ({ ...c, outcomeDetail: e.target.value }))}
                              placeholder={option.placeholder}
                            />
                          ) : null}
                        </div>
                        {selected ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Product of interest (optional)</Label>
                              <Select value={form.interestCategoryId} onValueChange={(v) => setForm((c) => ({ ...c, interestCategoryId: v }))}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category._id} value={category._id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Need / side note (optional)</Label>
                              <Input
                                className="h-8 text-xs"
                                value={form.interestNote}
                                onChange={(e) => setForm((c) => ({ ...c, interestNote: e.target.value }))}
                                placeholder="Need, quantity, or comment — can be left blank"
                              />
                            </div>
                            <Button type="button" variant="outline" size="sm" className="h-8" onClick={addInterestCategory}>
                              Add
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              <aside className="space-y-3 rounded-xl border bg-muted/20 p-3 h-fit">
                <Button
                  type="button"
                  className="w-full h-8 text-xs"
                  variant={needsInterest ? "default" : "outline"}
                  style={needsInterest ? { backgroundColor: primaryColor, color: 'white' } : undefined}
                  onClick={() => setShowInterest(true)}
                >
                  <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
                  Product of interest
                </Button>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Optional. Fill this if the client was interested or you noted a need. Choose a category, not a product.
                </p>
                {showInterest || interestCategories.length > 0 ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Category (optional)</Label>
                      <Select value={form.interestCategoryId} onValueChange={(v) => setForm((c) => ({ ...c, interestCategoryId: v }))}>
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category._id} value={category._id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Need / side note (optional)</Label>
                      <Input
                        className="h-8 text-xs bg-white"
                        value={form.interestNote}
                        onChange={(e) => setForm((c) => ({ ...c, interestNote: e.target.value }))}
                        placeholder="Need, quantity, or comment — can be left blank"
                      />
                    </div>
                    <Button type="button" size="sm" className="w-full h-8 text-xs" variant="outline" onClick={addInterestCategory}>
                      Add category
                    </Button>
                    {interestCategories.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {interestCategories.map((item) => (
                          <div
                            key={item.categoryId}
                            className="flex items-start justify-between gap-2 rounded-lg border bg-white px-2.5 py-2 text-xs shadow-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{item.categoryName}</p>
                              {item.note ? <p className="text-muted-foreground truncate mt-0.5">{item.note}</p> : null}
                            </div>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() =>
                                setInterestCategories((current) =>
                                  current.filter((row) => row.categoryId !== item.categoryId),
                                )
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        {categories.length === 0
                          ? "No stock categories yet. Ask admin to add categories first."
                          : "No categories added yet."}
                      </p>
                    )}
                  </div>
                ) : null}
              </aside>
            </div>

            </fieldset>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {clientSaved ? (
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => void saveFacilityContact()} disabled={saving || reportLocked}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add contact people
                </Button>
              ) : null}
              <Button 
                size="sm" 
                className="min-h-11 text-white hover:opacity-90" 
                style={{ backgroundColor: primaryColor }}
                onClick={() => void logVisit()} 
                disabled={saving || matching || reportLocked}
              >
                {saving ? <Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                {existingVisit ? "Update visit report" : "Save visit report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 4: Visits List */}
      {selectedPlanner ? (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: primaryColor }} />
              Visits on {dateLabel(selectedPlanner.date)} ({visits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {visits.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No visit reports for this date yet.</div>
            ) : (
              visits.map((visit) => (
                <div key={visit._id} className="p-3 hover:bg-muted/20 transition-colors">
                  <div className="flex justify-between gap-2 items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{visit.clientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {visit.personMet
                          ? `${visit.personMet}${visit.personRole ? ` · ${visit.personRole}` : ""}`
                          : visit.purpose || "—"}
                        {visit.outcome ? ` · ${visit.outcome}` : ""}
                        {visit.outcomeDetail ? ` · ${visit.outcomeDetail}` : ""}
                        {visit.personPhone ? ` · ${visit.personPhone}` : ""}
                      </p>
                      {(visit.interestCategories || []).length > 0 ? (
                        <p className="mt-1.5 text-[11px] font-medium" style={{ color: primaryColor }}>
                          Interest:{" "}
                          {visit.interestCategories
                            .map((item: any) =>
                              item.note ? `${item.categoryName} (${item.note})` : item.categoryName,
                            )
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${visit.status === "unlocked" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>
                        {visit.status === "unlocked" ? "Unlocked" : "Locked"}
                      </Badge>
                      {visit.checkInAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(visit.checkInAt).toLocaleTimeString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </SalesPage>
  )
}