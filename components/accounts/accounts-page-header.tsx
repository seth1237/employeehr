"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hexToRgba, useAccountsBranding } from "@/components/accounts/use-accounts-branding"

type AccountsPageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string
  actions?: React.ReactNode
}

export function AccountsPageHeader({
  eyebrow = "Accounts",
  title,
  description,
  backHref,
  actions,
}: AccountsPageHeaderProps) {
  const branding = useAccountsBranding()
  const primaryBorderColor = hexToRgba(branding.primaryColor, 0.18)
  const primarySoftColor = hexToRgba(branding.primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(branding.secondaryColor, 0.08)
  const resolvedBackHref = backHref === undefined ? "/admin/accounts" : backHref

  return (
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
            <Button variant="ghost" size="sm" asChild className="h-7 px-2 -ml-2 mb-1 text-muted-foreground">
              <Link href={resolvedBackHref}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Accounts
              </Link>
            </Button>
          ) : null}
          <p className="text-sm font-medium tracking-wide" style={{ color: branding.primaryColor }}>
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
  )
}
