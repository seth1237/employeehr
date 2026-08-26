"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ClipboardList, Save } from "lucide-react"

type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  manager_id: string
  employmentType: string
  grade: string
  workLocation: string
  dateOfJoining: string
  probationEndDate: string
  status: string
  salary: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  lastWorkingDay: string
  offboardingReason: string
  employmentNotes: string
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  position: "",
  manager_id: "",
  employmentType: "",
  grade: "",
  workLocation: "",
  dateOfJoining: "",
  probationEndDate: "",
  status: "active",
  salary: "",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  lastWorkingDay: "",
  offboardingReason: "",
  employmentNotes: "",
}

function toDateInput(value?: string | Date | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function displayName(u: any) {
  const first = u?.firstName || u?.first_name || ""
  const last = u?.lastName || u?.last_name || ""
  return `${first} ${last}`.trim() || u?.email || "Unknown"
}

function userToForm(u: any): FormState {
  const ec = u.emergencyContact || {}
  return {
    firstName: u.firstName || u.first_name || "",
    lastName: u.lastName || u.last_name || "",
    email: u.email || "",
    phone: u.phone || "",
    department: u.department || "",
    position: u.position || "",
    manager_id: u.manager_id || "",
    employmentType: u.employmentType || "",
    grade: u.grade || "",
    workLocation: u.workLocation || "",
    dateOfJoining: toDateInput(u.dateOfJoining || u.hire_date),
    probationEndDate: toDateInput(u.probationEndDate),
    status: u.status || "active",
    salary: u.salary != null ? String(u.salary) : "",
    emergencyName: ec.name || "",
    emergencyPhone: ec.phone || "",
    emergencyRelationship: ec.relationship || "",
    lastWorkingDay: toDateInput(u.lastWorkingDay),
    offboardingReason: u.offboardingReason || "",
    employmentNotes: u.employmentNotes || "",
  }
}

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = String(params.userId || "")
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startingOnboarding, setStartingOnboarding] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [allUsers, setAllUsers] = useState<any[]>([])

  const managers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          String(u._id) !== userId &&
          ["manager", "admin", "company_admin", "hr"].includes(u.role),
      ),
    [allUsers, userId],
  )

  const load = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading)
    try {
      const [userRes, usersRes] = await Promise.all([
        api.users.getById(userId),
        api.users.getAll(),
      ])
      if (!userRes.success || !userRes.data) {
        toast({ variant: "destructive", description: "Employee not found" })
        router.push("/admin/employees")
        return
      }
      setForm(userToForm(userRes.data))
      setAllUsers(usersRes.data || [])
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", description: "Failed to load employee" })
    } finally {
      finishDataLoad(silent, setLoading)
    }
  }

  useEffect(() => {
    if (userId) load()
  }, [userId])

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        department: form.department.trim() || undefined,
        position: form.position.trim() || undefined,
        manager_id: form.manager_id || undefined,
        employmentType: form.employmentType || undefined,
        grade: form.grade.trim() || undefined,
        workLocation: form.workLocation.trim() || undefined,
        dateOfJoining: form.dateOfJoining || undefined,
        probationEndDate: form.probationEndDate || undefined,
        status: form.status,
        salary: form.salary !== "" ? Number(form.salary) : undefined,
        lastWorkingDay: form.lastWorkingDay || undefined,
        offboardingReason: form.offboardingReason.trim() || undefined,
        employmentNotes: form.employmentNotes.trim() || undefined,
        emergencyContact: {
          name: form.emergencyName.trim() || undefined,
          phone: form.emergencyPhone.trim() || undefined,
          relationship: form.emergencyRelationship.trim() || undefined,
        },
      }
      const res = await api.users.update(userId, payload as any)
      if (!res.success) throw new Error(res.message || "Update failed")
      toast({ description: "Employee profile saved" })
      if (res.data) setForm(userToForm(res.data))
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to save",
      })
    } finally {
      setSaving(false)
    }
  }

  const startOnboarding = async () => {
    setStartingOnboarding(true)
    try {
      const res = await api.onboarding.create({ userId })
      if (!res.success) throw new Error(res.message || "Failed to start onboarding")
      toast({
        description: "Onboarding checklist created. Open Onboarding to track tasks.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Could not create onboarding checklist",
      })
    } finally {
      setStartingOnboarding(false)
    }
  }

  if (loading) {
    return <PageLoadingSkeleton title="Loading employee" rows={6} />
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/admin/employees">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to employees
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {form.firstName} {form.lastName}
            </h1>
            <Badge>{form.status}</Badge>
          </div>
          <p className="text-muted-foreground">{form.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={startOnboarding} disabled={startingOnboarding}>
            <ClipboardList className="mr-2 h-4 w-4" />
            {startingOnboarding ? "Starting…" : "Start onboarding"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/onboarding">View onboarding</Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>First name</Label>
            <Input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Last name</Label>
            <Input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setField("department", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Position</Label>
            <Input value={form.position} onChange={(e) => setField("position", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Manager</Label>
            <Select
              value={form.manager_id || "none"}
              onValueChange={(v) => setField("manager_id", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m._id} value={String(m._id)}>
                    {displayName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Employment type</Label>
            <Select
              value={form.employmentType || "none"}
              onValueChange={(v) => setField("employmentType", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {["permanent", "contract", "intern", "casual", "consultant"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Grade</Label>
            <Input value={form.grade} onChange={(e) => setField("grade", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Work location</Label>
            <Input value={form.workLocation} onChange={(e) => setField("workLocation", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Date of joining</Label>
            <Input
              type="date"
              value={form.dateOfJoining}
              onChange={(e) => setField("dateOfJoining", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Probation end date</Label>
            <Input
              type="date"
              value={form.probationEndDate}
              onChange={(e) => setField("probationEndDate", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "active",
                  "probation",
                  "preboarding",
                  "notice",
                  "pending",
                  "inactive",
                  "terminated",
                  "alumni",
                ].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Salary</Label>
            <Input
              type="number"
              min={0}
              value={form.salary}
              onChange={(e) => setField("salary", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.emergencyName} onChange={(e) => setField("emergencyName", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.emergencyPhone} onChange={(e) => setField("emergencyPhone", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Relationship</Label>
            <Input
              value={form.emergencyRelationship}
              onChange={(e) => setField("emergencyRelationship", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offboarding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Last working day</Label>
            <Input
              type="date"
              value={form.lastWorkingDay}
              onChange={(e) => setField("lastWorkingDay", e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Offboarding reason</Label>
            <Textarea
              rows={2}
              value={form.offboardingReason}
              onChange={(e) => setField("offboardingReason", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Internal employment notes…"
            value={form.employmentNotes}
            onChange={(e) => setField("employmentNotes", e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
