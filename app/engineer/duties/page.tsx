"use client"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
export default function DutiesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Assigned Duties</h1>
      <p className="text-muted-foreground mt-2">View all your pending duties (installations, services, meetings).</p>
      <div className="mt-8 border rounded-lg p-12 text-center text-muted-foreground">
        No active duties currently assigned.
      </div>
    </div>
  )
}
