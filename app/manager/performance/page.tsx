"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { api, usersApi } from "@/lib/api"
import { getToken, getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { useToast } from "@/hooks/use-toast"

function displayName(u: any) {
  if (!u) return "Unknown"
  const first = u.firstName || u.first_name || ""
  const last = u.lastName || u.last_name || ""
  return `${first} ${last}`.trim() || u.email || "Unknown"
}

function currentPeriod() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

type TeamRow = {
  user: any
  overall_score?: number | null
  status?: string | null
  period?: string
}

export default function PerformancePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<TeamRow[]>([])
  const [period] = useState(currentPeriod())

  const load = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading)
    try {
      const me = getUser()
      const managerId = me?._id || me?.userId
      if (!managerId) {
        setRows([])
        return
      }

      const teamRes = await usersApi.getTeamMembers(managerId)
      const team = teamRes.success ? teamRes.data || [] : []

      if (team.length === 0) {
        setRows([])
        return
      }

      let performances: any[] = []
      try {
        const allRes = await api.performance.getAll()
        if (allRes.success) performances = allRes.data || []
      } catch {
        performances = []
      }

      const periodMatches = (p?: string) =>
        p === period || p === String(new Date().getFullYear())

      const result: TeamRow[] = []
      for (const member of team) {
        const uid = String(member._id)
        let perf =
          performances.find(
            (p) => String(p.user_id) === uid && periodMatches(p.period),
          ) ||
          performances.find((p) => String(p.user_id) === uid)

        if (!perf) {
          try {
            const res = await fetch(
              `${API_URL}/api/performance/${uid}/${period}`,
              {
                headers: { Authorization: `Bearer ${getToken()}` },
              },
            )
            const data = await res.json()
            if (data.success && data.data) perf = data.data
          } catch {
            // no performance record
          }
        }

        result.push({
          user: member,
          overall_score: perf?.overall_score ?? null,
          status: perf?.status ?? null,
          period: perf?.period || period,
        })
      }

      setRows(result)
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", description: "Failed to load team performance" })
    } finally {
      finishDataLoad(silent, setLoading)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <Card className="border-border/70 bg-white shadow-sm">
        <CardHeader>
          <Badge className="w-fit bg-slate-100 text-slate-800 hover:bg-slate-200">
            Performance
          </Badge>
          <CardTitle className="text-2xl">Team Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Period {period} — scores from live performance records for your direct reports.
          </p>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <TableSkeleton rows={4} />
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No team members assigned to you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {rows.map((row) => {
            const score = row.overall_score
            const progress = typeof score === "number" ? Math.min(100, Math.max(0, score)) : 0
            return (
              <Card key={row.user._id} className="border-border/70 bg-white shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{displayName(row.user)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {row.user.position || row.user.department || "Team member"}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                      {score != null ? `${score}/100` : "—"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall score</span>
                      <span className="font-medium">{score != null ? `${progress}%` : "No data"}</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline">{row.status || "no review"}</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
