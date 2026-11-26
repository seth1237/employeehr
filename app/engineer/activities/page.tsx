"use client"

import { useEffect, useMemo, useState } from "react"
import { engineeringApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { isTechnicalServiceLead } from "@/lib/engineer-roles"
import { LOGGED_ACTIVITY_TYPES, loggedActivityLabel, type LoggedActivityType } from "@/lib/engineer-activity"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { EngineerHeader, EngineerPage } from "@/components/engineer/engineer-ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

function todayInput() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatDay(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

export default function EngineerActivitiesPage() {
  const { toast } = useToast()
  const user = getUser()
  const lead = isTechnicalServiceLead(user?.role)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [form, setForm] = useState({
    type: "in_office" as LoggedActivityType,
    date: todayInput(),
    hours: "",
    title: "",
    notes: "",
  })

  const load = () => {
    setLoading(true)
    engineeringApi
      .getLoggedActivities(lead ? { engineerId: "all" } : undefined)
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [lead])

  const submit = async () => {
    if (form.type === "other" && !form.title.trim()) {
      toast({ title: "Describe the other activity", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await engineeringApi.createLoggedActivity({
        type: form.type,
        date: form.date,
        hours: form.hours ? Number(form.hours) : undefined,
        title: form.title.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      setForm({
        type: form.type,
        date: todayInput(),
        hours: "",
        title: "",
        notes: "",
      })
      load()
    } catch (error: any) {
      toast({
        title: "Could not save activity",
        description: error?.message || "Try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm("Remove this activity?")) return
    try {
      await engineeringApi.deleteLoggedActivity(id)
      setRows((prev) => prev.filter((row) => row._id !== id))
    } catch (error: any) {
      toast({
        title: "Could not remove activity",
        description: error?.message || "Try again.",
        variant: "destructive",
      })
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const row of rows) {
      const key = String(row.date || "").slice(0, 10) || "other"
      map.set(key, [...(map.get(key) || []), row])
    }
    return Array.from(map.entries())
  }, [rows])

  if (loading && rows.length === 0) return <PageLoadingSkeleton title="Activities" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Activities"
        description="Log office days, CME, SME sessions, in-office repair, and other work that is not a field job."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log activity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label>Activity</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LOGGED_ACTIVITY_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: item.id }))}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm font-medium",
                    form.type === item.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-800",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {form.type === "other" ? (
            <div>
              <Label htmlFor="activity-title">What did you do?</Label>
              <Input
                id="activity-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Training, meeting, admin…"
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="activity-date">Date</Label>
              <Input
                id="activity-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="activity-hours">Hours (optional)</Label>
              <Input
                id="activity-hours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={form.hours}
                onChange={(event) => setForm((prev) => ({ ...prev, hours: event.target.value }))}
                placeholder="e.g. 8"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="activity-notes">Notes</Label>
            <Textarea
              id="activity-notes"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Session topic, machines repaired, or what you covered in the office"
              rows={4}
            />
          </div>
          <Button className="h-11" disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save activity"}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Logged activities</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {grouped.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No office, CME, or other activities logged yet.
            </p>
          ) : (
            <ul className="divide-y">
              {grouped.map(([day, items]) => (
                <li key={day} className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {formatDay(items[0]?.date || day)}
                  </p>
                  <div className="mt-2 space-y-2">
                    {items.map((row) => (
                      <div key={row._id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{loggedActivityLabel(row)}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {[
                              lead ? row.engineerName : "",
                              Number(row.hours || 0) > 0
                                ? `${row.hours} hr${Number(row.hours) === 1 ? "" : "s"}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {row.notes ? <p className="mt-1 text-sm text-slate-600">{row.notes}</p> : null}
                        </div>
                        {String(row.engineerId) === String(user?._id) || lead ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 shrink-0 text-slate-500"
                            onClick={() => void remove(row._id)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </EngineerPage>
  )
}
