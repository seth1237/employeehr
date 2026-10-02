"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser, postLoginPath } from "@/lib/auth"

const POS_ROLES = new Set(["pos_cashier", "company_admin", "admin", "hr", "super_admin"])

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (!POS_ROLES.has(user.role)) {
      router.push(postLoginPath(user.role))
      return
    }
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Opening till…
      </div>
    )
  }

  return <>{children}</>
}
