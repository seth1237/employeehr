import { Card } from "@/components/ui/card"
import { CheckCircle2, User, Award, FileText } from "lucide-react"

const activities = [
  { icon: CheckCircle2, label: "Sarah Johnson completed her Q1 PDP", time: "2 hours ago", color: "text-accent" },
  { icon: Award, label: "Michael Chen awarded Employee of the Month", time: "4 hours ago", color: "text-accent" },
  { icon: User, label: "Emma Rodriguez invited to organization", time: "1 day ago", color: "text-primary" },
  { icon: FileText, label: "Performance review period started", time: "2 days ago", color: "text-primary" },
]

export default function RecentActivity() {
  return (
    <Card className="p-6 border-border">
      <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon
          return (
            <div key={index} className="flex gap-4 pb-4 border-b border-border last:border-b-0 last:pb-0">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Icon size={20} className={activity.color} />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-foreground">{activity.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
