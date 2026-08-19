"use client"

import { AdminSalesVisitReports } from "@/components/admin/sales-visit-reports"

export default function FieldReportsPage() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Field reports</h1>
        <p className="text-sm text-muted-foreground">
          Visit reports filed by sales reps after planner visits — including client response and optional product of interest.
        </p>
      </div>
      <AdminSalesVisitReports title="Field reports" />
    </div>
  )
}
