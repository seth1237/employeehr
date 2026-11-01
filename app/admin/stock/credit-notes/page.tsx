"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function StockCreditNotesRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    router.replace(`/admin/accounts/receivables/credit-notes${query ? `?${query}` : ""}`)
  }, [router, searchParams])

  return <p className="p-6 text-sm text-muted-foreground">Opening credit notes in Accounts…</p>
}
