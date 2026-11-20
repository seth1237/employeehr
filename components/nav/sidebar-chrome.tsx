"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { ChevronDown, ChevronLeft, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ICON_STROKE, NAV_ICON_SIZE } from "@/lib/nav-icons"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const SIDEBAR_EXPANDED = "lg:w-[256px]"
export const SIDEBAR_COLLAPSED = "lg:w-[72px]"

export function isExactOrNestedPath(pathname: string, href: string, exactRoots: string[] = []) {
  const clean = href.split("?")[0]
  if (exactRoots.includes(clean) || clean.split("/").filter(Boolean).length === 1) {
    return pathname === clean
  }
  return pathname === clean || pathname.startsWith(`${clean}/`)
}

export function SidebarFrame({
  isOpen,
  isCollapsed,
  onToggle,
  children,
}: {
  isOpen: boolean
  isCollapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <TooltipProvider delayDuration={200}>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          aria-label="Close navigation"
          onClick={onToggle}
        />
      ) : null}
      <aside
        data-tour="wt-sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[256px] flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 lg:static",
          isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {children}
      </aside>
    </TooltipProvider>
  )
}

export function SidebarBrand({
  href,
  title,
  subtitle,
  isCollapsed,
  onMobileClose,
}: {
  href: string
  title: string
  subtitle?: string
  isCollapsed: boolean
  onMobileClose?: () => void
}) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-slate-200",
        isCollapsed ? "justify-center px-2" : "justify-between px-3",
      )}
    >
      <Link href={href} className={cn("flex min-w-0 items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
        <div
          className="h-8 w-8 shrink-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: "var(--company-logo-url)" }}
          aria-hidden
        />
        {!isCollapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{title}</p>
            {subtitle ? <p className="truncate text-[11px] text-slate-500">{subtitle}</p> : null}
          </div>
        ) : null}
      </Link>
      {!isCollapsed && onMobileClose ? (
        <button
          type="button"
          onClick={onMobileClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Close navigation"
        >
          <ChevronLeft size={18} strokeWidth={ICON_STROKE} />
        </button>
      ) : null}
    </div>
  )
}

export function SidebarSectionLabel({
  label,
  isCollapsed,
  collapsed,
  onToggle,
}: {
  label: string
  isCollapsed: boolean
  collapsed?: boolean
  onToggle?: () => void
}) {
  if (isCollapsed) return null
  if (!onToggle) {
    return (
      <p className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-slate-500">
        {label}
      </p>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="mb-0.5 flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      <span>{label}</span>
      <ChevronDown
        size={14}
        strokeWidth={ICON_STROKE}
        className={cn("text-slate-400 transition-transform duration-150", collapsed ? "-rotate-90" : "rotate-0")}
      />
    </button>
  )
}

export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  isActive,
  isCollapsed,
  badge,
  dataTour,
  title,
  onClick,
}: {
  href: string
  label: string
  icon: LucideIcon
  isActive: boolean
  isCollapsed: boolean
  badge?: React.ReactNode
  dataTour?: string
  title?: string
  onClick?: () => void
}) {
  const link = (
    <Link
      href={href}
      data-tour={dataTour}
      title={!isCollapsed ? title : undefined}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center rounded-md text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]",
        isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
        isActive ? "font-medium" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
      style={
        isActive
          ? {
              backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
              color: "var(--brand-primary)",
            }
          : undefined
      }
    >
      {isActive ? (
        <span
          className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full"
          style={{ backgroundColor: "var(--brand-primary)" }}
          aria-hidden
        />
      ) : null}
      <span className="relative shrink-0">
        <Icon size={NAV_ICON_SIZE} strokeWidth={ICON_STROKE} />
        {isCollapsed && badge ? (
          <span className="absolute -right-1.5 -top-1.5">{badge}</span>
        ) : null}
      </span>
      {!isCollapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge}
        </>
      ) : null}
    </Link>
  )

  if (!isCollapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function SidebarFooter({
  isCollapsed,
  onCollapseToggle,
  onLogout,
  userName,
  userRole,
  showCollapse = true,
}: {
  isCollapsed: boolean
  onCollapseToggle?: () => void
  onLogout: () => void
  userName?: string
  userRole?: string
  showCollapse?: boolean
}) {
  const initials =
    (userName || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"

  return (
    <div className="shrink-0 border-t border-slate-200 p-2">
      {!isCollapsed && userName ? (
        <div className="mb-1 flex items-center gap-2.5 px-1.5 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-slate-900">{userName}</p>
            {userRole ? (
              <p className="truncate text-[11px] capitalize text-slate-500">{userRole.replaceAll("_", " ")}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {showCollapse && onCollapseToggle ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onCollapseToggle}
              className={cn(
                "hidden h-9 w-full items-center rounded-md text-[13px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:flex",
                isCollapsed ? "justify-center" : "gap-2.5 px-2.5",
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen size={NAV_ICON_SIZE} strokeWidth={ICON_STROKE} />
              ) : (
                <>
                  <PanelLeftClose size={NAV_ICON_SIZE} strokeWidth={ICON_STROKE} />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          {isCollapsed ? (
            <TooltipContent side="right" sideOffset={8}>
              Expand sidebar
            </TooltipContent>
          ) : null}
        </Tooltip>
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onLogout}
            className={cn(
              "flex h-9 w-full items-center rounded-md text-[13px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
              isCollapsed ? "justify-center" : "gap-2.5 px-2.5",
            )}
            aria-label="Log out"
          >
            <LogOut size={NAV_ICON_SIZE} strokeWidth={ICON_STROKE} />
            {!isCollapsed ? <span>Log out</span> : null}
          </button>
        </TooltipTrigger>
        {isCollapsed ? (
          <TooltipContent side="right" sideOffset={8}>
            Log out
          </TooltipContent>
        ) : null}
      </Tooltip>
    </div>
  )
}

export function SidebarCount({ value }: { value: number }) {
  if (value <= 0) return null
  return (
    <span className="min-w-4 rounded-full bg-slate-100 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-slate-600">
      {value > 99 ? "99+" : value}
    </span>
  )
}
