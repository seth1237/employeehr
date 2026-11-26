"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardList, Download, MapPin, Wrench } from "lucide-react"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { EngineerHeader, EngineerKpi, EngineerPage, EngineerStatusBadge, formatWhen } from "@/components/engineer/engineer-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { downloadEngineerActivityPdf, loadReportBranding } from "@/lib/engineer-reports-pdf"
import { cleanActivityLabel } from "@/lib/engineer-activity"
import { getUser } from "@/lib/auth"
import { isTechnicalServiceLead } from "@/lib/engineer-roles"

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthBounds(value: string) {
  const [year, month] = value.split("-").map(Number)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)
  return { from, to }
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

export default function EngineerReportsPage() {
  const { toast } = useToast()
  const user = getUser()
  const lead = isTechnicalServiceLead(user?.role)
  const [month, setMonth] = useState(monthValue)
  const [engineerId, setEngineerId] = useState(lead ? "all" : "")
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [payload, setPayload] = useState<any>(null)

  const { from, to } = useMemo(() => monthBounds(month), [month])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    engineeringApi
      .getMyActivity({
        from: from.toISOString(),
        to: to.toISOString(),
        engineerId: lead ? engineerId || "all" : undefined,
      })
      .then((res) => {
        if (!cancelled) setPayload(res.data || res)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setPayload(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to, engineerId, lead])

  const activities = payload?.activities || []
  const stats = payload?.stats || { assigned: 0, completed: 0, open: 0, facilities: 0 }
  const engineerName = payload?.engineer?.name || "Engineer"

  const download = async () => {
    setDownloading(true)
    try {
      const branding = await loadReportBranding()
      await downloadEngineerActivityPdf({
        engineerName,
        periodLabel: monthLabel(month),
        activities,
        branding,
      })
    } catch (error: any) {
      toast({
        title: "Could not download report",
        description: error?.message || "Try again.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  if (loading && !payload) return <PageLoadingSkeleton title="Reports" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Reports"
        description={
          lead
            ? "Download activity for every engineer, or just one person: facility, machine, and the visit report."
            : "Download your assigned work for the month: facility, machine, and the visit report."
        }
        actions={
          <Button onClick={() => void download()} disabled={downloading} className="h-10">
            <Download className="mr-1.5 h-4 w-4" />
            {downloading ? "Preparing…" : "Download activity"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Month</span>
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-11 w-[11.5rem] bg-white"
          />
        </label>
        {lead ? (
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Engineer</span>
            <select
              value={engineerId}
              onChange={(event) => setEngineerId(event.target.value)}
              className="h-11 rounded-md border bg-white px-3 text-sm"
            >
              <option value="all">All engineers</option>
              <option value={user?._id || ""}>Me</option>
              {(payload?.engineers || [])
                .filter((person: any) => person._id !== user?._id)
                .map((person: any) => (
                  <option key={person._id} value={person._id}>
                    {person.name}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        <p className="pb-2 text-sm text-muted-foreground">{monthLabel(month)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <EngineerKpi label="Assigned" value={stats.assigned} icon={ClipboardList} />
        <EngineerKpi label="Completed" value={stats.completed} icon={ClipboardList} />
        <EngineerKpi label="Open" value={stats.open} icon={Wrench} />
        <EngineerKpi label="Facilities" value={stats.facilities} icon={MapPin} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {activities.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No assigned activity in {monthLabel(month)}.
          </p>
        ) : (
          <ul className="divide-y">
            {activities.map((row: any) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {cleanActivityLabel(row)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {[
                        row.engineerName,
                        row.machine,
                        row.serialNumber ? `SN ${row.serialNumber}` : "",
                        row.facility,
                        row.location,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {row.notes ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">{row.notes}</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <EngineerStatusBadge status={row.status} />
                    <p className="mt-1 text-[11px] text-slate-500">{formatWhen(row.date)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </EngineerPage>
  )
}
