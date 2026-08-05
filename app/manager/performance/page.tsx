"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp } from "lucide-react"

const employees = [
  { id: 1, name: "Jane Doe", role: "Account Executive", score: 86, progress: 74 },
  { id: 2, name: "John Smith", role: "Operations Officer", score: 91, progress: 88 },
  { id: 3, name: "Mary Wanjiku", role: "Customer Support", score: 79, progress: 61 },
]

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-white shadow-sm">
        <CardHeader>
          <Badge className="w-fit bg-slate-100 text-slate-800 hover:bg-slate-200">Performance</Badge>
          <CardTitle className="text-2xl">Department Performance</CardTitle>
          <p className="text-sm text-muted-foreground">Track employee KPIs and departmental targets created by admin.</p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.id} className="border-border/70 bg-white shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.role}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">{employee.score}/100</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">KPI progress</span>
                  <span className="font-medium">{employee.progress}%</span>
                </div>
                <Progress value={employee.progress} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Target className="h-4 w-4" />
                  View KPIs
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
