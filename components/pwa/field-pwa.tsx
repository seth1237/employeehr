"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  manifest: string
  appName: string
  themeColor?: string
}

export function FieldPwa({ manifest, appName, themeColor = "#0f766e" }: Props) {
  const [installEvent, setInstallEvent] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
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

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    setIosHint(isIos && !standalone)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", () => {
      setInstalled(true)
      setInstallEvent(null)
    })
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [appName, manifest, themeColor])

  if (installed) return null

  const install = async () => {
    if (!installEvent?.prompt) return
    installEvent.prompt()
    try {
      await installEvent.userChoice
    } catch {
      // ignore
    }
    setInstallEvent(null)
  }

  if (!installEvent && !iosHint) return null

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 sm:text-sm">
          {iosHint
            ? `Add ${appName} to your Home Screen: Share → Add to Home Screen.`
            : `Install ${appName} to keep it on your phone.`}
        </p>
        {installEvent ? (
          <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => void install()}>
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
        ) : null}
      </div>
    </div>
  )
}
