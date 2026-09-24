"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Admin page error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-slate-800">This admin page failed to load.</p>
      <p className="max-w-md text-sm text-slate-500">
        {error?.message || "The live API returned an empty or invalid response."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
