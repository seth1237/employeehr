"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, BookOpen, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  dismissSalesTour,
  setSalesTourStep,
  touchAdminVisitAndShouldShowTour,
  type SalesTourStep,
} from "@/lib/admin-personalization"

const STEPS: Array<{
  id: SalesTourStep
  title: string
  description: string
  href: string
  pathMatch: (path: string) => boolean
}> = [
  {
    id: "inventory",
    title: "Set up products",
    description: "Create products and add opening stock before selling.",
    href: "/admin/stock/add-inventory",
    pathMatch: (p) => p.startsWith("/admin/stock/add-inventory"),
  },
  {
    id: "quotation",
    title: "Create a quotation",
    description: "Build a quote for your customer with items, pricing, and terms.",
    href: "/admin/stock/quotations?action=new",
    pathMatch: (p) => p.startsWith("/admin/stock/quotations"),
  },
  {
    id: "invoice",
    title: "Convert to invoice",
    description: "Turn an approved quote into an invoice in one click.",
    href: "/admin/stock/invoices",
    pathMatch: (p) => p.startsWith("/admin/stock/invoices"),
  },
  {
    id: "dispatch",
    title: "Dispatch delivery",
    description: "Assign packing and delivery once the invoice is ready.",
    href: "/admin/stock/dispatch",
    pathMatch: (p) => p.startsWith("/admin/stock/dispatch"),
  },
]

/** Only mount on the admin dashboard — shows once for new users, or after 14+ days idle. */
export function SalesWorkflowTour({ pathname = "/admin" }: { pathname?: string }) {
  const [current, setCurrent] = useState<SalesTourStep | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const decision = touchAdminVisitAndShouldShowTour()
    if (!decision.show) {
      setVisible(false)
      setCurrent(null)
      return
    }
    setCurrent(decision.step)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible || !current || current === "completed") return
    const idx = STEPS.findIndex((s) => s.id === current)
    if (idx < 0) return
    if (STEPS[idx].pathMatch(pathname)) {
      const next = STEPS[idx + 1]?.id || "completed"
      if (next !== current) {
        setSalesTourStep(next)
        setCurrent(next === "completed" ? null : next)
        if (next === "completed") setVisible(false)
      }
    }
  }, [pathname, current, visible])

  if (!visible || !current || current === "completed") return null

  const activeIndex = STEPS.findIndex((s) => s.id === current)
  const step = STEPS[activeIndex] || STEPS[0]

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Sales workflow guide</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              dismissSalesTour()
              setVisible(false)
            }}
            aria-label="Dismiss guide"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Learn stock → quote → invoice → dispatch without leaving the app.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="grid gap-2 sm:grid-cols-4">
          {STEPS.map((s, idx) => {
            const done = idx < activeIndex
            const active = s.id === current
            return (
              <li
                key={s.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  active
                    ? "border-primary bg-background shadow-sm"
                    : done
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-border bg-background/60"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {done ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                  {s.title}
                </div>
              </li>
            )
          })}
        </ol>

        <div className="rounded-lg border bg-background p-4">
          <p className="font-medium">{step.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          <Button asChild className="mt-3" size="sm">
            <Link href={step.href}>
              Go to step
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
