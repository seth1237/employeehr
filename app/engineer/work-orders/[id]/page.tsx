"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { engineeringApi } from "@/lib/api"
import API_URL from "@/lib/apiBase"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Check, Plus, Trash2 } from "lucide-react"
import { useEngineerBranding } from "@/components/engineer/branding"
import {
  EngineerHeader,
  EngineerPage,
  EngineerStatusBadge,
  formatWhen,
} from "@/components/engineer/engineer-ui"

const ATTENDANT_ROLES = [
  "Attendant",
  "Lab Technician",
  "Nurse",
  "Doctor",
  "Facility Manager",
  "Director",
  "Reception",
  "Other",
]

function photoSrc(url?: string) {
  if (!url) return ""
  return url.startsWith("http") ? url : `${API_URL}${url}`
}

type CostLine = { purpose: string; amount: string }

function seedCostLines(data: any): CostLine[] {
  const lines = Array.isArray(data?.costLines) ? data.costLines : []
  if (lines.length > 0) {
    return lines.map((line: any) => ({
      purpose: String(line?.purpose || ""),
      amount: line?.amount != null && line.amount !== "" ? String(line.amount) : "",
    }))
  }
  if (data?.cost) {
    return [{ purpose: "Job cost", amount: String(data.cost) }]
  }
  return [{ purpose: "", amount: "" }]
}

function preparedCostLines(lines: CostLine[]) {
  return lines
    .map((line) => ({
      purpose: line.purpose.trim(),
      amount: Number(line.amount || 0) || 0,
    }))
    .filter((line) => line.purpose || line.amount)
}

function CostLinesEditor({
  lines,
  onChange,
  disabled,
}: {
  lines: CostLine[]
  onChange: (next: CostLine[]) => void
  disabled?: boolean
}) {
  const total = lines.reduce((sum, line) => sum + (Number(line.amount || 0) || 0), 0)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Labour / job cost</Label>
        <p className="text-sm font-semibold tabular-nums">{total.toLocaleString()}</p>
      </div>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={`cost-${index}`} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-end gap-2">
            <div>
              {index === 0 ? <Label className="text-xs text-muted-foreground">Cost purpose</Label> : null}
              <Input
                className="mt-1"
                placeholder="e.g. Labour, transport"
                value={line.purpose}
                disabled={disabled}
                onChange={(e) =>
                  onChange(lines.map((row, rowIndex) => (rowIndex === index ? { ...row, purpose: e.target.value } : row)))
                }
              />
            </div>
            <div>
              {index === 0 ? <Label className="text-xs text-muted-foreground">Amount</Label> : null}
              <Input
                className="mt-1"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={line.amount}
                disabled={disabled}
                onChange={(e) =>
                  onChange(lines.map((row, rowIndex) => (rowIndex === index ? { ...row, amount: e.target.value } : row)))
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 h-8 w-8 shrink-0"
              disabled={disabled || lines.length <= 1}
              onClick={() => onChange(lines.filter((_, rowIndex) => rowIndex !== index))}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove cost line</span>
            </Button>
          </div>
        ))}
      </div>
      {!disabled ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onChange([...lines, { purpose: "", amount: "" }])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add cost
        </Button>
      ) : null}
    </div>
  )
}

function WorkflowStepper({
  started,
  completed,
  startedAt,
  completedAt,
  color,
}: {
  started: boolean
  completed: boolean
  startedAt?: string
  completedAt?: string
  color: string
}) {
  const steps = [
    { id: "assigned", label: "Assigned", done: true, detail: "Job is on your list" },
    {
      id: "started",
      label: "Work started",
      done: started,
      detail: startedAt ? formatWhen(startedAt) : "Tap Start work when you begin",
    },
    {
      id: "completed",
      label: "Work complete",
      done: completed,
      detail: completedAt ? formatWhen(completedAt) : started ? "Fill the job card, then complete" : "Start work first",
    },
  ]
  return (
    <ol className="grid grid-cols-3 gap-1 sm:gap-3">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="rounded-lg border px-2 py-2 sm:px-3"
          style={
            step.done
              ? { borderColor: color, backgroundColor: `${color}14` }
              : undefined
          }
        >
          <div className="flex items-center gap-1.5">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: step.done ? color : "#94a3b8" }}
            >
              {step.done ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <p className="truncate text-[11px] font-semibold sm:text-sm">{step.label}</p>
          </div>
          <p className="mt-1 text-[10px] leading-tight text-slate-500 sm:text-xs">{step.detail}</p>
        </li>
      ))}
    </ol>
  )
}

export default function WorkOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const branding = useEngineerBranding()
  const id = String(params?.id || "")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [row, setRow] = useState<any>(null)
  const [notes, setNotes] = useState("")
  const [costLines, setCostLines] = useState<CostLine[]>([{ purpose: "", amount: "" }])
  const [downtime, setDowntime] = useState("")
  const [checklist, setChecklist] = useState<Array<{ item: string; done?: boolean; note?: string }>>([])
  const [newItem, setNewItem] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [attendant, setAttendant] = useState("")
  const [attendantRole, setAttendantRole] = useState("Attendant")
  const [attendantNumber, setAttendantNumber] = useState("")
  const [jobCardFile, setJobCardFile] = useState<File | null>(null)
  const [jobCardPreview, setJobCardPreview] = useState("")
  const [machineOkay, setMachineOkay] = useState<"" | "yes" | "no">("")

  const load = () => {
    if (!id) return
    setLoading(true)
    engineeringApi
      .getWorkOrder(id)
      .then((res) => {
        const data = res.data || res
        setRow(data)
        setNotes(data.notes || "")
        setCostLines(seedCostLines(data))
        setDowntime(data.downtimeMinutes != null ? String(data.downtimeMinutes) : "")
        setChecklist(Array.isArray(data.checklist) ? data.checklist : [])
        setSerialNumber(data.machine?.serialNumber || "")
        setAttendant(data.machine?.attendant || "")
        setAttendantRole(data.machine?.attendantRole || "Attendant")
        setAttendantNumber(data.machine?.attendantNumber || "")
        setMachineOkay(data.machineOkay === true ? "yes" : data.machineOkay === false ? "no" : "")
      })
      .catch((error) => {
        toast({ title: "Could not load job", description: error?.message, variant: "destructive" })
        router.push("/engineer/work-orders")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (!jobCardFile) {
      setJobCardPreview("")
      return
    }
    const url = URL.createObjectURL(jobCardFile)
    setJobCardPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [jobCardFile])

  const isInstallation =
    row?.type === "installation" || /install/i.test(String(row?.serviceType || ""))
  const isComplete = row?.status === "completed"
  const isStarted = Boolean(row?.startedAt) || row?.status === "in_progress" || isComplete
  const existingPhoto = row?.machine?.photoUrl || (row?.attachments || [])[0]

  const costPayload = () => {
    const lines = preparedCostLines(costLines)
    const total = lines.reduce((sum, line) => sum + line.amount, 0)
    return { costLines: lines, cost: total }
  }

  const save = async (extra: Record<string, unknown> = {}) => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        notes,
        checklist,
        ...costPayload(),
        ...extra,
      }
      if (isInstallation) {
        if (machineOkay === "yes" || machineOkay === "no") {
          payload.machineOkay = machineOkay === "yes"
        }
      } else {
        payload.downtimeMinutes = Number(downtime || 0)
      }
      const res = await engineeringApi.updateWorkOrder(id, payload)
      setRow(res.data || row)
      toast({ title: "Work order saved" })
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const start = async () => {
    setSaving(true)
    try {
      const res = await engineeringApi.startWorkOrder(id, { notes })
      setRow(res.data)
      toast({
        title: "Work started",
        description: "Admin can now see this job is in progress.",
      })
    } catch (error: any) {
      toast({ title: "Could not start", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const complete = async () => {
    if (!isStarted) {
      toast({
        title: "Start work first",
        description: "Tap Start work when you begin, then complete it when finished.",
        variant: "destructive",
      })
      return
    }
    if (isInstallation) {
      if (!serialNumber.trim()) {
        toast({ title: "Serial number required", description: "Enter the machine S/N before completing.", variant: "destructive" })
        return
      }
      if (!attendant.trim()) {
        toast({ title: "Person in charge required", description: "Enter who was left in charge of the machine.", variant: "destructive" })
        return
      }
      if (!jobCardFile && !existingPhoto) {
        toast({ title: "Job card photo required", description: "Take a photo of the job card and upload it.", variant: "destructive" })
        return
      }
      if (machineOkay !== "yes" && machineOkay !== "no") {
        toast({
          title: "Machine status required",
          description: "Select whether the machine is okay after installation.",
          variant: "destructive",
        })
        return
      }
    }
    setSaving(true)
    try {
      const payload = isInstallation
        ? {
            notes,
            serialNumber: serialNumber.trim(),
            attendant: attendant.trim(),
            attendantRole: attendantRole.trim() || "Attendant",
            attendantNumber: attendantNumber.trim(),
            machineOkay: machineOkay === "yes",
            ...costPayload(),
          }
        : {
            notes,
            downtimeMinutes: Number(downtime || 0),
            checklist,
            ...costPayload(),
          }
      const res = await engineeringApi.completeWorkOrder(id, payload, jobCardFile)
      setRow(res.data)
      setJobCardFile(null)
      toast({
        title: isInstallation ? "Installation completed" : "Work complete",
        description: "Admin can see the job as completed.",
      })
    } catch (error: any) {
      toast({ title: "Could not complete", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const previewSrc = useMemo(() => {
    if (jobCardPreview) return jobCardPreview
    if (existingPhoto) return photoSrc(existingPhoto)
    return ""
  }, [jobCardPreview, existingPhoto])

  if (loading || !row) return <PageLoadingSkeleton title="Work order" />

  const covered = (row.contracts || []).filter((contract: any) => {
    if (!contract.endDate) return true
    return new Date(contract.endDate) >= new Date()
  })

  const actionButton = isComplete ? null : !isStarted ? (
    <Button
      disabled={saving}
      className="h-9 w-full text-white sm:w-auto"
      style={{ backgroundColor: branding.primaryColor }}
      onClick={() => void start()}
    >
      Start work
    </Button>
  ) : (
    <Button
      disabled={saving}
      className="h-9 w-full text-white sm:w-auto"
      style={{ backgroundColor: branding.primaryColor }}
      onClick={() => void complete()}
    >
      {isInstallation ? "Complete installation" : "Complete work"}
    </Button>
  )

  return (
    <EngineerPage>
      <EngineerHeader
        eyebrow={row.woNumber || "Work order"}
        title={isInstallation ? "Installation" : row.serviceType || "Job card"}
        description={`${row.machine?.productName || "Machine"} · ${row.machine?.client?.name || "No client"}`}
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <EngineerStatusBadge status={row.status} />
            {actionButton}
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <EngineerStatusBadge status={row.status} />
            <Link href="/engineer/work-orders" className="text-xs font-medium" style={{ color: branding.primaryColor }}>
              All jobs
            </Link>
          </div>
          <WorkflowStepper
            started={isStarted}
            completed={isComplete}
            startedAt={row.startedAt}
            completedAt={row.completedDate}
            color={branding.primaryColor}
          />
          <p className="text-xs text-muted-foreground">
            {isComplete
              ? "This job is closed. Admin can see the start and complete times."
              : isStarted
                ? "Work is in progress. Complete it when you finish so admin sees the update."
                : "Start work when you arrive. Complete work when the job is done."}
          </p>
        </CardContent>
      </Card>

      {covered.length > 0 ? (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: branding.primaryBorder, backgroundColor: branding.primarySoft, color: branding.primaryColor }}
        >
          Covered by {covered[0].type?.toUpperCase()} — {covered[0].vendorName}
          {covered[0].endDate ? ` until ${new Date(covered[0].endDate).toLocaleDateString()}` : ""}.
        </div>
      ) : row.machine?.warrantyUntil ? (
        <div className="rounded-md border bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Warranty until {new Date(row.machine.warrantyUntil).toLocaleDateString()}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {isInstallation ? (
            <Card>
              <CardHeader className="px-4 py-3 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Installation details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:p-6 sm:pt-0">
                <p className="text-sm text-muted-foreground">
                  After the visit, record the machine serial number, the person left in
                  charge, and a photo of the job card.
                </p>
                <div>
                  <Label>Machine S/N Number</Label>
                  <Input
                    className="mt-1"
                    value={serialNumber}
                    disabled={isComplete}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Serial number on the machine"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Person left in charge</Label>
                    <Input
                      className="mt-1"
                      value={attendant}
                      disabled={isComplete}
                      onChange={(e) => setAttendant(e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <select
                      className="mt-1 h-9 w-full rounded border px-3 text-sm"
                      value={attendantRole}
                      disabled={isComplete}
                      onChange={(e) => setAttendantRole(e.target.value)}
                    >
                      {ATTENDANT_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      className="mt-1"
                      value={attendantNumber}
                      disabled={isComplete}
                      onChange={(e) => setAttendantNumber(e.target.value)}
                      placeholder="+254 700 000000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Job card photo</Label>
                  {!isComplete ? (
                    <Input
                      className="mt-1"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setJobCardFile(e.target.files?.[0] || null)}
                    />
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                  Take a clear photo of the signed job card.
                </p>
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Job card"
                      className="mt-3 max-h-72 w-full rounded-md border object-contain bg-slate-50"
                    />
                  ) : null}
                </div>
                <fieldset className="space-y-2" disabled={isComplete}>
                  <legend className="text-sm font-medium">Is the machine okay after installation?</legend>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="machineOkay"
                      value="yes"
                      checked={machineOkay === "yes"}
                      onChange={() => setMachineOkay("yes")}
                    />
                    Yes, the machine is okay
                  </label>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="machineOkay"
                      value="no"
                      checked={machineOkay === "no"}
                      onChange={() => setMachineOkay("no")}
                    />
                    No, it needs attention
                  </label>
                </fieldset>
                <div>
                  <Label>Notes</Label>
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                    value={notes}
                    disabled={isComplete}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <CostLinesEditor lines={costLines} onChange={setCostLines} disabled={isComplete} />
                {!isComplete ? (
                  <Button variant="outline" size="sm" className="h-8" disabled={saving} onClick={() => void save()}>
                    Save notes
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="px-4 py-3 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Job card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:p-6 sm:pt-0">
                <div>
                  <Label>Notes</Label>
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                    value={notes}
                    disabled={isComplete}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <CostLinesEditor lines={costLines} onChange={setCostLines} disabled={isComplete} />
                <div>
                  <Label>Service downtime (minutes)</Label>
                  <Input type="number" min="0" value={downtime} disabled={isComplete} onChange={(e) => setDowntime(e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    How long the machine was down for this service visit.
                  </p>
                </div>
                <div>
                  <Label>Checklist</Label>
                  <div className="mt-2 space-y-2">
                    {checklist.map((item, index) => (
                      <label key={`${item.item}-${index}`} className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                        <Checkbox
                          checked={Boolean(item.done)}
                          disabled={isComplete}
                          onCheckedChange={(checked) =>
                            setChecklist((prev) =>
                              prev.map((entry, rowIndex) =>
                                rowIndex === index ? { ...entry, done: Boolean(checked) } : entry,
                              ),
                            )
                          }
                        />
                        <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.item}</span>
                      </label>
                    ))}
                    {!isComplete ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add checklist item"
                          value={newItem}
                          onChange={(e) => setNewItem(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={() => {
                            if (!newItem.trim()) return
                            setChecklist((prev) => [...prev, { item: newItem.trim(), done: false }])
                            setNewItem("")
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
                {!isComplete ? (
                  <Button variant="outline" size="sm" className="h-8" disabled={saving} onClick={() => void save()}>
                    Save job card
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="px-4 py-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Asset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-4 pb-4 text-sm sm:p-6 sm:pt-0">
              <p className="font-medium">{row.machine?.productName || "—"}</p>
              <p className="text-muted-foreground">{row.machine?.client?.name || "No client"}</p>
              {row.machine?.client?.contactPerson ? <p>Contact {row.machine.client.contactPerson}</p> : null}
              {row.machine?.installationLocation ? <p>{row.machine.installationLocation}</p> : null}
              {serialNumber || row.machine?.serialNumber ? (
                <p>SN {serialNumber || row.machine?.serialNumber}</p>
              ) : null}
              {row.machine?.assetTag ? <p>Tag {row.machine.assetTag}</p> : null}
              {row.machine?._id ? (
                <Button asChild size="sm" variant="outline" className="mt-2 h-8">
                  <Link href={`/engineer/machines?machineId=${row.machine._id}`}>Open register</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-4 py-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 text-sm sm:p-6 sm:pt-0">
              <p>
                <span className="text-muted-foreground">Assigned · </span>
                {formatWhen(row.scheduledDate || row.createdAt) || "Unscheduled"}
              </p>
              <p>
                <span className="text-muted-foreground">Started · </span>
                {isStarted ? formatWhen(row.startedAt) || "In progress" : "Not started"}
              </p>
              <p>
                <span className="text-muted-foreground">Completed · </span>
                {isComplete ? formatWhen(row.completedDate) || "Done" : "Open"}
              </p>
              {isInstallation && (machineOkay === "yes" || machineOkay === "no") ? (
                <p>
                  <span className="text-muted-foreground">After install · </span>
                  {machineOkay === "yes" ? "Machine okay" : "Needs attention"}
                </p>
              ) : null}
            </CardContent>
          </Card>
          {row.request ? (
            <Card>
              <CardHeader className="px-4 py-3 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Source request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-4 pb-4 text-sm sm:p-6 sm:pt-0">
                <p className="font-medium">{row.request.title}</p>
                <p className="text-muted-foreground">{row.request.description}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {!isComplete ? (
        <>
          <div className="h-16 sm:hidden" aria-hidden />
          <div
            className="fixed inset-x-0 z-30 border-t bg-white px-3 py-2 sm:hidden"
            style={{ bottom: "calc(3rem + env(safe-area-inset-bottom))" }}
          >
            {actionButton}
          </div>
        </>
      ) : null}
    </EngineerPage>
  )
}
