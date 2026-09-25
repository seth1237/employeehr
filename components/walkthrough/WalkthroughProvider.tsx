"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"
import {
  START_WALKTHROUGH_EVENT,
  completeWalkthrough,
  getIgnoredSectionReminder,
  getWalkthroughState,
  isDesktopWalkthrough,
  markSectionReminded,
  recordSectionVisit,
  saveWalkthroughState,
  shouldStartFirstTour,
  skipWalkthrough,
  type SectionReminder,
  type WalkthroughPortal,
} from "@/lib/walkthrough"
import { getWalkthroughSteps } from "./steps"
import { WalkthroughOverlay } from "./WalkthroughOverlay"

export function WalkthroughProvider({
  portal,
  children,
}: {
  portal: WalkthroughPortal
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const user = getUser()
  const steps = useMemo(() => getWalkthroughSteps(portal, user?.role), [portal, user?.role])
  const [desktop, setDesktop] = useState(false)
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [reminder, setReminder] = useState<SectionReminder | null>(null)

  useEffect(() => {
    const sync = () => setDesktop(isDesktopWalkthrough())
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  useEffect(() => {
    if (!pathname) return
    recordSectionVisit(pathname, portal)
  }, [pathname, portal])

  const startTour = useCallback(
    (from = 0) => {
      if (!isDesktopWalkthrough()) return
      const state = getWalkthroughState(portal)
      saveWalkthroughState(portal, { ...state, currentStep: from, lastShownAt: Date.now() })
      setReminder(null)
      setStepIndex(from)
      setOpen(true)
    },
    [portal],
  )

  useEffect(() => {
    if (!desktop) {
      setOpen(false)
      return
    }

    const timer = window.setTimeout(() => {
      if (shouldStartFirstTour(portal)) {
        startTour(0)
        return
      }

      const ignored = getIgnoredSectionReminder(portal)
      if (ignored) {
        setReminder(ignored)
        setOpen(true)
      }
    }, 450)

    return () => window.clearTimeout(timer)
  }, [desktop, portal, startTour])

  useEffect(() => {
    const onReplay = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.portal && detail.portal !== portal) return
      if (!isDesktopWalkthrough()) return
      startTour(0)
    }
    window.addEventListener(START_WALKTHROUGH_EVENT, onReplay)
    return () => window.removeEventListener(START_WALKTHROUGH_EVENT, onReplay)
  }, [portal, startTour])

  useEffect(() => {
    document.body.dataset.walkthrough = open && desktop ? "open" : ""
    return () => {
      delete document.body.dataset.walkthrough
    }
  }, [open, desktop])

  const closeTour = (completed: boolean) => {
    if (completed) completeWalkthrough(portal)
    else skipWalkthrough(portal)
    setOpen(false)
    setReminder(null)
  }

  const onNext = () => {
    if (stepIndex >= steps.length - 1) {
      closeTour(true)
      return
    }
    const next = stepIndex + 1
    setStepIndex(next)
    saveWalkthroughState(portal, { ...getWalkthroughState(portal), currentStep: next, lastShownAt: Date.now() })
  }

  const onBack = () => {
    const next = Math.max(0, stepIndex - 1)
    setStepIndex(next)
    saveWalkthroughState(portal, { ...getWalkthroughState(portal), currentStep: next })
  }

  const onDismissReminder = (href?: string) => {
    if (reminder) markSectionReminded(portal, reminder.id)
    setOpen(false)
    setReminder(null)
    if (href) router.push(href)
  }

  return (
    <>
      {children}
      {open && desktop ? (
        <WalkthroughOverlay
          step={reminder ? undefined : steps[stepIndex]}
          index={stepIndex}
          total={steps.length}
          reminder={reminder}
          onNext={onNext}
          onBack={onBack}
          onSkip={() => closeTour(false)}
          onDismissReminder={onDismissReminder}
        />
      ) : null}
    </>
  )
}
