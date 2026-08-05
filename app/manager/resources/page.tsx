"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function ResourcesPage() {
  return (
    <ManagerSectionPage
      title="Resources"
      description="Manage company resources, shared assets, and operational inventory."
      actions={[
        { label: "Open Inventory", href: "/manager/library" },
        { label: "Open Reports", href: "/manager/reports" },
      ]}
      items={[
        { title: "Documents", description: "Notes, documents, and reference content." },
        { title: "Assets", description: "Shared equipment and company resources." },
        { title: "Requests", description: "Track resource requests and approvals." },
      ]}
    />
  )
}
