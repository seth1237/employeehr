"use client"

import { ACTION_ICON_SIZE, ACTION_ICONS, ICON_STROKE, type ActionIconName } from "@/lib/nav-icons"
import { cn } from "@/lib/utils"

export function AppIcon({
  name,
  size = ACTION_ICON_SIZE,
  className,
  title,
}: {
  name: ActionIconName
  size?: number
  className?: string
  title?: string
}) {
  const Icon = ACTION_ICONS[name]
  return <Icon size={size} strokeWidth={ICON_STROKE} className={cn("shrink-0", className)} aria-hidden={!title} title={title} />
}
