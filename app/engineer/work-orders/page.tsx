"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { engineeringApi, stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DesktopTableShell, MobileCardList, MobileCard } from "@/components/admin/ui/mobile-list"
import { ChevronRight, Plus } from "lucide-react"
import {
  EngineerHeader,
  EngineerPage,
} from "@/components/engineer/engineer-ui"
import { useEngineerBranding } from "@/components/engineer/branding"

const FILTERS = [
  { id: "mine", label: "Mine / open" },
  { id: "installations", label: "Installations" },
  { id: "pending", label: "All open" },
  { id: "unassigned", label: "Unassigned" },
  { id: "all", label: "All" },
]

function statusTone(status?: string) {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "in_progress") return "border-sky-200 bg-sky-50 text-sky-800"
  if (status === "waiting_parts") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "cancelled") return "border-slate-200 bg-slate-50 text-slate-600"
  return "border-rose-200 bg-rose-50 text-rose-800"
}

export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Work orders" />}>
      <WorkOrdersInner />
    </Suspense>
  )
}

function WorkOrdersInner() {
  const branding = useEngineerBranding()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [filter, setFilter] = useState(searchParams.get("filter") || "mine")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [assetId, setAssetId] = useState(searchParams.get("assetId") || "")
  const [q, setQ] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    machineId: "",
    serviceType: "",
    type: "corrective",
    priority: "medium",
    scheduledDate: new Date().toISOString().slice(0, 10),
    notes: "",
  })

  const load = () => {
    setLoading(true)
    engineeringApi
      .getWorkOrders({ filter: assetId ? "all" : filter, status: status || undefined, assetId: assetId || undefined })
      .then((res) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : []
        setRows(list)
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [filter, status, assetId])

  useEffect(() => {
    stockApi.getInstalledMachines().then((res) => setAssets(res.data || [])).catch(() => setAssets([]))
  }, [])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) =>
      [row.woNumber, row.serviceType, row.status, row.machine?.productName, row.machine?.client?.name, row.machine?.serialNumber]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
  }, [rows, q])

  const create = async () => {
    if (!form.machineId || !form.serviceType.trim()) {
      window.alert("Select an asset and enter the job title.")
      return
    }
    setSaving(true)
    try {
      await engineeringApi.createWorkOrder({
        ...form,
        scheduledDate: form.scheduledDate || undefined,
      })
      setCreateOpen(false)
      setForm({
        machineId: "",
        serviceType: "",
        type: "corrective",
        priority: "medium",
        scheduledDate: new Date().toISOString().slice(0, 10),
        notes: "",
      })
      load()
    } catch (error: any) {
      window.alert(error?.message || "Could not create work order")
    } finally {
      setSaving(false)
    }
  }

  if (loading && rows.length === 0) return <PageLoadingSkeleton title="Work orders" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Work orders"
        description="Job cards assigned to you or still open in the queue."
        actions={
          <Button
            size="sm"
            className="h-8 px-3 text-xs text-white sm:text-sm"
            style={{ backgroundColor: branding.primaryColor }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New work order
          </Button>
        }
      />

      {assetId ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span>Showing jobs for the selected machine.</span>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAssetId("")}>
            Clear
          </Button>
        </div>
      ) : null}

      <div className="hidden flex-wrap gap-2 md:flex">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={status === "overdue" ? "default" : "outline"}
          onClick={() => setStatus((current) => (current === "overdue" ? "" : "overdue"))}
        >
          Overdue
        </Button>
        <Input
          className="ml-auto max-w-xs"
          placeholder="Search job, asset, client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="space-y-3 md:hidden">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "default" : "outline"}
              className="h-7 shrink-0 rounded-full px-2.5 text-xs"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={status === "overdue" ? "default" : "outline"}
            className="h-7 shrink-0 rounded-full px-2.5 text-xs"
            onClick={() => setStatus((current) => (current === "overdue" ? "" : "overdue"))}
          >
            Overdue
          </Button>
        </div>
        <Input
          placeholder="Search job, asset, client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No work orders in this view.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row._id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/engineer/work-orders/${row._id}`} className="font-medium hover:underline">
                          {row.woNumber || "Work order"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {row.type === "installation" ? "Installation · " : ""}
                          {row.serviceType || row.type}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{row.machine?.productName || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.machine?.client?.name || row.machine?.assetTag || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {row.scheduledDate ? new Date(row.scheduledDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`capitalize ${statusTone(row.status)}`}>
                          {String(row.status || "open").replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DesktopTableShell>

          <MobileCardList label="Work orders">
            {visible.length === 0 ? (
              <MobileCard>
                <p className="py-6 text-center text-sm text-muted-foreground">No work orders in this view.</p>
              </MobileCard>
            ) : (
              visible.map((row) => (
                <MobileCard key={row._id} className="p-0">
                  <Link href={`/engineer/work-orders/${row._id}`} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold leading-tight">
                          {row.woNumber || "Work order"}
                        </p>
                        <Badge
                          variant="outline"
                          className={`shrink-0 capitalize ${statusTone(row.status)}`}
                        >
                          {String(row.status || "open").replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-foreground">
                        {row.machine?.productName || row.serviceType || "Job"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.machine?.client?.name || row.machine?.assetTag || "No client"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.type === "installation" ? "Installation · " : ""}
                        Due {row.scheduledDate ? new Date(row.scheduledDate).toLocaleDateString() : "unscheduled"}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </MobileCard>
              ))
            )}
          </MobileCardList>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New work order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Asset</Label>
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.machineId}
                onChange={(e) => setForm((prev) => ({ ...prev, machineId: e.target.value }))}
              >
                <option value="">Select asset…</option>
                {assets.map((asset) => (
                  <option key={asset._id} value={asset._id}>
                    {asset.productName}
                    {asset.client?.name ? ` · ${asset.client.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Job title</Label>
              <Input
                value={form.serviceType}
                onChange={(e) => setForm((prev) => ({ ...prev, serviceType: e.target.value }))}
                placeholder="e.g. Preventive service"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Preventive</option>
                  <option value="installation">Installation</option>
                  <option value="calibration">Calibration</option>
                  <option value="inspection">Inspection</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Scheduled</Label>
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <Button className="w-full text-white" disabled={saving} style={{ backgroundColor: branding.primaryColor }} onClick={() => void create()}>
              {saving ? "Saving…" : "Create work order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </EngineerPage>
  )
}
