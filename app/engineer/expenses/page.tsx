"use client"

import { useEffect, useState } from "react"
import { engineeringApi, stockApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"

export default function EngineerExpensesPage() {
  const user = getUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [claims, setClaims] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [form, setForm] = useState({
    description: "",
    amount: "",
    purpose: "",
    woId: "",
  })

  const load = () => {
    setLoading(true)
    Promise.all([
      engineeringApi.getExpenses().catch(() => ({ data: [] })),
      engineeringApi.getWorkOrders({ filter: "mine" }).catch(() => ({ data: [] })),
    ])
      .then(([claimRes, jobRes]) => {
        setClaims(claimRes.data || [])
        setJobs(jobRes.data || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!form.purpose.trim() || !form.description.trim() || !form.amount) {
      window.alert("Purpose, description and amount are required")
      return
    }
    if (!user?._id) return
    setSaving(true)
    try {
      await stockApi.createExpenseClaim({
        employeeId: user._id,
        employeeName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
        purpose: form.purpose.trim(),
        items: [{ description: form.description.trim(), amount: Number(form.amount) }],
        status: "submitted",
        source: "engineer",
        woId: form.woId || undefined,
      })
      setForm({ description: "", amount: "", purpose: "", woId: "" })
      load()
    } catch (error: any) {
      window.alert(error?.message || "Could not submit claim")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Expenses" />

  return (
    <div className="space-y-4 p-4 pb-24 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Field expenses</h1>
        <p className="text-sm text-muted-foreground">
          Submit travel and job costs against a work order. Accounts reviews the same claims list.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New claim</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Purpose</Label>
            <Input
              value={form.purpose}
              onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
              placeholder="Site visit / spare purchase"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Fuel, taxi, parts…"
            />
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Work order (optional)</Label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={form.woId}
              onChange={(e) => setForm((prev) => ({ ...prev, woId: e.target.value }))}
            >
              <option value="">Not linked</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.woNumber || job.serviceType} — {job.machine?.productName || "asset"}
                </option>
              ))}
            </select>
          </div>
          <Button className="sm:col-span-2" disabled={saving} onClick={() => void submit()}>
            {saving ? "Submitting…" : "Submit claim"}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                      No claims yet.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim._id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium">{claim.claimNumber}</p>
                        <p className="text-xs text-muted-foreground">{claim.purpose}</p>
                      </td>
                      <td className="px-4 py-3">{Number(claim.totalAmount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">
                          {claim.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DesktopTableShell>
        </CardContent>
      </Card>
    </div>
  )
}
