"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function FeesPage() {
  return (
    <ManagerSectionPage
      title="Budget & Expenses"
      description="Oversee budgets, payments, balances, and financial accountability records."
      actions={[
        { label: "Payment Records", href: "/manager/reports" },
        { label: "Team Records", href: "/manager/team" },
      ]}
      items={[
        { title: "Billing", description: "Define expense structures and billing cycles." },
        { title: "Payments", description: "Track receipts, confirmations, and pending balances." },
        { title: "Reconciliation", description: "Review financial summaries and exceptions." },
      ]}
    />
  )
}
