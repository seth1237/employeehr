"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { AlertTriangle, ChevronRight, ClipboardList, Inbox, Wrench } from "lucide-react"
import { EngineerHeader, EngineerKpi, EngineerPage } from "@/components/engineer/engineer-ui"
import { useEngineerBranding } from "@/components/engineer/branding"
import { ShimmerButton } from "@/components/ui/shimmer-button"

function dueLabel(value?: string) {
  if (!value) return "Unscheduled"
  return new Date(value).toLocaleDateString()
}

export default function EngineerDashboard() {
  const branding = useEngineerBranding()
  const router = useRouter()
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
    { label: "Requests", value: data?.openRequests ?? 0, href: "/engineer/requests", icon: Inbox },
    { label: "Machines", value: data?.assets ?? 0, href: "/engineer/machines", icon: Wrench },
  ]

  const overdue = (data?.overdueOrders || []).slice(0, 4)
  const overdueTotal = (data?.overdueOrders || []).length

  return (
    <EngineerPage>
      <EngineerHeader title="Today" description="Your open work and overdue jobs." />

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

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold sm:text-base">Overdue</h2>
          {overdueTotal > 4 ? (
            <Link
              href="/engineer/work-orders?status=overdue"
              className="text-xs font-medium hover:underline"
              style={{ color: branding.primaryColor }}
            >
              View all
            </Link>
          ) : null}
        </div>

        {overdue.length === 0 ? (
          <p className="rounded-xl border bg-white px-4 py-6 text-center text-sm text-muted-foreground">
            No overdue jobs.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {overdue.map((row: any) => (
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
    </EngineerPage>
  )
}
