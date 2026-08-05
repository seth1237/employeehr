"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function SupervisionPage() {
  return (
    <ManagerSectionPage
      title="Oversight"
      description="Handle approvals, follow-ups, oversight reports, and general manager duties."
      actions={[
        { label: "Employee View", href: "/manager/team" },
        { label: "Staff Review", href: "/manager/performance" },
      ]}
      items={[
        { title: "Approvals", description: "Review and approve operational requests." },
        { title: "Reports", description: "Monitor company activity and exceptions." },
        { title: "Oversight", description: "Keep track of key manager actions and follow-ups." },
      ]}
    />
  )
}
