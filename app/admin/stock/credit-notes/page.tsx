"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function StockCreditNotesRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    router.replace(`/admin/accounts/receivables/credit-notes${query ? `?${query}` : ""}`)
  }, [router, searchParams])

  return <p className="p-6 text-sm text-muted-foreground">Opening credit notes in Accounts…</p>
}

export default function StockCreditNotesRedirectPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Opening credit notes in Accounts…</p>}>
      <StockCreditNotesRedirectInner />
    </Suspense>
  )
}
