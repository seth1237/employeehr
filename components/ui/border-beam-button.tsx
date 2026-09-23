"use client"

import * as React from "react"

import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"

export interface BorderBeamButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const BorderBeamButton = React.forwardRef<HTMLButtonElement, BorderBeamButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-xl border bg-background px-6 py-3 font-medium text-foreground",
          "transition-colors hover:bg-muted/40",
          className,
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        <BorderBeam size={90} duration={7} borderWidth={2} colorFrom="#0f766e" colorTo="#2dd4bf" />
      </button>
    )
  },
)

BorderBeamButton.displayName = "BorderBeamButton"
