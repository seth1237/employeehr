"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { Mail, MapPin, Search, UserCheck, Users } from "lucide-react"

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("Your Department")

  useEffect(() => {
    const user: any = getUser()
    if (user?.department) setDepartment(user.department)

    ;(async () => {
      try {
        const res: any = await api.users.getAll()
        if (res?.success) setMembers((res.data || []) as any[])
      } catch {
        setMembers([])
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      const haystack = [m.firstName, m.lastName, m.email, m.employee_id, m.position, m.department].join(" ").toLowerCase()
      return !q || haystack.includes(q)
    })
  }, [members, search])

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <Badge className="bg-white/10 text-white hover:bg-white/15">Department Team</Badge>
            <h1 className="mt-3 text-2xl font-semibold">Employee Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              View and manage employees assigned to {department}. You can review staff, role, status, and department-related information.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
            {filtered.length} visible employee(s)
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-white shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees" className="pl-9" />
            </div>

            <div className="space-y-3">
              {filtered.map((member) => (
                <div key={member._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{member.firstName} {member.lastName}</h3>
                      <Badge variant={member.role === "manager" ? "default" : "secondary"}>{member.role || "employee"}</Badge>
                      {member.status && <Badge variant="outline">{member.status}</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{member.email}</span>
                      {member.employee_id && <span className="inline-flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />{member.employee_id}</span>}
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{member.department || department}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">View Profile</Button>
                    <Button variant="outline" size="sm">Assign Task</Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No employees found for this department.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Department Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-slate-50 p-3">
              Manager-managed employees are shown here.
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              Admin-created KPIs drive this department’s performance view.
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              Use approvals and reports to manage the rest of your responsibilities.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
