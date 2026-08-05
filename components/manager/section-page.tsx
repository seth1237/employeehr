"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type SectionItem = {
  title: string
  description: string
}

export default function ManagerSectionPage({
  title,
  description,
  actions,
  items,
}: {
  title: string
  description: string
  actions?: { label: string; href: string }[]
  items: SectionItem[]
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {actions?.length ? (
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Button asChild key={action.href} variant="outline">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="border-border/70 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
