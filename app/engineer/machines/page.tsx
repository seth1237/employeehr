"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { engineeringApi, stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { EngineerHeader, EngineerPage, EngineerStatusBadge, formatWhen } from "@/components/engineer/engineer-ui"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Clock, MapPin, Phone, Search, UserRound, Users, Wrench } from "lucide-react"

type Machine = {
  _id: string
  productName: string
  serialNumber?: string
  status?: string
  nextServiceDate?: string
  installationLocation?: string
  installationDate?: string
  installedBy?: string
  notes?: string
  client?: {
    name?: string
    number?: string
    location?: string
    contactPerson?: string
  }
  attendant?: string
  attendantNumber?: string
  attendantRole?: string
}

type ClientRow = {
  key: string
  name: string
  number: string
  location: string
  contactPerson: string
  machines: Machine[]
}

type TimelineEvent = {
  id: string
  kind: "installation" | "service" | "breakdown" | "calibration" | "ticket"
  title: string
  status?: string
  when?: string
  person?: string
  detail?: string
}

function clientKey(machine: Machine) {
  const name = String(machine.client?.name || "").trim().toLowerCase() || "unknown"
  const number = String(machine.client?.number || "").trim().toLowerCase() || "n/a"
  const location = String(machine.client?.location || "").trim().toLowerCase() || "n/a"
  return `${name}|${number}|${location}`
}

function personInCharge(machine: Machine) {
  if (!machine.attendant) return null
  return {
    name: machine.attendant,
    role: machine.attendantRole || "",
    phone: machine.attendantNumber || "",
  }
}

function eventDate(value?: string | Date | null) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function kindLabel(kind: TimelineEvent["kind"]) {
  if (kind === "installation") return "Installation"
  if (kind === "breakdown") return "Breakdown"
  if (kind === "calibration") return "Calibration"
  if (kind === "ticket") return "Fault report"
  return "Service"
}

function buildTimeline(machine: Machine, payload: any): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const orders = (payload?.workOrders || payload?.orders || []) as any[]
  const tickets = (payload?.tickets || []) as any[]
  const calibrations = (payload?.calibrations || []) as any[]

  if (machine.installedBy || machine.installationDate) {
    events.push({
      id: `install-${machine._id}`,
      kind: "installation",
      title: "Machine installed",
      status: "completed",
      when: machine.installationDate,
      person: machine.installedBy,
      detail: machine.installationLocation || machine.notes,
    })
  }

  for (const row of orders) {
    const type = String(row.type || row.serviceType || "").toLowerCase()
    const isInstall = type === "installation" || /install/i.test(String(row.serviceType || ""))
    const isBreakdown =
      type === "corrective" ||
      /breakdown|fault|repair|corrective/i.test(String(row.serviceType || row.failureCode || ""))
    const isCalibration = type === "calibration" || /calibrat/i.test(String(row.serviceType || ""))
    const kind: TimelineEvent["kind"] = isInstall
      ? "installation"
      : isBreakdown
        ? "breakdown"
        : isCalibration
          ? "calibration"
          : "service"
    const parts = Array.isArray(row.parts)
      ? row.parts.map((part: any) => `${part.name}${part.qty ? ` ×${part.qty}` : ""}`).join(", ")
      : ""
    const extra = [
      row.notes,
      row.failureCode ? `Fault: ${row.failureCode}` : "",
      row.causeCode ? `Cause: ${row.causeCode}` : "",
      Number(row.downtimeMinutes || 0) > 0 ? `Downtime ${row.downtimeMinutes} min` : "",
      parts ? `Parts: ${parts}` : "",
      row.machineOkay === false ? "Machine not okay after job" : "",
      row.machineOkay === true ? "Machine okay after job" : "",
    ]
      .filter(Boolean)
      .join(" · ")
    events.push({
      id: String(row._id),
      kind,
      title: row.serviceType || row.woNumber || kindLabel(kind),
      status: row.status || (row.completedDate ? "completed" : row.startedAt ? "in_progress" : "open"),
      when: row.completedDate || row.startedAt || row.scheduledDate || row.createdAt,
      person: row.technician,
      detail: extra,
    })
  }

  for (const row of tickets) {
    events.push({
      id: `ticket-${row._id}`,
      kind: "ticket",
      title: row.title || "Fault report",
      status: row.status,
      when: row.createdAt || row.updatedAt,
      person: row.callerName || row.assignedTechnicianName,
      detail: row.description || row.resolutionNote,
    })
  }

  for (const row of calibrations) {
    events.push({
      id: `cal-${row._id}`,
      kind: "calibration",
      title: row.standard || row.result || "Calibration",
      status: row.result || "completed",
      when: row.performedAt || row.createdAt,
      person: row.performedBy,
      detail: row.notes || row.certificateNumber,
    })
  }

  const seen = new Set<string>()
  return events
    .filter((event) => {
      const stamp = `${event.kind}|${event.title}|${event.when || ""}|${event.person || ""}`
      if (seen.has(stamp)) return false
      seen.add(stamp)
      return true
    })
    .sort((a, b) => eventDate(b.when) - eventDate(a.when))
}

function EngineerMachinesInner() {
  const searchParams = useSearchParams()
  const machineIdFromUrl = searchParams.get("machineId") || ""
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [machines, setMachines] = useState<Machine[]>([])
  const [selected, setSelected] = useState<ClientRow | null>(null)
  const [historyMachine, setHistoryMachine] = useState<Machine | null>(null)
  const [historyEvents, setHistoryEvents] = useState<TimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    stockApi
      .getInstalledMachines()
      .then((res) => setMachines(res.data || []))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [])

  const clients = useMemo(() => {
    const map = new Map<string, ClientRow>()
    for (const machine of machines) {
      const key = clientKey(machine)
      const existing = map.get(key)
      if (existing) {
        existing.machines.push(machine)
        continue
      }
      map.set(key, {
        key,
        name: String(machine.client?.name || "").trim() || "Unknown client",
        number: String(machine.client?.number || "").trim(),
        location: String(machine.client?.location || machine.installationLocation || "").trim(),
        contactPerson: String(machine.client?.contactPerson || "").trim(),
        machines: [machine],
      })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [machines])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.number,
        client.location,
        client.contactPerson,
        ...client.machines.flatMap((machine) => [
          machine.productName,
          machine.serialNumber,
          machine.attendant,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [clients, search])

  useEffect(() => {
    if (!machineIdFromUrl || clients.length === 0) return
    const match = clients.find((client) =>
      client.machines.some((machine) => String(machine._id) === machineIdFromUrl),
    )
    if (match) setSelected(match)
  }, [machineIdFromUrl, clients])

  const openHistory = async (machine: Machine) => {
    setHistoryMachine(machine)
    setHistoryLoading(true)
    setHistoryEvents(buildTimeline(machine, null))
    try {
      const res = await engineeringApi.getAssetHistory(machine._id)
      setHistoryEvents(buildTimeline(machine, res.data || res))
    } catch (error) {
      console.error(error)
      setHistoryEvents(buildTimeline(machine, null))
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeClient = (open: boolean) => {
    if (open) return
    setSelected(null)
    setHistoryMachine(null)
    setHistoryEvents([])
  }

  if (loading) return <PageLoadingSkeleton title="Machines" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Machines"
        description="Search a client, then open machine history for services, installation, and breakdowns."
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, location, phone, or machine"
          className="h-11 bg-white pl-9"
          aria-label="Search machines"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {search.trim() ? "No clients match that search." : "No clients with installed machines yet."}
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((client) => (
              <li key={client.key}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => setSelected(client)}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{client.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {client.location ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{client.location}</span>
                        </span>
                      ) : null}
                      {client.number ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {client.number}
                        </span>
                      ) : null}
                      <span>
                        {client.machines.length} machine{client.machines.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={closeClient}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-2xl max-md:max-h-[88vh] max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          {historyMachine ? (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">
                  <button
                    type="button"
                    className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-slate-600"
                    onClick={() => {
                      setHistoryMachine(null)
                      setHistoryEvents([])
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <span className="block">{historyMachine.productName}</span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                {[
                  historyMachine.serialNumber ? `SN ${historyMachine.serialNumber}` : "",
                  selected?.name,
                  historyMachine.installationLocation || selected?.location,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>

              <div className="rounded-md border bg-slate-50 p-2.5 text-sm">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  Person in charge
                </p>
                {personInCharge(historyMachine) ? (
                  <p className="mt-1 font-medium">
                    {personInCharge(historyMachine)?.name}
                    {personInCharge(historyMachine)?.role
                      ? ` · ${personInCharge(historyMachine)?.role}`
                      : ""}
                    {personInCharge(historyMachine)?.phone
                      ? ` · ${personInCharge(historyMachine)?.phone}`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">No person in charge recorded.</p>
                )}
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Installed by
                </p>
                <p className="mt-1">
                  {historyMachine.installedBy || "Not recorded"}
                  {historyMachine.installationDate
                    ? ` · ${new Date(historyMachine.installationDate).toLocaleDateString()}`
                    : ""}
                </p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Machine history
                </p>
                {historyLoading ? (
                  <p className="mt-3 text-sm text-muted-foreground">Loading history…</p>
                ) : historyEvents.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No services, breakdowns, or installation records yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {historyEvents.map((event) => (
                      <li key={event.id} className="rounded-md border px-3 py-2.5 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {kindLabel(event.kind)}
                            </p>
                            <p className="font-medium">{event.title}</p>
                          </div>
                          {event.status ? <EngineerStatusBadge status={event.status} /> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[event.person, formatWhen(event.when)].filter(Boolean).join(" · ")}
                        </p>
                        {event.detail ? (
                          <p className="mt-1 text-xs text-slate-600">{event.detail}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Location</p>
                    <p>{selected.location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Phone</p>
                    {selected.number ? (
                      <a href={`tel:${selected.number}`} className="font-medium hover:underline">
                        {selected.number}
                      </a>
                    ) : (
                      <p>—</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selected.machines.map((machine) => {
                  const charge = personInCharge(machine)
                  return (
                    <div key={machine._id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{machine.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              machine.serialNumber ? `SN ${machine.serialNumber}` : "",
                              machine.installationLocation || selected.location,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <EngineerStatusBadge status={machine.status || "active"} />
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        {charge
                          ? `In charge: ${charge.name}${charge.role ? ` · ${charge.role}` : ""}`
                          : "No person in charge recorded"}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 h-8"
                        onClick={() => void openHistory(machine)}
                      >
                        <Wrench className="mr-1.5 h-3.5 w-3.5" />
                        Machine history
                      </Button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </EngineerPage>
  )
}

export default function EngineerMachinesPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Machines" />}>
      <EngineerMachinesInner />
    </Suspense>
  )
}
