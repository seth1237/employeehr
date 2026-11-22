"use client"

import { useEffect, useState } from "react"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EngineerHeader, EngineerPage, EngineerStatusBadge } from "@/components/engineer/engineer-ui"

type ToolRequest = {
  _id: string
  itemName: string
  category: string
  quantity: number
  reason: string
  neededBy?: string
  status: "pending" | "approved" | "rejected" | "issued"
  adminComment?: string
  createdAt: string
}

const CATEGORIES = [
  { id: "equipment", label: "Equipment" },
  { id: "tools", label: "Tools" },
  { id: "vehicle", label: "Vehicle" },
  { id: "ppe", label: "PPE" },
  { id: "parts", label: "Parts" },
  { id: "other", label: "Other" },
]

function statusMap(status: string): { status: "completed" | "cancelled" | "assigned" | "in_progress"; label: string } {
  if (status === "approved" || status === "issued") return { status: "completed", label: status }
  if (status === "rejected") return { status: "cancelled", label: status }
  return { status: "assigned", label: status }
}

export default function EngineerToolsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<ToolRequest[]>([])
  const [form, setForm] = useState({
    itemName: "",
    category: "tools",
    quantity: "1",
    reason: "",
    neededBy: "",
  })

  const load = () => {
    setLoading(true)
    engineeringApi
      .getToolRequests()
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!form.itemName.trim() || !form.reason.trim()) {
      window.alert("Item and reason are required.")
      return
    }
    setSaving(true)
    try {
      await engineeringApi.createToolRequest({
        itemName: form.itemName.trim(),
        category: form.category,
        quantity: Number(form.quantity || 1),
        reason: form.reason.trim(),
        neededBy: form.neededBy || undefined,
      })
      setForm({ itemName: "", category: "tools", quantity: "1", reason: "", neededBy: "" })
      load()
    } catch (error: any) {
      window.alert(error?.message || "Could not submit request")
    } finally {
      setSaving(false)
    }
  }

  if (loading && rows.length === 0) return <PageLoadingSkeleton title="Tools of work" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Tools of work"
        description="Request equipment, tools, vehicles, PPE, or parts. Admin reviews each request."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your requests</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No tool requests yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const badge = statusMap(row.status)
                  return (
                    <div key={row._id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{row.itemName}</p>
                          <EngineerStatusBadge status={badge.status} label={badge.label} />
                        </div>
                        <p className="text-sm text-slate-600">
                          {row.quantity} · {row.category}
                          {row.neededBy ? ` · needed ${new Date(row.neededBy).toLocaleDateString()}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{row.reason}</p>
                        {row.adminComment ? (
                          <p className="mt-1 text-xs text-slate-600">Admin: {row.adminComment}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-xs text-slate-500">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Item</Label>
              <Input
                className="mt-1"
                value={form.itemName}
                onChange={(e) => setForm((prev) => ({ ...prev, itemName: e.target.value }))}
                placeholder="Multimeter, gloves, analyzer…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Needed by (optional)</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.neededBy}
                onChange={(e) => setForm((prev) => ({ ...prev, neededBy: e.target.value }))}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="What job this is for, and why it is needed."
              />
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void submit()}>
              {saving ? "Sending…" : "Submit request"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </EngineerPage>
  )
}
