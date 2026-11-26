"use client"

import { useEffect, useMemo, useState } from "react"
import { engineeringApi, stockApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { EngineerHeader, EngineerPage } from "@/components/engineer/engineer-ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"

function facilityName(job?: any) {
  return String(
    job?.machine?.client?.name ||
      job?.machine?.installationLocation ||
      job?.machine?.client?.location ||
      "",
  ).trim()
}

function isInstallationJob(job?: any) {
  const type = String(job?.type || "").toLowerCase()
  const title = String(job?.serviceType || "").toLowerCase()
  return type === "installation" || title.includes("install")
}

function purposeFromJob(job?: any) {
  if (!job) return ""
  const kind = isInstallationJob(job) ? "Installation" : "Service"
  const facility = facilityName(job)
  return facility ? `${kind} (${facility})` : kind
}

function reasonFromJob(job?: any) {
  return String(job?.notes || "").trim()
}

function jobLabel(job: any) {
  const kind = isInstallationJob(job) ? "Installation" : "Service"
  const facility = facilityName(job)
  return [
    job.woNumber || job.serviceType || "Work order",
    kind,
    facility || job.machine?.productName,
  ]
    .filter(Boolean)
    .join(" · ")
}

export default function EngineerExpensesPage() {
  const user = getUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [claims, setClaims] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [form, setForm] = useState({
    woId: "",
    purpose: "",
    description: "",
    amount: "",
  })

  const selectedJob = useMemo(
    () => jobs.find((job) => String(job._id) === form.woId) || null,
    [jobs, form.woId],
  )

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

  const pickWorkOrder = (woId: string) => {
    if (!woId) {
      setForm((prev) => ({ ...prev, woId: "", purpose: "", description: "" }))
      return
    }
    const job = jobs.find((row) => String(row._id) === woId)
    setForm((prev) => ({
      ...prev,
      woId,
      purpose: purposeFromJob(job),
      description: reasonFromJob(job),
    }))
  }

  const submit = async () => {
    if (!form.woId) {
      window.alert("Select the work order first")
      return
    }
    const purpose = form.purpose.trim() || purposeFromJob(selectedJob)
    if (!purpose || !form.description.trim() || !form.amount) {
      window.alert("Purpose, reason, and amount are required")
      return
    }
    if (!user?._id) return
    setSaving(true)
    try {
      await stockApi.createExpenseClaim({
        employeeId: user._id,
        employeeName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
        purpose,
        items: [{ description: form.description.trim(), amount: Number(form.amount) }],
        status: "submitted",
        source: "engineer",
        woId: form.woId,
      })
      setForm({ woId: "", purpose: "", description: "", amount: "" })
      load()
    } catch (error: any) {
      window.alert(error?.message || "Could not submit claim")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Expenses" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Expenses"
        description="Pick the job, then the purpose fills from the facility. Add the reason and amount."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New claim</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="claim-wo">Work order</Label>
            <select
              id="claim-wo"
              className="mt-1 h-11 w-full rounded-md border bg-white px-3 text-sm"
              value={form.woId}
              onChange={(e) => pickWorkOrder(e.target.value)}
            >
              <option value="">Select work order</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {jobLabel(job)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="claim-purpose">Purpose</Label>
            <Input
              id="claim-purpose"
              value={form.purpose}
              readOnly
              placeholder="Installation (facility) or Service (facility)"
              className="bg-slate-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Fills as Installation or Service with the facility from the selected job.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="claim-reason">Description / reason</Label>
            <Textarea
              id="claim-reason"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Why this expense was needed"
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="claim-amount">Amount</Label>
            <Input
              id="claim-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <Button className="sm:col-span-2 h-11" disabled={saving} onClick={() => void submit()}>
            {saving ? "Submitting…" : "Submit claim"}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expense history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No expense history yet.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim._id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium">{claim.purpose || claim.claimNumber}</p>
                        {Array.isArray(claim.items) && claim.items[0]?.description ? (
                          <p className="text-xs text-muted-foreground">{claim.items[0].description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {claim.createdAt || claim.submittedAt
                          ? new Date(claim.createdAt || claim.submittedAt).toLocaleDateString()
                          : "—"}
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
    </EngineerPage>
  )
}
