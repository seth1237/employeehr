"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser, postLoginPath } from "@/lib/auth"
import { isTechnicalServiceRole } from "@/lib/engineer-roles"
import { EngineerBrandProvider } from "@/components/engineer/branding"
import { EngineerSidebar } from "@/components/engineer/sidebar"
import { EngineerTopNav } from "@/components/engineer/top-nav"
import { EngineerMobileNav } from "@/components/engineer/mobile-nav"
import { AiAssistantChat } from "@/components/ai/ai-assistant-chat"
import { WalkthroughProvider } from "@/components/walkthrough"
import { FieldPwa } from "@/components/pwa/field-pwa"
import { FieldSplashProvider } from "@/components/field/login-splash"
import { capturePwaInstallPrompt } from "@/lib/pwa-install"

capturePwaInstallPrompt()

function EngineerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <WalkthroughProvider portal="engineer">
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <EngineerSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <EngineerTopNav onMenuClick={() => setSidebarOpen(true)} />
          <FieldPwa manifest="/manifest-engineer.webmanifest" appName="Technical Service" />
          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
          <EngineerMobileNav />
        </div>
        <AiAssistantChat variant="engineer" />
      </div>
    </WalkthroughProvider>
  )
}

export default function EngineerLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (!isTechnicalServiceRole(user.role)) {
      router.push(postLoginPath(user.role))
      return
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white lg:bg-slate-50">
        <div className="hidden h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700 lg:block" />
        <span className="sr-only">Loading engineer portal</span>
      </div>
    )
  }

  return (
    <EngineerBrandProvider>
      <FieldSplashProvider>
        <EngineerShell>{children}</EngineerShell>
      </FieldSplashProvider>
    </EngineerBrandProvider>
  )
}
