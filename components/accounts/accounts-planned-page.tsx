"use client"

import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountsPageHeader } from "@/components/accounts/accounts-page-header"
import { hexToRgba, useAccountsBranding } from "@/components/accounts/use-accounts-branding"
import {
  ACCOUNTS_NAV_GROUPS,
  getAccountsGroup,
  getAccountsPagesByGroup,
  type AccountsNavPage,
} from "@/lib/accounts-nav"

type AccountsPlannedPageProps = {
  page: AccountsNavPage
}

export function AccountsPlannedPage({ page }: AccountsPlannedPageProps) {
  const branding = useAccountsBranding()
  const group = getAccountsGroup(page.groupId)
  const relatedLive = getAccountsPagesByGroup(page.groupId).filter(
    (item) => item.id !== page.id && (item.status === "live" || item.status === "linked"),
  )

  return (
    <div className="space-y-6">
      <AccountsPageHeader
        eyebrow={group?.label || "Accounts"}
        title={page.label}
        description={page.description}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: branding.primaryColor }} />
              <CardTitle className="text-base">Planned — Phase {page.phase}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This module is part of the systematic Accounts rollout described in{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">ANALYSIS_INDEX.md</code>.
              Phase {page.phase} will introduce the accounting engine and operational modules in order.
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Coming soon
              </Badge>
              <Badge variant="secondary">Phase {page.phase}</Badge>
              {group ? <Badge variant="outline">{group.label}</Badge> : null}
            </div>

            <div
              className="rounded-xl border p-4 text-sm"
              style={{
                borderColor: hexToRgba(branding.primaryColor, 0.15),
                backgroundColor: hexToRgba(branding.primaryColor, 0.04),
              }}
            >
              <p className="font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" style={{ color: branding.primaryColor }} />
                What this module will include
              </p>
              <p className="text-muted-foreground">{page.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild style={{ backgroundColor: branding.primaryColor }}>
                <Link href="/admin/accounts">
                  Accounts Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/accounts/financial-breakdown">Management Analytics</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" style={{ color: branding.secondaryColor }} />
              <CardTitle className="text-base">Available now in {group?.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedLive.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No live modules in this group yet. Start with the Accounts Dashboard.
              </p>
            ) : (
              relatedLive.map((item) => (
                <Link
                  key={item.id}
                  href={item.redirectTo || item.href}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40 transition"
                >
                  <span className="font-medium">{item.label}</span>
                  {item.status === "linked" ? (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">
            Implementation roadmap: Phase 1 builds the double-entry accounting engine (Chart of Accounts,
            Journal Entries, General Ledger). Operational modules then post controlled transactions into
            that engine rather than calculating financial position independently.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function AccountsPlannedPageByGroup({ groupId }: { groupId: string }) {
  const group = ACCOUNTS_NAV_GROUPS.find((g) => g.id === groupId)
  const pages = getAccountsPagesByGroup(groupId).filter((p) => p.status === "planned")

  if (!group) return null

  return (
    <div className="space-y-6">
      <AccountsPageHeader
        eyebrow="Accounts"
        title={group.label}
        description={group.description}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.id}
            href={page.href}
            className="rounded-xl border bg-card p-4 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-medium text-sm">{page.label}</p>
              <Badge variant="outline" className="text-[10px]">
                Phase {page.phase}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
