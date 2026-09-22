"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CalendarClock, ChevronRight, ClipboardList, Inbox, Wrench } from "lucide-react"
import {
  EngineerHeader,
  EngineerKpi,
  EngineerPage,
  EngineerStatusBadge,
} from "@/components/engineer/engineer-ui"
import { useEngineerBranding } from "@/components/engineer/branding"

function dueLabel(value?: string) {
  if (!value) return "Unscheduled"
  return new Date(value).toLocaleDateString()
}

export default function EngineerDashboard() {
  const branding = useEngineerBranding()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    engineeringApi
      .getDashboard()
      .then((res) => setData(res.data || res))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Today" />

  const stats = [
    { label: "Open jobs", value: data?.myOpen ?? 0, href: "/engineer/work-orders?filter=mine", icon: ClipboardList },
    { label: "Overdue", value: data?.overdue ?? 0, href: "/engineer/work-orders?status=overdue", icon: AlertTriangle },
    { label: "Due today", value: data?.dueToday ?? 0, href: "/engineer/work-orders?filter=mine", icon: CalendarClock },
    { label: "Requests", value: data?.openRequests ?? 0, href: "/engineer/requests", icon: Inbox },
    { label: "Machines", value: data?.assets ?? 0, href: "/engineer/machines", icon: Wrench },
  ]

  const dueToday = data?.dueTodayOrders || []
  const overdue = data?.overdueOrders || []
  const pendingInstallations = data?.pendingInstallations || []
  const myMachines = data?.myMachines || []
  const machines = [
    ...pendingInstallations,
    ...myMachines.filter(
      (machine: any) =>
        !pendingInstallations.some((row: any) => String(row._id) === String(machine._id)),
    ),
  ].slice(0, 8)

  return (
    <EngineerPage>
      <EngineerHeader
        title="Today"
        description="Your open work, due jobs, and installed machines."
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <EngineerKpi
            key={stat.label}
            label={stat.label}
            value={stat.value}
            href={stat.href}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="px-3 py-2.5 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Due today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3 pt-0 sm:p-6 sm:pt-0">
            {dueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled for today.</p>
            ) : (
              dueToday.map((row: any) => (
                <Link
                  key={row._id}
                  href={`/engineer/work-orders/${row._id}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.serviceType || row.woNumber || "Work order"}</p>
                    <p className="text-[11px] text-muted-foreground">{dueLabel(row.scheduledDate)}</p>
                  </div>
                  <EngineerStatusBadge status={row.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2.5 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3 pt-0 sm:p-6 sm:pt-0">
            {overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue jobs.</p>
            ) : (
              overdue.map((row: any) => (
                <Link
                  key={row._id}
                  href={`/engineer/work-orders/${row._id}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.serviceType || row.woNumber || "Work order"}</p>
                    <p className="text-[11px] text-muted-foreground">{dueLabel(row.scheduledDate)}</p>
                  </div>
                  <EngineerStatusBadge status="overdue" label="Overdue" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2.5 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Installed machines</CardTitle>
          <Link
            href="/engineer/machines"
            className="text-xs font-medium hover:underline"
            style={{ color: branding.primaryColor }}
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 sm:p-6 sm:pt-0">
          {machines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No machines on your current jobs.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-md border">
              {machines.map((machine: any) => (
                <li key={machine._id}>
                  <Link
                    href={`/engineer/machines?machineId=${machine._id}`}
                    className="flex items-center gap-2 px-2.5 py-2 hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{machine.productName || "Machine"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {machine.client?.name || "No client"}
                        {machine.serialNumber ? ` · SN ${machine.serialNumber}` : ""}
                      </p>
                    </div>
                    <EngineerStatusBadge status={machine.status} />
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </EngineerPage>
  )
}
