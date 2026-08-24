"use client"

import { Suspense } from "react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import CashbookPageInner from "./cashbook-inner"

export default function CashbookPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Loading cashbook" rows={8} />}>
      <CashbookPageInner />
    </Suspense>
  )
}
