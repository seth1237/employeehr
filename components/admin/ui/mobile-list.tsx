"use client"

import { cn } from "@/lib/utils"

/** Desktop table shell — hidden on small screens */
export function DesktopTableShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("hidden md:block overflow-x-auto", className)}>
      {children}
    </div>
  )
}

/** Mobile card list — hidden from md up */
export function MobileCardList({
  children,
  className,
  label = "Records",
}: {
  children: React.ReactNode
  className?: string
  label?: string
}) {
  return (
    <ul
      className={cn("md:hidden divide-y border-t", className)}
      aria-label={label}
    >
      {children}
    </ul>
  )
}

export function MobileCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <li className={cn("bg-background px-4 py-3 space-y-2", className)}>
      {children}
    </li>
  )
}

/**
 * Sticky bottom action bar for field/mobile workflows.
 * Pads with safe-area; sits above AI chat (z-40).
 */
export function StickyActionBar({
  children,
  className,
  label = "Quick actions",
}: {
  children: React.ReactNode
  className?: string
  label?: string
}) {
  return (
    <>
      <div className="h-20 md:hidden" aria-hidden />
      <div
        role="region"
        aria-label={label}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 px-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]",
          className,
        )}
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">{children}</div>
      </div>
    </>
  )
}
