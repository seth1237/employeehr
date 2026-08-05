"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getDashboardWidgetOrder,
  moveDashboardWidget,
  WIDGET_LABELS,
  type DashboardWidgetId,
} from "@/lib/admin-personalization"

type Props = {
  order: DashboardWidgetId[]
  onChange: (order: DashboardWidgetId[]) => void
}

export function DashboardWidgetsMenu({ order, onChange }: Props) {
  const [localOrder, setLocalOrder] = useState<DashboardWidgetId[]>(order)

  useEffect(() => {
    setLocalOrder(order.length ? order : getDashboardWidgetOrder())
  }, [order])

  const move = (id: DashboardWidgetId, direction: "up" | "down") => {
    const next = moveDashboardWidget(localOrder, id, direction)
    setLocalOrder(next)
    onChange(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white text-slate-700 gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Widgets</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Rearrange dashboard</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-1 py-1 space-y-1">
          {localOrder.map((id, index) => (
            <div
              key={id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span className="truncate">{WIDGET_LABELS[id]}</span>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.preventDefault()
                    move(id, "up")
                  }}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === localOrder.length - 1}
                  onClick={(e) => {
                    e.preventDefault()
                    move(id, "down")
                  }}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
