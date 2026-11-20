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
import { cn } from "@/lib/utils"

const SPLASH_KEY = "elevate_field_login_splash"
const LINE_ONE = "Manage Everything"
const LINE_TWO = "Grow Anything"

export function markFieldLoginSplash(role?: string | null) {
  if (typeof window === "undefined") return
  if (role !== "sales_rep" && role !== "technical_service_engineer") return
  sessionStorage.setItem(SPLASH_KEY, "1")
}

function consumeFieldLoginSplash() {
  if (typeof window === "undefined") return false
  const value = sessionStorage.getItem(SPLASH_KEY)
  if (value) sessionStorage.removeItem(SPLASH_KEY)
  return value === "1"
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isPhoneViewport() {
  return window.matchMedia("(max-width: 1023px)").matches
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
  const reduced = typeof window !== "undefined" && prefersReducedMotion()

  useEffect(() => {
    if (!active || finished.current) return
    if (reduced) {
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
    const wait = text[count] === " " ? 28 : 46
    const timer = window.setTimeout(() => setCount((value) => value + 1), wait)
    return () => window.clearTimeout(timer)
  }, [active, count, onDone, reduced, text])

  return (
    <p className="text-[1.7rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
      {text.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          className={cn("inline-block", index >= count && "opacity-0")}
          style={
            index < count && !reduced
              ? { animation: "field-char-in 320ms ease forwards" }
              : undefined
          }
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
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
  const [logo, setLogo] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [sequenceDone, setSequenceDone] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const startedRest = useRef(false)
  const finishTyping = useCallback(() => {
    if (startedRest.current) return
    startedRest.current = true
    const reduced = prefersReducedMotion()
    const hapticAt = reduced ? 120 : 280
    const logoAt = reduced ? 280 : 720
    const welcomeAt = reduced ? 480 : 1280
    const readyAt = reduced ? 700 : 1880
    window.setTimeout(() => {
      setHaptic(true)
      iosHapticPulse()
    }, hapticAt)
    window.setTimeout(() => setLogo(true), logoAt)
    window.setTimeout(() => setWelcome(true), welcomeAt)
    window.setTimeout(() => setSequenceDone(true), readyAt)
  }, [])

  useEffect(() => {
    if (!sequenceDone) return
    if (!homeReady) {
      const failsafe = window.setTimeout(() => setLeaving(true), 4500)
      return () => window.clearTimeout(failsafe)
    }
    const leave = window.setTimeout(() => setLeaving(true), 280)
    return () => window.clearTimeout(leave)
  }, [homeReady, sequenceDone])

  useEffect(() => {
    if (!leaving) return
    const done = window.setTimeout(onDone, 420)
    return () => window.clearTimeout(done)
  }, [leaving, onDone])

  const welcomeText = firstName ? `Welcome back, ${firstName}` : "Welcome back"

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-white px-8 text-center lg:hidden"
      style={leaving ? { animation: "field-splash-out 420ms ease forwards" } : undefined}
      role="status"
      aria-live="polite"
      aria-label="Loading your workspace"
    >
      <div
        className="flex max-w-sm flex-col items-center"
        style={haptic ? { animation: "field-ios-haptic 520ms cubic-bezier(0.22, 1, 0.36, 1)" } : undefined}
      >
        <div className="min-h-[5.6rem] space-y-1">
          <TypedBlurLine text={LINE_ONE} active onDone={() => setLineTwo(true)} />
          <TypedBlurLine text={LINE_TWO} active={lineTwo} onDone={finishTyping} />
        </div>

        <div className="mt-10 flex min-h-[5.5rem] flex-col items-center justify-start">
          {logo ? (
            <img
              src="/elevate-logo.png"
              alt="Elevate"
              className="h-14 w-auto"
              style={{ animation: "field-logo-in 700ms ease forwards" }}
            />
          ) : null}
          {welcome ? (
            <p
              className="mt-4 text-base font-medium text-slate-600"
              style={{ animation: "field-welcome-in 640ms ease forwards" }}
            >
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
    if (!isPhoneViewport()) {
      setShow(false)
      return
    }
    setShow(consumeFieldLoginSplash())
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
