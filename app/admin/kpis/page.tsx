"use client"

import { useEffect, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Plus, Trash2 } from "lucide-react"

type KpiForm = {
  name: string
  description: string
  category: string
  weight: string
  target: string
  unit: string
}

const EMPTY: KpiForm = {
  name: "",
  description: "",
  category: "",
  weight: "10",
  target: "100",
  unit: "%",
}

export default function AdminKpisPage() {
  const { toast } = useToast()
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<KpiForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const res = await api.kpis.getAll()
      if (res.success) setKpis(res.data || [])
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", description: "Failed to load KPIs" })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY)
    setDialogOpen(true)
  }

  const openEdit = (kpi: any) => {
    setEditingId(kpi._id)
    setForm({
      name: kpi.name || "",
      description: kpi.description || "",
      category: kpi.category || "",
      weight: String(kpi.weight ?? 10),
      target: String(kpi.target ?? kpi.target_value ?? 100),
      unit: kpi.unit || kpi.measurement_unit || "%",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim() || !form.unit.trim()) {
      toast({ variant: "destructive", description: "Name, category, and unit are required" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        weight: Number(form.weight) || 0,
        target: Number(form.target) || 0,
        unit: form.unit.trim(),
      }
      const res = editingId
        ? await api.kpis.update(editingId, payload as any)
        : await api.kpis.create(payload as any)
      if (!res.success) throw new Error(res.message || "Save failed")
      toast({ description: editingId ? "KPI updated" : "KPI created" })
      setDialogOpen(false)
      load({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to save KPI",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this KPI?")) return
    try {
      const res = await api.kpis.delete(id)
      if (!res.success) throw new Error(res.message || "Delete failed")
      toast({ description: "KPI deleted" })
      load({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to delete KPI",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">KPI Library</h1>
          <p className="text-muted-foreground">
            Define organization KPIs for performance reviews.
            {refreshing ? " Refreshing…" : ""}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add KPI
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && kpis.length === 0 ? (
            <TableSkeleton rows={6} />
          ) : kpis.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No KPIs yet. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Weight</th>
                    <th className="px-6 py-3">Target</th>
                    <th className="px-6 py-3">Unit</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {kpis.map((kpi) => (
                    <tr key={kpi._id} className="hover:bg-muted/30">
                      <td className="px-6 py-3 font-medium">{kpi.name}</td>
                      <td className="px-6 py-3">
                        <Badge variant="outline">{kpi.category}</Badge>
                      </td>
                      <td className="px-6 py-3">{kpi.weight}</td>
                      <td className="px-6 py-3">{kpi.target ?? kpi.target_value ?? "—"}</td>
                      <td className="px-6 py-3">{kpi.unit || kpi.measurement_unit || "—"}</td>
                      <td className="px-6 py-3 max-w-xs truncate text-muted-foreground" title={kpi.description}>
                        {kpi.description || "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(kpi)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(kpi._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit KPI" : "Create KPI"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Sales, Quality, Attendance"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Weight</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Target</Label>
                <Input
                  type="number"
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
