"use client"

import { use } from "react"
import { DispatchWorkflow } from "@/components/stock/dispatch-workflow"

export default function EmployeeDispatchDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params)
  return <DispatchWorkflow invoiceId={invoiceId} allowBackTo="/employee/dispatch" />
}
