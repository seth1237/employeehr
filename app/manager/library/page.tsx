"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function LibraryPage() {
  return (
    <ManagerSectionPage
      title="Inventory"
      description="Maintain catalog records, borrowing activity, and access to shared company materials."
      actions={[
        { label: "Open Resources", href: "/manager/resources" },
        { label: "Open Reports", href: "/manager/reports" },
      ]}
      items={[
        { title: "Catalog", description: "Organize assets and materials by category." },
        { title: "Borrowing", description: "Track issued items, returns, and overdue records." },
        { title: "Access", description: "Manage usage rules and resource availability." },
      ]}
    />
  )
}
