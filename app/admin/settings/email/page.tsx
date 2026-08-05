"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/** Legacy path — email config now lives under System Settings */
export default function EmailSettingsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/settings/system/email")
  }, [router])

  return (
    <div className="flex h-96 items-center justify-center text-muted-foreground gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      Opening email settings…
    </div>
  )
}
