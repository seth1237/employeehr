"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUser, postLoginPath } from "@/lib/auth"

export default function ClientPortalPage() {
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if ((user as { role?: string }).role !== "portal_client") {
      router.replace(postLoginPath((user as { role?: string }).role))
    }
  }, [router])

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold">Client portal</h1>
      <p className="text-sm text-muted-foreground">
        This login is for quotations and website orders only. It does not have access to HR, payroll, or staff tools.
      </p>
    </main>
  )
}
