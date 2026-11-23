type PromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: string }>
}

let deferredPrompt: PromptEvent | null = null
const listeners = new Set<() => void>()
let capturing = false

function notify() {
  listeners.forEach((fn) => fn())
}

export function capturePwaInstallPrompt() {
  if (typeof window === "undefined" || capturing) return
  capturing = true

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    deferredPrompt = event as PromptEvent
    notify()
  })

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    notify()
  })
}

export function getDeferredPwaPrompt() {
  return deferredPrompt
}

export function subscribePwaInstall(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isStandalonePwa() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isDesktopViewport() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(min-width: 768px)").matches
}

capturePwaInstallPrompt()
