import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Target, FileText } from "lucide-react"
import Link from "next/link"

const actions = [
  { icon: Users, label: "Invite Team Member", href: "/dashboard/team" },
  { icon: Target, label: "Add Performance KPI", href: "/dashboard/kpis/add" },
  { icon: FileText, label: "Create PDP Template", href: "/dashboard/pdp/create" },
  { icon: Plus, label: "Start Performance Review", href: "/dashboard/performance/create" },
]

export default function QuickActions() {
  return (
    <Card className="p-6 border-border">
      <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Link key={index} href={action.href}>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-border hover:bg-secondary h-auto py-3 bg-transparent"
              >
                <Icon size={20} className="text-primary" />
                <span className="text-foreground">{action.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
