"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function ExaminationsPage() {
  return (
    <ManagerSectionPage
      title="Evaluations"
      description="Plan evaluations, monitor results, and support employee assessment workflows."
      actions={[
        { label: "Results Summary", href: "/manager/performance" },
        { label: "Employee Records", href: "/manager/team" },
      ]}
      items={[
        { title: "Review Setup", description: "Create schedules and define review windows." },
        { title: "Feedback", description: "Coordinate review, moderation, and manager feedback." },
        { title: "Results", description: "Track scores and performance trends." },
      ]}
    />
  )
}
