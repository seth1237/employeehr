"use client"

import { useEffect, useState } from "react"
import { Download, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  capturePwaInstallPrompt,
  getDeferredPwaPrompt,
  isDesktopViewport,
  isStandalonePwa,
  subscribePwaInstall,
} from "@/lib/pwa-install"

type Props = {
  manifest: string
  appName: string
  themeColor?: string
}

export function FieldPwa({ manifest, appName, themeColor = "#0f766e" }: Props) {
  const [installEvent, setInstallEvent] = useState<ReturnType<typeof getDeferredPwaPrompt>>(null)
  const [installed, setInstalled] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [desktop, setDesktop] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    capturePwaInstallPrompt()

    const existing = document.querySelector(`link[rel="manifest"][href="${manifest}"]`)
    if (!existing) {
      const link = document.createElement("link")
      link.rel = "manifest"
      link.href = manifest
      document.head.appendChild(link)
    }

    const metas = [
      ["theme-color", themeColor],
      ["apple-mobile-web-app-capable", "yes"],
      ["mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-title", appName],
      ["apple-mobile-web-app-status-bar-style", "default"],
    ]
    metas.forEach(([name, content]) => {
      if (document.querySelector(`meta[name="${name}"]`)) return
      const meta = document.createElement("meta")
      meta.name = name
      meta.content = content
      document.head.appendChild(meta)
    })

    const appleHref = "/apple-touch-icon.png?v=elevate"
    const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null
    if (apple) {
      apple.href = appleHref
    } else {
      const link = document.createElement("link")
      link.rel = "apple-touch-icon"
      link.href = appleHref
      document.head.appendChild(link)
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
    }

    const sync = () => {
      setInstalled(isStandalonePwa())
      setInstallEvent(getDeferredPwaPrompt())
      setDesktop(isDesktopViewport())
      const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
      setIosHint(isIos && !isStandalonePwa())
    }

    sync()
    return subscribePwaInstall(sync)
  }, [appName, manifest, themeColor])

  if (installed) return null

  const install = async () => {
    const prompt = installEvent || getDeferredPwaPrompt()
    if (!prompt?.prompt) return
    setBusy(true)
    try {
      await prompt.prompt()
      await prompt.userChoice
    } catch {
      // ignore cancelled prompts
    } finally {
      setBusy(false)
      setInstallEvent(getDeferredPwaPrompt())
    }
  }

  const actionLabel = desktop ? "Download to desktop" : "Install app"
  const copy = iosHint
    ? `Add ${appName} to your Home Screen: Share → Add to Home Screen.`
    : desktop
      ? `Keep ${appName} on this computer. Chrome: menu → Cast, save, and share → Install ${appName}.`
      : `Install ${appName} on this device so it opens like an app.`

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 sm:text-sm">{copy}</p>
        {installEvent ? (
          <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => void install()} disabled={busy}>
            {desktop ? <Monitor className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {busy ? "Opening…" : actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
