"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountsModuleNav } from "@/components/accounts/accounts-module-nav"
import { getAccountsNestedBackTarget } from "@/lib/accounts-nav"

type AccountsPageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string | null
  backLabel?: string
  actions?: React.ReactNode
  moduleNavGroupId?: string
  hideModuleNav?: boolean
}

export function AccountsPageHeader({
  eyebrow = "Accounts",
  title,
  description,
  backHref,
  backLabel,
  actions,
  moduleNavGroupId,
  hideModuleNav = false,
}: AccountsPageHeaderProps) {
  const pathname = usePathname() || ""

  const autoBack = backHref === undefined ? getAccountsNestedBackTarget(pathname) : null
  const resolvedBackHref =
    backHref === null ? null : backHref !== undefined ? backHref : autoBack?.href || null
  const resolvedBackLabel =
    backLabel ||
    (backHref !== undefined && backHref !== null
      ? "Back to Accounts"
      : autoBack?.label || "Back")

  return (
    <div className="space-y-4">
      {!hideModuleNav ? (
        <AccountsModuleNav groupId={moduleNavGroupId} />
      ) : null}
      <div className="erp-page-header rounded-2xl px-4 py-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            {resolvedBackHref ? (
              <Button variant="ghost" size="sm" asChild className="h-7 px-2 -ml-2 mb-1 text-muted-foreground">
                <Link href={resolvedBackHref}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  {resolvedBackLabel}
                </Link>
              </Button>
            ) : null}
            <p className="erp-page-eyebrow text-sm font-medium tracking-wide">
              {eyebrow}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}
