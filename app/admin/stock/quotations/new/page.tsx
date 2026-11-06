"use client"

import { Suspense } from "react"
import { OnTheGoQuoteComposer } from "@/components/admin/stock/on-the-go-quote-composer"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function NewOnTheGoQuotePage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="New quote" rows={4} />}>
      <OnTheGoQuoteComposer />
    </Suspense>
  )
}
