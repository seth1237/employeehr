"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { engineeringApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, BarChart3, Inbox, Palmtree, CircleDollarSign, Wrench, Banknote, Users, ListTodo } from "lucide-react"
import { isTechnicalServiceLead } from "@/lib/engineer-roles"
import { EngineerHeader, EngineerKpi, EngineerPage } from "@/components/engineer/engineer-ui"
import { useEngineerBranding } from "@/components/engineer/branding"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { useMarkFieldHomeReady } from "@/components/field/login-splash"
import { engineerFirstName, pickEngineerGreeting } from "@/lib/engineer-greeting"

function dueLabel(value?: string) {
  if (!value) return "Unscheduled"
  return new Date(value).toLocaleDateString()
}

export default function EngineerDashboard() {
  const branding = useEngineerBranding()
  const router = useRouter()
  const markHomeReady = useMarkFieldHomeReady()
  const user = getUser()
  const firstName = engineerFirstName(user)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    engineeringApi
      .getDashboard()
      .then((res) => setData(res.data || res))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) markHomeReady()
  }, [loading, markHomeReady])

  const greeting = useMemo(() => {
    if (loading) return "Today"
    return pickEngineerGreeting({ firstName, pendingCount: data?.myOpen })
  }, [firstName, data?.myOpen, loading])

  if (loading) return <PageLoadingSkeleton title="Today" />

  const stats = [
    { label: "Open jobs", value: data?.myOpen ?? 0, href: "/engineer/work-orders?filter=mine", icon: ClipboardList },
    { label: "Overdue", value: data?.overdue ?? 0, href: "/engineer/work-orders?status=overdue", icon: AlertTriangle },
    { label: "Requests", value: data?.openRequests ?? 0, href: "/engineer/requests", icon: Inbox },
    { label: "Machines", value: data?.assets ?? 0, href: "/engineer/machines", icon: Wrench },
  ]
  const lead = isTechnicalServiceLead(user?.role)
  const extras = [
    { label: "Reports", href: "/engineer/reports", icon: BarChart3 },
    { label: "Activities", href: "/engineer/activities", icon: ListTodo },
    ...(lead ? [{ label: "Team", href: "/engineer/team", icon: Users }] : []),
    { label: "Leave", href: "/engineer/leave", icon: Palmtree },
    { label: "Payroll", href: "/engineer/payroll", icon: Banknote },
    { label: "Expenses", href: "/engineer/expenses", icon: CircleDollarSign },
  ]

  const overdue = (data?.overdueOrders || []).slice(0, 4)
  const currentDuty = (data?.currentOrders || data?.dueTodayOrders || []).slice(0, 4)
  const upcoming = (data?.upcomingOrders || []).slice(0, 4)
  const completed = (data?.completedOrders || []).slice(0, 4)
  const duty =
    overdue.length > 0
      ? {
          title: "Overdue",
          href: "/engineer/work-orders?status=overdue",
          empty: "No overdue jobs.",
          items: overdue,
          total: (data?.overdueOrders || []).length,
        }
      : currentDuty.length > 0
        ? {
            title: "Current duty",
            href: "/engineer/work-orders?filter=mine",
            empty: "No jobs in progress.",
            items: currentDuty,
            total: (data?.currentOrders || data?.dueTodayOrders || []).length,
          }
        : {
            title: "Scheduled",
            href: "/engineer/work-orders?filter=mine",
            empty: "Nothing scheduled yet.",
            items: upcoming,
            total: (data?.upcomingOrders || []).length,
          }

  return (
    <EngineerPage>
      <EngineerHeader
        title={greeting}
        description={
          lead
            ? "Team jobs, unassigned tickets, and your own work for the day."
            : "Your open work, overdue jobs, and recent wins."
        }
      />

      <div data-tour="wt-dashboard" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {extras.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800"
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: branding.primaryColor }} />
              {item.label}
            </Link>
          )
        })}
      </div>

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold sm:text-base">{duty.title}</h2>
          {duty.total > 4 ? (
            <Link
              href={duty.href}
              className="text-xs font-medium hover:underline"
              style={{ color: branding.primaryColor }}
            >
              View all
            </Link>
          ) : null}
        </div>

        {duty.items.length === 0 ? (
          <p className="rounded-xl border bg-white px-4 py-6 text-center text-sm text-muted-foreground">
            {duty.empty}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {duty.items.map((row: any) => (
              <ShimmerButton
                key={row._id}
                className="h-auto w-full min-h-[3.5rem] justify-between whitespace-normal px-4 py-3"
                borderRadius="0.9rem"
                background={branding.primaryColor}
                onClick={() => router.push(`/engineer/work-orders/${row._id}`)}
              >
                <span className="relative z-10 flex w-full min-w-0 items-center justify-between gap-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold leading-tight">
                      {row.serviceType || row.woNumber || "Work order"}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-normal text-white/80">
                      {row.machine?.productName || row.machine?.client?.name || "Job"}
                      {" · "}
                      {dueLabel(row.scheduledDate)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
                </span>
              </ShimmerButton>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold sm:text-base">
            {completed.length === 0
              ? "Your record shall appear here"
              : firstName
                ? `You’ve been so productive, ${firstName}!`
                : "You’ve been so productive!"}
          </h2>
          {completed.length > 0 ? (
            <Link
              href="/engineer/work-orders?filter=all&status=completed"
              className="text-xs font-medium hover:underline"
              style={{ color: branding.primaryColor }}
            >
              View all
            </Link>
          ) : null}
        </div>
        {completed.length === 0 ? (
          <p className="rounded-xl border bg-white px-4 py-6 text-center text-sm text-muted-foreground">
            Finish a job and it will land here.
          </p>
        ) : (
          <ul className="space-y-2">
            {completed.map((row: any) => (
              <li key={row._id}>
                <Link
                  href={`/engineer/work-orders/${row._id}`}
                  className="flex items-center gap-3 rounded-xl border bg-white px-3 py-3"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--brand-primary-50)", color: branding.primaryColor }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {row.serviceType || row.woNumber || "Job"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {row.machine?.productName || row.machine?.client?.name || "Machine"}
                      {row.completedDate ? ` · ${dueLabel(row.completedDate)}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </EngineerPage>
  )
}
