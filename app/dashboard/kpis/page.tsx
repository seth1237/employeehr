"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Edit2 } from "lucide-react"

interface KPI {
  id: string
  name: string
  category: string
  weight: number
  description: string
}

export default function KPIManagement() {
  const [kpis, setKpis] = useState<KPI[]>([
    { id: "1", name: "Sales Revenue", category: "Performance", weight: 30, description: "Monthly sales targets" },
    { id: "2", name: "Quality Score", category: "Quality", weight: 25, description: "Work quality rating" },
    { id: "3", name: "Attendance", category: "Reliability", weight: 20, description: "On-time attendance" },
    { id: "4", name: "Customer Satisfaction", category: "Customer", weight: 25, description: "CSAT score" },
  ])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", category: "", weight: 0, description: "" })

  const handleAddKPI = () => {
    if (formData.name && formData.category) {
      setKpis([
        ...kpis,
        {
          id: Date.now().toString(),
          ...formData,
        },
      ])
      setFormData({ name: "", category: "", weight: 0, description: "" })
      setShowForm(false)
    }
  }

  const handleDeleteKPI = (id: string) => {
    setKpis(kpis.filter((kpi) => kpi.id !== id))
  }

  const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Performance KPIs</h1>
          <p className="text-muted-foreground">Define key performance indicators for your organization</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90">
          <Plus size={18} className="mr-2" />
          Add KPI
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-border">
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="KPI Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Category</option>
                <option value="Performance">Performance</option>
                <option value="Quality">Quality</option>
                <option value="Reliability">Reliability</option>
                <option value="Customer">Customer</option>
                <option value="Innovation">Innovation</option>
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Weight (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div></div>
            </div>
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
            <div className="flex gap-3">
              <Button onClick={handleAddKPI} className="flex-1 bg-accent hover:bg-accent/90">
                Add KPI
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="bg-secondary/50 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium">
          Total Weight: <span className={totalWeight === 100 ? "text-accent" : "text-destructive"}>{totalWeight}%</span>
        </p>
        <p className="text-xs text-muted-foreground">Weights should add up to 100% for fair scoring</p>
      </div>

      <div className="space-y-4">
        {kpis.map((kpi) => (
          <Card key={kpi.id} className="p-6 border-border hover:border-primary/50 transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{kpi.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{kpi.description}</p>
                <div className="flex gap-4 mt-3">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    {kpi.category}
                  </span>
                  <span className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                    {kpi.weight}% weight
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-secondary rounded-lg transition text-muted-foreground hover:text-foreground">
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteKPI(kpi.id)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
