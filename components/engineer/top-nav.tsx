"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CircleHelp, Download, Menu, Monitor, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth"
import { requestWalkthroughReplay } from "@/lib/walkthrough"
import {
  capturePwaInstallPrompt,
  getDeferredPwaPrompt,
  isDesktopViewport,
  isStandalonePwa,
  subscribePwaInstall,
} from "@/lib/pwa-install"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function EngineerInstallButton() {
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    capturePwaInstallPrompt()
    const sync = () => {
      setInstalled(isStandalonePwa())
      setCanInstall(Boolean(getDeferredPwaPrompt()))
      setDesktop(isDesktopViewport())
    }
    sync()
    return subscribePwaInstall(sync)
  }, [])

  if (installed || !canInstall) return null

  const install = async () => {
    const prompt = getDeferredPwaPrompt()
    if (!prompt?.prompt) return
    try {
      await prompt.prompt()
      await prompt.userChoice
    } catch {
      // ignore
    }
  }

  return (
    <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs md:px-3 md:text-sm" onClick={() => void install()}>
      {desktop ? <Monitor className="mr-1 h-3.5 w-3.5" /> : <Download className="mr-1 h-3.5 w-3.5" />}
      {desktop ? "Download to desktop" : "Install app"}
    </Button>
  )
}

export function EngineerTopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = getUser()
  const name = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Service engineer"

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3 lg:h-14 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="hidden text-xs text-slate-500 sm:block">Work orders, assets, and field jobs</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <EngineerInstallButton />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex" aria-label="Help">
              <CircleHelp size={18} />
              <span className="ml-1.5 text-sm">Help</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => requestWalkthroughReplay("engineer")}>
              Product tour
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button asChild size="sm" className="h-8 px-2.5 text-xs md:px-3 md:text-sm">
          <Link href="/engineer/work-orders">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New job
          </Link>
        </Button>
      </div>
    </header>
  )
}
