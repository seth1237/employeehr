"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, ClipboardList, Palmtree, Users } from "lucide-react"
import { engineeringApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { isTechnicalServiceLead } from "@/lib/engineer-roles"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import {
  EngineerHeader,
  EngineerKpi,
  EngineerPage,
  EngineerStatusBadge,
  formatWhen,
} from "@/components/engineer/engineer-ui"

export default function EngineerTeamPage() {
  const router = useRouter()
  const lead = isTechnicalServiceLead(getUser()?.role)
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<any>(null)

  useEffect(() => {
    if (!lead) {
      router.replace("/engineer")
      return
    }
    engineeringApi
      .getTeamOverview()
      .then((res) => setPayload(res.data || res))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [lead, router])

  if (!lead) return <PageLoadingSkeleton title="Team" />
  if (loading) return <PageLoadingSkeleton title="Team" />

  const engineers = payload?.engineers || []
  const offs = payload?.offs || []

  return (
    <EngineerPage>
      <EngineerHeader
        title="Team"
        description="Every engineer’s jobs and leave. Assign work from Requests."
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <EngineerKpi label="Engineers" value={engineers.length} icon={Users} />
        <EngineerKpi label="Open jobs" value={payload?.teamOpen ?? 0} icon={ClipboardList} />
        <EngineerKpi label="Unassigned tickets" value={payload?.unassignedRequests ?? 0} href="/engineer/requests" icon={ClipboardList} />
        <EngineerKpi label="On leave today" value={payload?.onLeaveToday ?? 0} icon={Palmtree} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {engineers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No technical users yet.</p>
        ) : (
          <ul className="divide-y">
            {engineers.map((person: any) => (
              <li key={person._id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{person.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {person.openJobs} open · {person.completed} completed
                      {person.currentJob ? ` · ${person.currentJob.title}` : ""}
                    </p>
                  </div>
                  {person.onLeave ? (
                    <EngineerStatusBadge status="on leave" label={`${person.onLeave.type} leave`} />
                  ) : person.openJobs ? (
                    <EngineerStatusBadge status="in_progress" label="In field" />
                  ) : (
                    <EngineerStatusBadge status="open" label="Available" />
                  )}
                </div>
                {person.onLeave ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Off {formatWhen(person.onLeave.startDate)} – {formatWhen(person.onLeave.endDate)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="h-4 w-4" />
            Offs
          </h2>
          <Link href="/engineer/leave" className="text-xs font-medium text-slate-600 hover:underline">
            My leave
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          {offs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No pending or approved leave this month.</p>
          ) : (
            <ul className="divide-y">
              {offs.map((row: any) => (
                <li key={row._id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{row.engineerName}</p>
                    <p className="text-xs text-slate-500">
                      {row.type} · {formatWhen(row.startDate)} – {formatWhen(row.endDate)}
                    </p>
                    {row.reason ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">{row.reason}</p> : null}
                  </div>
                  <EngineerStatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </EngineerPage>
  )
}
