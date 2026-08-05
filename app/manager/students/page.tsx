"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function StudentsPage() {
  return (
    <ManagerSectionPage
      title="Department Employees"
      description="Manage employees in your department, review profiles, attendance, and support records."
      actions={[
        { label: "Open Team", href: "/manager/team" },
        { label: "Attendance Overview", href: "/manager/performance" },
      ]}
      items={[
        { title: "Onboarding", description: "Track new employee setup and readiness." },
        { title: "Profiles", description: "Maintain employee records and job details." },
        { title: "Attendance", description: "Review attendance and exception cases." },
      ]}
    />
  )
}
