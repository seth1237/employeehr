"use client"

import Link from "next/link"
import { AlertCircle, Inbox, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function PageLoadingSkeleton({
  title = "Loading",
  rows = 6,
}: {
  title?: string
  rows?: number
}) {
  return (
    <div className="space-y-5 p-4 sm:p-6" aria-busy="true" aria-label={title}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <TableSkeleton rows={rows} />
    </div>
  )
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="border-b bg-muted/40 px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-[18%]" />
            <Skeleton className="h-4 w-[28%]" />
            <Skeleton className="h-4 w-[14%]" />
            <Skeleton className="h-4 w-[12%]" />
            <Skeleton className="h-4 w-[10%]" />
            <Skeleton className="h-8 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        <div className="mt-5">
          {actionHref ? (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  )
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  backHref,
  backLabel = "Go back",
}: {
  title?: string
  message: string
  onRetry?: () => void
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="space-y-4 p-6">
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-2">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Check your internet connection</li>
              <li>The server may be temporarily unavailable</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
        {backHref && (
          <Button asChild variant="outline">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
