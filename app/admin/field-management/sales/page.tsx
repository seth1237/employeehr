"use client"

import Link from "next/link"
import { CalendarDays, ContactRound, Gauge, NotebookPen } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const MODULES = [
  {
    title: "Planner",
    description: "Build and approve the sales route",
    href: "/admin/field-management/planner",
    icon: CalendarDays,
  },
  {
    title: "Visit reports",
    description: "What happened on each call",
    href: "/admin/field-management/reports",
    icon: NotebookPen,
  },
  {
    title: "Performance",
    description: "Targets and rep activity",
    href: "/admin/field-management/performance",
    icon: Gauge,
  },
  {
    title: "Sales reports",
    description: "Quotes, visits, and approvals",
    href: "/admin/sales-reports",
    icon: ContactRound,
  },
]

export default function FieldSalesFolderPage() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="erp-page-header rounded-2xl px-4 py-3">
        <p className="erp-page-eyebrow text-sm font-medium tracking-wide">Field · Sales</p>
        <h1 className="text-xl font-semibold tracking-tight">Sales modules</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Admin view of the sales team: planner, visit reports, performance, and approvals.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODULES.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className="block">
              <Card className="h-full transition-colors hover:bg-slate-50">
                <CardContent className="flex gap-3 pt-5">
                  <span className="erp-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-medium text-slate-900">{item.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">{item.description}</span>
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
