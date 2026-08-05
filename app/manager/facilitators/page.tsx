"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function FacilitatorsPage() {
  return (
    <ManagerSectionPage
      title="Department Leads"
      description="Manage team leads, work allocations, schedules, and supervisory support."
      actions={[
        { label: "Assign Work", href: "/manager/team" },
        { label: "Review Performance", href: "/manager/performance" },
      ]}
      items={[
        { title: "Work Allocation", description: "Assign leads to projects, tasks, and sessions." },
        { title: "Schedules", description: "Organize schedules and availability." },
        { title: "Support", description: "Track supervision and ongoing staff needs." },
      ]}
    />
  )
}
