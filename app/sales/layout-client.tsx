"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser, postLoginPath } from "@/lib/auth"
import { SalesSidebar } from "@/components/sales/sidebar"
import { SalesTopNav } from "@/components/sales/top-nav"
import { SalesMobileNav } from "@/components/sales/mobile-nav"
import { AiAssistantChat } from "@/components/ai/ai-assistant-chat"
import { WalkthroughProvider } from "@/components/walkthrough"
import { FieldPwa } from "@/components/pwa/field-pwa"
import { FieldSplashProvider } from "@/components/field/login-splash"

export default function SalesLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (user.role !== "sales_rep") {
      router.push(postLoginPath(user.role))
      return
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white lg:bg-slate-50">
        <div className="hidden h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700 lg:block" />
        <span className="sr-only">Loading sales</span>
      </div>
    )
  }

  return (
    <FieldSplashProvider>
      <WalkthroughProvider portal="sales">
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <SalesSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <SalesTopNav onMenuClick={() => setSidebarOpen(true)} />
            <FieldPwa manifest="/manifest-sales.webmanifest" appName="Field Sales" />
            <main className="flex-1 overflow-y-auto">{children}</main>
            <SalesMobileNav />
          </div>
          <AiAssistantChat variant="sales" />
        </div>
      </WalkthroughProvider>
    </FieldSplashProvider>
  )
}
