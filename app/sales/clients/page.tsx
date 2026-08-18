"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookUser,
  MapPin,
  PhoneCall,
  Plus,
  Search,
  StickyNote,
} from "lucide-react"
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

function telHref(phone?: string) {
  const raw = String(phone || "").trim()
  if (!raw) return ""
  const digits = raw.replace(/[^\d+]/g, "")
  return digits ? `tel:${digits}` : ""
}

function formatWhen(value?: string | Date) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString()
}

export default function SalesClientsPage() {
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"created" | "engaged">("created")
  const [created, setCreated] = useState<any[]>([])
  const [engaged, setEngaged] = useState<any[]>([])
  const [directory, setDirectory] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [book, setBook] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: "",
    number: "",
    location: "",
    contactPerson: "",
    contactPersonRole: "Doctor",
    contactPersonCustomRole: "",
  })
  const [contactRoles, setContactRoles] = useState<string[]>(DEFAULT_ROLES)
  const [countyOptions, setCountyOptions] = useState<string[]>(KENYA_COUNTIES)
  const [callForm, setCallForm] = useState({
    type: "call",
    outcome: "answered",
    purpose: "",
    notes: "",
    followUpDate: "",
  })

  const loadBook = useCallback(
    async (search?: string) => {
      try {
        const res = await salesApi.listMyClients(search)
        setCreated(res.data?.created || [])
        setEngaged(res.data?.engaged || [])
      } catch (error: any) {
        toast({ title: "Could not load clients", description: error?.message, variant: "destructive" })
      }
    },
    [toast],
  )

  useEffect(() => {
    void loadBook()
  }, [loadBook])

  useEffect(() => {
    void salesApi
      .getClientOptions()
      .then((res) => {
        const roles = [...(res.data?.roles?.length ? res.data.roles : DEFAULT_ROLES)]
        if (!roles.includes("Other")) roles.push("Other")
        setContactRoles(roles)
        const counties = Array.from(
          new Set([...(res.data?.counties || []), ...KENYA_COUNTIES]),
        ).sort((a, b) => a.localeCompare(b))
        setCountyOptions(counties)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadBook(query.trim() || undefined)
    }, 250)
    return () => clearTimeout(handle)
  }, [query, loadBook])

  useEffect(() => {
    if (query.trim().length < 2) {
      setDirectory([])
      return
    }
    const handle = setTimeout(() => {
      void salesApi.searchClients(query).then((res) => setDirectory(res.data || []))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  const openClient = useCallback(
    async (id: string) => {
      setSelectedId(id)
      try {
        const res = await salesApi.getClientBook(id)
        setBook(res.data)
      } catch (error: any) {
        toast({ title: "Could not open client", description: error?.message, variant: "destructive" })
      }
    },
    [toast],
  )

  const list = tab === "created" ? created : engaged
  const selected = book?.client

  const createClient = async () => {
    const name = form.name.trim()
    const number = form.number.trim()
    const location = form.location.trim()
    const contactPerson = form.contactPerson.trim()
    const contactPersonRole =
      form.contactPersonRole === "Other"
        ? form.contactPersonCustomRole.trim()
        : form.contactPersonRole.trim()
    if (!name || !number || !location) {
      toast({ title: "Client name, phone number, and county are required", variant: "destructive" })
      return
    }
    if (contactPerson && !contactPersonRole) {
      toast({
        title: "Select a role for the contact person, or leave the name blank",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const res = await salesApi.createClient({
        sourceName: name,
        sourceNumber: number,
        sourceLocation: location,
        name,
        phone: number,
        location,
        legalName: name,
        contactPerson: contactPerson || undefined,
        contactPersonRole: contactPersonRole || undefined,
        contactPersonCustomRole: form.contactPersonCustomRole,
      })
      toast({ title: res.message || "Client saved" })
      setShowCreate(false)
      setForm({
        name: "",
        number: "",
        location: "",
        contactPerson: "",
        contactPersonRole: "Doctor",
        contactPersonCustomRole: "",
      })
      await loadBook()
      if (res.data?._id) void openClient(res.data._id)
    } catch (error: any) {
      toast({ title: "Could not create client", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const logActivity = async () => {
    if (!selected?._id) return
    setSaving(true)
    try {
      await salesApi.logClientActivity(selected._id, {
        type: callForm.type,
        outcome: callForm.type === "note" ? undefined : callForm.outcome,
        purpose: callForm.purpose,
        notes: callForm.notes,
        followUpDate: callForm.followUpDate || undefined,
        clientName: selected.name,
        clientPhone: selected.phone,
        customer_id: selected._id,
      })
      toast({ title: callForm.type === "call" ? "Call logged" : "Activity saved" })
      setCallForm((c) => ({ ...c, notes: "", purpose: "" }))
      await openClient(selected._id)
      void loadBook()
    } catch (error: any) {
      toast({ title: "Could not log activity", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const knownIds = useMemo(() => new Set([...created, ...engaged].map((c) => c._id)), [created, engaged])
  const directoryExtras = directory.filter((c) => !knownIds.has(c._id))

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clients book</h1>
          <p className="text-sm text-muted-foreground">
            Your clients, their activity, and one-tap calling. Company directory search is also available.
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New client
        </Button>
      </div>

      {showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Client Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Client Number</Label>
                <Input
                  value={form.number}
                  onChange={(e) => setForm((c) => ({ ...c, number: e.target.value }))}
                  placeholder="Phone"
                />
              </div>
              <div className="space-y-1">
                <Label>County</Label>
                <Input
                  list="sales-county-options"
                  value={form.location}
                  onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
                  placeholder="e.g. Kakamega"
                />
                <datalist id="sales-county-options">
                  {countyOptions.map((county) => (
                    <option key={county} value={county} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  County becomes the client group name automatically.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Contact Person (optional)</Label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) => setForm((c) => ({ ...c, contactPerson: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Contact Person Role</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.contactPersonRole}
                  onChange={(e) => setForm((c) => ({ ...c, contactPersonRole: e.target.value }))}
                >
                  {contactRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              {form.contactPersonRole === "Other" ? (
                <div className="space-y-1">
                  <Label>Custom role</Label>
                  <Input
                    value={form.contactPersonCustomRole}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, contactPersonCustomRole: e.target.value }))
                    }
                    placeholder="e.g. Biomedical Engineer"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void createClient()} disabled={saving}>
                {saving ? "Saving..." : "Save Client"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search my book or company directory"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={tab === "created" ? "default" : "outline"} onClick={() => setTab("created")}>
                Created ({created.length})
              </Button>
              <Button size="sm" variant={tab === "engaged" ? "default" : "outline"} onClick={() => setTab("engaged")}>
                Contacted ({engaged.length})
              </Button>
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto">
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {tab === "created" ? "No clients created yet." : "No other clients contacted yet."}
                </p>
              ) : (
                list.map((client) => (
                  <button
                    key={client._id}
                    type="button"
                    onClick={() => void openClient(client._id)}
                    className={`w-full rounded-lg border p-3 text-left ${
                      selectedId === client._id ? "border-teal-600 bg-teal-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.phone} {client.location ? `· ${client.location}` : ""}
                    </p>
                  </button>
                ))
              )}
              {directoryExtras.length > 0 ? (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Company directory</p>
                  {directoryExtras.map((client) => (
                    <button
                      key={client._id}
                      type="button"
                      onClick={() => void openClient(client._id)}
                      className="mb-2 w-full rounded-lg border border-dashed p-3 text-left hover:bg-slate-50"
                    >
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {!selected ? (
          <Card>
            <CardContent className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <BookUser className="h-8 w-8" />
              Select a client to see activity and call them.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span>{selected.name}</span>
                  <div className="flex gap-2">
                    {selected.mine ? <Badge variant="outline">Created by you</Badge> : <Badge variant="secondary">Directory</Badge>}
                    {telHref(selected.phone) ? (
                      <Button asChild size="sm">
                        <a href={telHref(selected.phone)}>
                          <PhoneCall className="mr-1.5 h-4 w-4" />
                          Call
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />
                  {selected.phone || "No phone"}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {selected.location || "No location"}
                </p>
                {selected.contactPerson ? <p>Contact: {selected.contactPerson}</p> : null}
                {selected.email ? <p>{selected.email}</p> : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/sales/quotes?client=${encodeURIComponent(selected.name)}&phone=${encodeURIComponent(selected.phone || "")}&id=${selected._id}`}>
                      New quote
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/sales/report">Log a visit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Log a call or note</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={callForm.type}
                    onChange={(e) => setCallForm((c) => ({ ...c, type: e.target.value }))}
                  >
                    <option value="call">Call</option>
                    <option value="note">Note</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                </div>
                {callForm.type !== "note" ? (
                  <div className="space-y-1">
                    <Label>Outcome</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={callForm.outcome}
                      onChange={(e) => setCallForm((c) => ({ ...c, outcome: e.target.value }))}
                    >
                      <option value="answered">Answered</option>
                      <option value="no_answer">No answer</option>
                      <option value="busy">Busy</option>
                      <option value="voicemail">Voicemail</option>
                      <option value="quote requested">Quote requested</option>
                      <option value="follow-up needed">Follow-up needed</option>
                      <option value="no interest">No interest</option>
                      <option value="information only">Information only</option>
                    </select>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label>Purpose</Label>
                  <Input
                    value={callForm.purpose}
                    onChange={(e) => setCallForm((c) => ({ ...c, purpose: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Next follow-up</Label>
                  <Input
                    type="date"
                    value={callForm.followUpDate}
                    onChange={(e) => setCallForm((c) => ({ ...c, followUpDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={callForm.notes}
                    onChange={(e) => setCallForm((c) => ({ ...c, notes: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={() => void logActivity()} disabled={saving}>
                    <StickyNote className="mr-1.5 h-4 w-4" />
                    Save activity
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(book?.timeline || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet. Call them or log a visit.</p>
                ) : (
                  book.timeline.map((item: any) => (
                    <div key={`${item.kind}-${item._id}`} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{item.title}</span>
                        <Badge variant="outline">{item.kind}</Badge>
                      </div>
                      {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
                      {item.notes ? <p className="mt-1 text-xs">{item.notes}</p> : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatWhen(item.at)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
