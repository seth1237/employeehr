"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser, postLoginPath } from "@/lib/auth"
import { EngineerSidebar } from "@/components/engineer/sidebar"
import { EngineerTopNav } from "@/components/engineer/top-nav"
import { EngineerMobileNav } from "@/components/engineer/mobile-nav"
import { AiAssistantChat } from "@/components/ai/ai-assistant-chat"

export default function EngineerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (user.role !== "technical_service_engineer") {
      router.push(postLoginPath(user.role))
      return
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700" />
        <span className="sr-only">Loading engineer portal</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <EngineerSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <EngineerTopNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <EngineerMobileNav />
      </div>
      <AiAssistantChat variant="engineer" />
    </div>
  )
}
