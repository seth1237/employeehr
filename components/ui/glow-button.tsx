"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-xl px-6 py-3 font-medium text-white",
          "bg-slate-950 transition-transform duration-300 ease-out active:translate-y-px",
          "shadow-[0_0_16px_rgba(16,185,129,0.45),0_0_36px_rgba(15,118,110,0.28)]",
          "hover:shadow-[0_0_24px_rgba(45,212,191,0.7),0_0_52px_rgba(15,118,110,0.45)]",
          "before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_50%_-10%,rgba(45,212,191,0.5),transparent_62%)]",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-teal-300/50",
          className,
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
      </button>
    )
  },
)

GlowButton.displayName = "GlowButton"
