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
import { Trash2 } from "lucide-react"
import { useEngineerBranding } from "@/components/engineer/branding"
import {
  EngineerHeader,
  EngineerPage,
  EngineerStatusBadge,
  formatWhen,
} from "@/components/engineer/engineer-ui"
import { cn } from "@/lib/utils"

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
        <Label>Job cost</Label>
        <p className="text-sm font-semibold tabular-nums">{total.toLocaleString()}</p>
      </div>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={`cost-${index}`} className="flex items-center gap-2">
            <Input
              className="min-w-0 flex-1"
              placeholder="Labour, transport…"
              value={line.purpose}
              disabled={disabled}
              onChange={(e) =>
                onChange(lines.map((row, rowIndex) => (rowIndex === index ? { ...row, purpose: e.target.value } : row)))
              }
            />
            <Input
              className="w-24 shrink-0"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={line.amount}
              disabled={disabled}
              onChange={(e) =>
                onChange(lines.map((row, rowIndex) => (rowIndex === index ? { ...row, amount: e.target.value } : row)))
              }
            />
            {!disabled && lines.length > 1 ? (
              <button
                type="button"
                className="shrink-0 p-1 text-slate-400"
                onClick={() => onChange(lines.filter((_, rowIndex) => rowIndex !== index))}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {!disabled ? (
        <button
          type="button"
          className="text-xs font-medium"
          onClick={() => onChange([...lines, { purpose: "", amount: "" }])}
        >
          + Add cost
        </button>
      ) : null}
    </div>
  )
}

function ProgressStrip({
  started,
  completed,
  color,
}: {
  started: boolean
  completed: boolean
  color: string
}) {
  const steps = ["Assigned", "Started", "Done"]
  const current = completed ? 2 : started ? 1 : 0
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((label, index) => {
        const done = index <= current
        return (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: done ? color : "#e2e8f0" }}
            />
            <span className={cn("hidden text-[10px] font-medium sm:inline", done ? "text-slate-800" : "text-slate-400")}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
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
      toast({ title: "Saved" })
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
      toast({ title: "Work started" })
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
        description: "Start when you arrive, then complete when finished.",
        variant: "destructive",
      })
      return
    }
    if (isInstallation) {
      if (!serialNumber.trim()) {
        toast({ title: "Serial number required", variant: "destructive" })
        return
      }
      if (!attendant.trim()) {
        toast({ title: "Person in charge required", variant: "destructive" })
        return
      }
      if (!jobCardFile && !existingPhoto) {
        toast({ title: "Job card photo required", variant: "destructive" })
        return
      }
      if (machineOkay !== "yes" && machineOkay !== "no") {
        toast({ title: "Say if the machine is okay", variant: "destructive" })
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
      toast({ title: isInstallation ? "Installation completed" : "Work complete" })
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

  const primaryLabel = isComplete
    ? null
    : !isStarted
      ? "Start work"
      : isInstallation
        ? "Complete"
        : "Complete"
  const onPrimary = !isStarted ? start : complete

  return (
    <EngineerPage className="space-y-3 pb-28 sm:pb-8">
      <EngineerHeader
        eyebrow={row.woNumber || "Work order"}
        title={isInstallation ? "Installation" : row.serviceType || "Job card"}
        description={`${row.machine?.productName || "Machine"} · ${row.machine?.client?.name || "No client"}`}
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <EngineerStatusBadge status={row.status} />
            {primaryLabel ? (
              <Button
                disabled={saving}
                className="h-9 text-white"
                style={{ backgroundColor: branding.primaryColor }}
                onClick={() => void onPrimary()}
              >
                {primaryLabel}
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{row.machine?.productName || "Machine"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.machine?.client?.name || "No client"}
                {row.machine?.installationLocation ? ` · ${row.machine.installationLocation}` : ""}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatWhen(row.scheduledDate || row.createdAt) || "Unscheduled"}
                {isStarted ? ` · started ${formatWhen(row.startedAt) || ""}` : ""}
                {isComplete ? ` · done ${formatWhen(row.completedDate) || ""}` : ""}
              </p>
            </div>
            <EngineerStatusBadge status={row.status} />
          </div>
          <ProgressStrip started={isStarted} completed={isComplete} color={branding.primaryColor} />
          {covered.length > 0 ? (
            <p className="text-[11px]" style={{ color: branding.primaryColor }}>
              Covered · {covered[0].type?.toUpperCase()} {covered[0].vendorName}
              {covered[0].endDate ? ` until ${new Date(covered[0].endDate).toLocaleDateString()}` : ""}
            </p>
          ) : row.machine?.warrantyUntil ? (
            <p className="text-[11px] text-amber-800">
              Warranty until {new Date(row.machine.warrantyUntil).toLocaleDateString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2.5 sm:p-6 sm:pb-3">
          <CardTitle className="text-sm sm:text-base">{isInstallation ? "Installation" : "Job card"}</CardTitle>
          {!isComplete ? (
            <button
              type="button"
              className="text-xs font-medium"
              style={{ color: branding.primaryColor }}
              disabled={saving}
              onClick={() => void save()}
            >
              Save
            </button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3 sm:space-y-4 sm:p-6 sm:pt-0">
          {isInstallation ? (
            <>
              <div>
                <Label>Machine S/N</Label>
                <Input
                  className="mt-1"
                  value={serialNumber}
                  disabled={isComplete}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Serial on the machine"
                />
              </div>
              <div>
                <Label>Person in charge</Label>
                <Input
                  className="mt-1"
                  value={attendant}
                  disabled={isComplete}
                  onChange={(e) => setAttendant(e.target.value)}
                  placeholder="Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Role</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
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
                    placeholder="07…"
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
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt="Job card"
                    className="mt-2 max-h-40 w-full rounded-md border bg-slate-50 object-contain sm:max-h-72"
                  />
                ) : null}
              </div>
              <fieldset className="space-y-1.5" disabled={isComplete}>
                <legend className="text-sm font-medium">Machine okay?</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="machineOkay"
                      value="yes"
                      checked={machineOkay === "yes"}
                      onChange={() => setMachineOkay("yes")}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="machineOkay"
                      value="no"
                      checked={machineOkay === "no"}
                      onChange={() => setMachineOkay("no")}
                    />
                    No
                  </label>
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <div>
                <Label>Downtime (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={downtime}
                  disabled={isComplete}
                  onChange={(e) => setDowntime(e.target.value)}
                />
              </div>
              {checklist.length > 0 || !isComplete ? (
                <div>
                  <Label>Checklist</Label>
                  <div className="mt-1.5 space-y-1.5">
                    {checklist.map((item, index) => (
                      <label key={`${item.item}-${index}`} className="flex items-start gap-2 py-1 text-sm">
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
                          placeholder="Add item"
                          value={newItem}
                          onChange={(e) => setNewItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return
                            e.preventDefault()
                            if (!newItem.trim()) return
                            setChecklist((prev) => [...prev, { item: newItem.trim(), done: false }])
                            setNewItem("")
                          }}
                        />
                        <button
                          type="button"
                          className="shrink-0 text-xs font-medium"
                          style={{ color: branding.primaryColor }}
                          onClick={() => {
                            if (!newItem.trim()) return
                            setChecklist((prev) => [...prev, { item: newItem.trim(), done: false }])
                            setNewItem("")
                          }}
                        >
                          Add
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}

          <div>
            <Label>Notes</Label>
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border px-3 py-2 text-sm"
              value={notes}
              disabled={isComplete}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <CostLinesEditor lines={costLines} onChange={setCostLines} disabled={isComplete} />
        </CardContent>
      </Card>

      <div className="hidden space-y-4 lg:grid lg:grid-cols-2">
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm">Asset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-4 pb-4 text-sm">
            <p className="font-medium">{row.machine?.productName || "—"}</p>
            <p className="text-muted-foreground">{row.machine?.client?.name || "No client"}</p>
            {row.machine?.client?.contactPerson ? <p>Contact {row.machine.client.contactPerson}</p> : null}
            {serialNumber || row.machine?.serialNumber ? (
              <p>SN {serialNumber || row.machine?.serialNumber}</p>
            ) : null}
            {row.machine?._id ? (
              <Link
                href={`/engineer/machines?machineId=${row.machine._id}`}
                className="mt-2 inline-block text-xs font-medium"
                style={{ color: branding.primaryColor }}
              >
                Open register
              </Link>
            ) : null}
          </CardContent>
        </Card>
        {row.request ? (
          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm">Source request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-4 pb-4 text-sm">
              <p className="font-medium">{row.request.title}</p>
              <p className="text-muted-foreground">{row.request.description}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {!isComplete && primaryLabel ? (
        <div
          className="fixed inset-x-0 z-30 border-t bg-white px-3 py-2 sm:hidden"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
        >
          <Button
            disabled={saving}
            className="h-10 w-full text-white"
            style={{ backgroundColor: branding.primaryColor }}
            onClick={() => void onPrimary()}
          >
            {primaryLabel}
          </Button>
        </div>
      ) : null}
    </EngineerPage>
  )
}
