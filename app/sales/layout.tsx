"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser, postLoginPath } from "@/lib/auth"
import { SalesSidebar } from "@/components/sales/sidebar"
import { SalesTopNav } from "@/components/sales/top-nav"

export default function SalesLayout({ children }: { children: React.ReactNode }) {
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
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-teal-700" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SalesSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <SalesTopNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  )
}
