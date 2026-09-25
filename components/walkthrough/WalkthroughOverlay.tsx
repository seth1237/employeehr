"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { WalkthroughStep } from "./steps"
import type { SectionReminder } from "@/lib/walkthrough"

type Rect = { top: number; left: number; width: number; height: number }

function readTarget(target?: string): Rect | null {
  if (!target || typeof document === "undefined") return null
  const el = document.querySelector(`[data-tour="${CSS.escape(target)}"]`) as HTMLElement | null
  if (!el) return null
  const box = el.getBoundingClientRect()
  if (box.width < 4 || box.height < 4) return null
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  }
}

function cardPosition(rect: Rect | null) {
  if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
  const below = rect.top + rect.height + 16
  const above = rect.top - 16
  const preferBelow = below + 280 < window.innerHeight
  return {
    top: preferBelow ? `${below}px` : `${Math.max(16, above - 260)}px`,
    left: `${Math.min(Math.max(24, rect.left), window.innerWidth - 420)}px`,
    transform: "none",
  }
}

export function WalkthroughOverlay({
  step,
  index,
  total,
  reminder,
  onNext,
  onBack,
  onSkip,
  onDismissReminder,
}: {
  step?: WalkthroughStep
  index: number
  total: number
  reminder?: SectionReminder | null
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onDismissReminder: (openHref?: string) => void
}) {
  const target = reminder?.target || step?.target
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    const update = () => setRect(readTarget(target))
    update()
    if (target) {
      const el = document.querySelector(`[data-tour="${CSS.escape(target)}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
    }
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    const timer = window.setInterval(update, 400)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
      window.clearInterval(timer)
    }
  }, [target])

  const cardStyle = useMemo(() => cardPosition(rect), [rect])
  const isLast = index >= total - 1
  const title = reminder?.title || step?.title || ""
  const description = reminder?.description || step?.description || ""

  return (
    <div className="fixed inset-0 z-[80] hidden lg:block" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="absolute inset-0 bg-slate-950/55" onClick={reminder ? () => onDismissReminder() : undefined} />

      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-white shadow-[0_0_0_9999px_rgba(15,23,42,0.58)]"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        >
          <div className="absolute inset-0 animate-pulse rounded-xl ring-4 ring-sky-300/70" />
        </div>
      ) : null}

      <div
        className="absolute w-[min(420px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        style={cardStyle}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {reminder ? "Section reminder" : `Step ${index + 1} of ${total}`}
          </p>
          {!reminder ? (
            <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={onSkip}>
              Skip tour
            </button>
          ) : null}
        </div>

        {!reminder ? (
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-600 transition-all"
              style={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }}
            />
          </div>
        ) : null}

        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        {step?.bullets?.length ? (
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            {step.bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {step?.actions?.length ? (
          <div className="mt-4 grid gap-2">
            {step.actions.map((action) => (
              <Button key={action.href} asChild variant="outline" size="sm" className="justify-start">
                <Link href={action.href} onClick={onNext}>
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          {reminder ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => onDismissReminder()}>
                Later
              </Button>
              <Button size="sm" onClick={() => onDismissReminder(reminder.href)}>
                Open section
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onBack} disabled={index === 0}>
                Back
              </Button>
              <Button size="sm" onClick={onNext}>
                {isLast ? "Go to dashboard" : index === 0 ? "Start tour" : "Next"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
