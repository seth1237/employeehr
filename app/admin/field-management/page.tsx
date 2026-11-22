"use client"

import Link from "next/link"
import { CalendarDays, ContactRound, Cpu, Gauge, Hammer, NotebookPen, QrCode, ScanLine, Wallet, Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const SALES_MODULES = [
  {
    title: "Planner",
    description: "Approve and follow the sales route for tomorrow",
    href: "/admin/field-management/planner",
    icon: CalendarDays,
  },
  {
    title: "Visit reports",
    description: "Outcomes filed by sales reps in the field",
    href: "/admin/field-management/reports",
    icon: NotebookPen,
  },
  {
    title: "Performance",
    description: "Targets, quotas, and rep activity",
    href: "/admin/field-management/performance",
    icon: Gauge,
  },
  {
    title: "Sales reports",
    description: "Quotes, visits, and approval history",
    href: "/admin/sales-reports",
    icon: ContactRound,
  },
]

const TECHNICAL_MODULES = [
  {
    title: "Engineer overview",
    description: "Jobs, installations, and field costings",
    href: "/admin/field-management/technical-service",
    icon: Wrench,
  },
  {
    title: "QR codes",
    description: "Print unique machine labels for client reporting",
    href: "/admin/field-management/technical-service/qr-codes",
    icon: QrCode,
  },
  {
    title: "Client reports",
    description: "Service, breakdown, and product requests from scans",
    href: "/admin/field-management/technical-service/reports",
    icon: ScanLine,
  },
  {
    title: "Tool requests",
    description: "Approve tools requested by engineers",
    href: "/admin/field-management/technical-service/tools",
    icon: Hammer,
  },
  {
    title: "Expenses",
    description: "Engineer claims before they reach accounts",
    href: "/admin/field-management/technical-service/expenses",
    icon: Wallet,
  },
  {
    title: "Installed machines",
    description: "Client equipment, tickets, and service history",
    href: "/admin/clients/installed-machines",
    icon: Cpu,
  },
]

function ModuleGrid({
  modules,
}: {
  modules: typeof SALES_MODULES
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modules.map((item) => {
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
  )
}

export default function FieldManagementHubPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="erp-page-header rounded-2xl px-4 py-3">
        <p className="erp-page-eyebrow text-sm font-medium tracking-wide">Field</p>
        <h1 className="text-xl font-semibold tracking-tight">Field teams</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Sales reps and technical service engineers. Open a folder to work the modules for that team.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ContactRound className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Sales</h2>
        </div>
        <ModuleGrid modules={SALES_MODULES} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Technical Service</h2>
        </div>
        <ModuleGrid modules={TECHNICAL_MODULES} />
      </section>
    </div>
  )
}
