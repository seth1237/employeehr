"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AccountsModuleNav } from "@/components/accounts/accounts-module-nav"
import { hexToRgba, useAccountsBranding } from "@/components/accounts/use-accounts-branding"
import { getAccountsNestedBackTarget } from "@/lib/accounts-nav"

export type FinanceKpi = {
  label: string
  value: string | number
  prefix?: string
  href?: string
  accent?: "primary" | "secondary" | "success" | "danger"
}

type FinanceDocumentShellProps = {
  eyebrow?: string
  title: string
  description?: string
  /** Explicit back URL. Omit to auto-link nested pages to their module hub. Pass null to hide. */
  backHref?: string | null
  backLabel?: string
  kpis?: FinanceKpi[]
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  children: React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  /** Accounts module group for top page buttons. Auto-detected from path when omitted. */
  moduleNavGroupId?: string
  /** Hide module nav (rare). Default shows when group has 2+ pages. */
  hideModuleNav?: boolean
}

export function FinanceDocumentShell({
  eyebrow = "Accounts",
  title,
  description,
  backHref,
  backLabel,
  kpis = [],
  actions,
  toolbar,
  children,
  onRefresh,
  refreshing,
  moduleNavGroupId,
  hideModuleNav = false,
}: FinanceDocumentShellProps) {
  const pathname = usePathname() || ""
  const branding = useAccountsBranding()
  const primarySoftColor = hexToRgba(branding.primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(branding.secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(branding.primaryColor, 0.18)

  const autoBack = backHref === undefined ? getAccountsNestedBackTarget(pathname) : null
  const resolvedBackHref =
    backHref === null ? null : backHref !== undefined ? backHref : autoBack?.href || null
  const resolvedBackLabel =
    backLabel ||
    (backHref !== undefined && backHref !== null
      ? "Back"
      : autoBack?.label || "Back")

  const kpiColor = (accent?: FinanceKpi["accent"]) => {
    if (accent === "success") return "#059669"
    if (accent === "danger") return "#dc2626"
    if (accent === "secondary") return branding.secondaryColor
    return branding.primaryColor
  }

  return (
    <div className="space-y-4">
      {!hideModuleNav ? (
        <AccountsModuleNav groupId={moduleNavGroupId} />
      ) : null}

      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            {resolvedBackHref ? (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 px-2 -ml-2 mb-1 text-muted-foreground"
              >
                <Link href={resolvedBackHref}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  {resolvedBackLabel}
                </Link>
              </Button>
            ) : null}
            <p className="text-sm font-medium tracking-wide" style={{ color: branding.primaryColor }}>
              {eyebrow}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onRefresh ? (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9">
                <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            ) : null}
            {actions}
          </div>
        </div>

        {kpis.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const content = (
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase font-medium tracking-wide text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: kpiColor(kpi.accent) }}>
                    {kpi.prefix ? (
                      <span className="text-xs font-normal opacity-50 mr-1">{kpi.prefix}</span>
                    ) : null}
                    {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                </CardContent>
              )
              return kpi.href ? (
                <Link key={kpi.label} href={kpi.href}>
                  <Card className="border-none shadow-sm bg-background/60 backdrop-blur-sm hover:shadow-md transition">
                    {content}
                  </Card>
                </Link>
              ) : (
                <Card key={kpi.label} className="border-none shadow-sm bg-background/60 backdrop-blur-sm">
                  {content}
                </Card>
              )
            })}
          </div>
        ) : null}
      </div>

      {toolbar ? (
        <div className="rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">{toolbar}</div>
      ) : null}

      {children}
    </div>
  )
}

export function FinanceTableCard({
  title,
  children,
  headerRight,
}: {
  title: string
  children: React.ReactNode
  headerRight?: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden border shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {headerRight}
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}
