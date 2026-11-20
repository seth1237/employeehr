"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getUser } from "@/lib/auth"

const LAST_SHOWN_KEY = "elevate_field_splash_at"
const LONG_AWAY_MS = 8 * 60 * 60 * 1000
const LINE_ONE = "Manage Everything"
const LINE_TWO = "Grow Anything"

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isPhoneViewport() {
  return window.matchMedia("(max-width: 1023px)").matches
}

function wasReloaded() {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
  if (nav?.type === "reload") return true
  return (performance as Performance & { navigation?: { type?: number } }).navigation?.type === 1
}

function shouldPlaySplash() {
  if (!isPhoneViewport()) return false
  if (wasReloaded()) return true
  const last = Number(window.localStorage.getItem(LAST_SHOWN_KEY) || 0)
  return !last || Date.now() - last > LONG_AWAY_MS
}

function rememberSplashShown() {
  window.localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
}

function iosHapticPulse() {
  try {
    navigator.vibrate?.([10, 24, 16, 18, 12])
  } catch {
    // iOS Safari ignores Vibration API; the visual pulse still plays.
  }
}

type SplashCtx = {
  markHomeReady: () => void
}

const FieldSplashContext = createContext<SplashCtx>({ markHomeReady: () => {} })

export function useMarkFieldHomeReady() {
  return useContext(FieldSplashContext).markHomeReady
}

function TypedBlurLine({
  text,
  active,
  onDone,
}: {
  text: string
  active: boolean
  onDone?: () => void
}) {
  const [count, setCount] = useState(0)
  const finished = useRef(false)

  useEffect(() => {
    if (!active || finished.current) return
    if (prefersReducedMotion()) {
      finished.current = true
      setCount(text.length)
      onDone?.()
      return
    }
    if (count >= text.length) {
      finished.current = true
      onDone?.()
      return
    }
    const wait = text[count] === " " ? 36 : 58
    const timer = window.setTimeout(() => setCount((value) => value + 1), wait)
    return () => window.clearTimeout(timer)
  }, [active, count, onDone, text])

  return (
    <p className="text-[1.7rem] font-semibold leading-tight tracking-tight text-slate-900">
      {text.split("").map((char, index) =>
        index >= count ? null : (
          <span key={index} className={index === count - 1 ? "field-char-in" : undefined}>
            {char === " " ? "\u00A0" : char}
          </span>
        ),
      )}
    </p>
  )
}

function FieldLoginSplash({
  homeReady,
  onDone,
}: {
  homeReady: boolean
  onDone: () => void
}) {
  const user = getUser()
  const firstName = String(user?.first_name || "").trim()
  const [lineTwo, setLineTwo] = useState(false)
  const [haptic, setHaptic] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [sequenceDone, setSequenceDone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const startedRest = useRef(false)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const finishTyping = useCallback(() => {
    if (startedRest.current) return
    startedRest.current = true
    const reduced = prefersReducedMotion()
    const hapticAt = reduced ? 80 : 260
    const welcomeAt = reduced ? 220 : 780
    const readyAt = reduced ? 420 : 1500
    window.setTimeout(() => {
      setHaptic(true)
      iosHapticPulse()
    }, hapticAt)
    window.setTimeout(() => setWelcome(true), welcomeAt)
    window.setTimeout(() => setSequenceDone(true), readyAt)
  }, [])

  useEffect(() => {
    if (!sequenceDone) return
    if (!homeReady) {
      const failsafe = window.setTimeout(() => setLeaving(true), 4500)
      return () => window.clearTimeout(failsafe)
    }
    const leave = window.setTimeout(() => setLeaving(true), 320)
    return () => window.clearTimeout(leave)
  }, [homeReady, sequenceDone])

  useEffect(() => {
    if (!leaving) return
    rememberSplashShown()
    const done = window.setTimeout(onDone, 420)
    return () => window.clearTimeout(done)
  }, [leaving, onDone])

  const welcomeText = firstName ? `Welcome back, ${firstName}` : "Welcome back"

  return (
    <div
      className={leaving ? "field-splash-out fixed inset-0 z-[90] flex flex-col items-center justify-center bg-white px-8 text-center" : "fixed inset-0 z-[90] flex flex-col items-center justify-center bg-white px-8 text-center"}
      role="status"
      aria-live="polite"
      aria-label="Loading your workspace"
    >
      <div className={haptic ? "field-haptic flex max-w-sm flex-col items-center" : "flex max-w-sm flex-col items-center"}>
        <div className="min-h-[5.6rem] space-y-1">
          <TypedBlurLine text={LINE_ONE} active onDone={() => setLineTwo(true)} />
          <TypedBlurLine text={LINE_TWO} active={lineTwo} onDone={finishTyping} />
        </div>
        <div className="mt-8 min-h-[2rem]">
          {welcome ? (
            <p className="field-welcome-in text-base font-medium text-slate-600">
              {welcomeText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function FieldSplashProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState<boolean | null>(null)
  const [homeReady, setHomeReady] = useState(false)

  useEffect(() => {
    setShow(shouldPlaySplash())
  }, [])

  const markHomeReady = useCallback(() => {
    setHomeReady(true)
  }, [])

  const value = useMemo(() => ({ markHomeReady }), [markHomeReady])

  return (
    <FieldSplashContext.Provider value={value}>
      {children}
      {show === null ? (
        <div className="pointer-events-none fixed inset-0 z-[90] bg-white lg:hidden" />
      ) : null}
      {show ? (
        <FieldLoginSplash homeReady={homeReady} onDone={() => setShow(false)} />
      ) : null}
    </FieldSplashContext.Provider>
  )
}
