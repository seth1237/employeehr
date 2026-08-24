"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getAccountsGroup,
  getAccountsModuleNavPages,
  resolveAccountsPageFromPathname,
  type AccountsNavPage,
} from "@/lib/accounts-nav"
import { hexToRgba, useAccountsBranding } from "@/components/accounts/use-accounts-branding"

function pageHref(page: AccountsNavPage) {
  return page.redirectTo || page.href
}

function isPageActive(pathname: string, page: AccountsNavPage) {
  const normalized = pathname.replace(/\/$/, "") || pathname
  const targets = [page.href, page.redirectTo].filter(Boolean) as string[]
  return targets.some((target) => {
    const base = target.replace(/\/$/, "")
    return (
      normalized === base ||
      normalized.startsWith(`${base}/`) ||
      (base.endsWith("/categories") &&
        normalized.startsWith("/admin/accounts/expenses/categories/"))
    )
  })
}

type AccountsModuleNavProps = {
  groupId?: string
  className?: string
}

export function AccountsModuleNav({
  groupId: groupIdProp,
  className = "",
}: AccountsModuleNavProps) {
  const pathname = usePathname() || ""
  const branding = useAccountsBranding()
  const resolvedPage = resolveAccountsPageFromPathname(pathname)
  const groupId = groupIdProp || resolvedPage?.groupId

  if (!groupId || groupId === "overview") return null

  const group = getAccountsGroup(groupId)
  const pages = getAccountsModuleNavPages(groupId)
  if (pages.length < 2) return null

  return (
    <div
      className={`rounded-xl border bg-background/80 p-2 shadow-sm backdrop-blur-sm ${className}`}
      style={{ borderColor: hexToRgba(branding.primaryColor, 0.16) }}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {group?.label || "Module"}
        </p>
        <Badge variant="outline" className="text-[10px] font-normal">
          {pages.filter((p) => p.status !== "planned").length} pages
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pages.map((page) => {
          const href = pageHref(page)
          const active = isPageActive(pathname, page)
          const planned = page.status === "planned"
          return (
            <Button
              key={page.id}
              asChild
              size="sm"
              variant={active ? "default" : "outline"}
              className={`h-8 px-3 text-xs ${planned && !active ? "opacity-70" : ""}`}
              style={
                active
                  ? {
                      backgroundColor: branding.primaryColor,
                      borderColor: branding.primaryColor,
                    }
                  : undefined
              }
            >
              <Link href={href} title={page.description}>
                {page.label}
                {planned ? (
                  <span className="ml-1 text-[10px] opacity-70">soon</span>
                ) : null}
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
