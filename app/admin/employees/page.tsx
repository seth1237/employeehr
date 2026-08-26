"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Users } from "lucide-react"

type Employee = Record<string, any>

const STATUS_OPTIONS = [
  "all",
  "active",
  "probation",
  "preboarding",
  "notice",
  "pending",
  "inactive",
  "terminated",
  "alumni",
] as const

function displayName(u: Employee) {
  const first = u?.firstName || u?.first_name || ""
  const last = u?.lastName || u?.last_name || ""
  return `${first} ${last}`.trim() || u?.email || "Unknown"
}

function statusVariant(status?: string) {
  switch (status) {
    case "active":
      return "default" as const
    case "probation":
    case "preboarding":
      return "secondary" as const
    case "notice":
      return "outline" as const
    case "terminated":
    case "inactive":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

function formatDate(value?: string | Date) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString()
}

export default function EmployeesPage() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    position: "",
  })

  const loadEmployees = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const res = await api.users.getAll()
      if (res.success) setEmployees(res.data || [])
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        description: "Failed to load employees",
      })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const stats = useMemo(() => {
    const counts = { active: 0, probation: 0, preboarding: 0, notice: 0 }
    for (const e of employees) {
      const s = e.status || "active"
      if (s in counts) counts[s as keyof typeof counts]++
    }
    return counts
  }, [employees])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter((e) => {
      if (statusFilter !== "all" && (e.status || "active") !== statusFilter) return false
      if (!q) return true
      const hay = [
        displayName(e),
        e.email,
        e.department,
        e.position,
        e.employmentType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [employees, search, statusFilter])

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast({ variant: "destructive", description: "First name, last name, and email are required" })
      return
    }
    setCreating(true)
    try {
      const res = await api.users.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        department: form.department.trim() || undefined,
        position: form.position.trim() || undefined,
        role: "employee",
      } as any)
      if (!res.success) throw new Error(res.message || "Create failed")
      toast({ description: "Employee created" })
      setCreateOpen(false)
      setForm({ firstName: "", lastName: "", email: "", department: "", position: "" })
      loadEmployees({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to create employee",
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            HR directory — profiles, status, and employment details.
            {refreshing ? " Refreshing…" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/users">Manage users</Link>
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add employee</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active", value: stats.active },
          { label: "Probation", value: stats.probation },
          { label: "Preboarding", value: stats.preboarding },
          { label: "Notice", value: stats.notice },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, email, or department…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && employees.length === 0 ? (
            <TableSkeleton rows={8} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Users className="h-8 w-8" />
              <p>No employees match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Position</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((e) => (
                    <tr key={e._id} className="hover:bg-muted/30">
                      <td className="px-6 py-3 font-medium">
                        <Link
                          href={`/admin/employees/${e._id}`}
                          className="text-foreground hover:underline"
                        >
                          {displayName(e)}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{e.email || "—"}</td>
                      <td className="px-6 py-3">{e.department || "—"}</td>
                      <td className="px-6 py-3">{e.position || "—"}</td>
                      <td className="px-6 py-3 capitalize">{e.employmentType || "—"}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant(e.status)}>{e.status || "active"}</Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatDate(e.dateOfJoining || e.hire_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
