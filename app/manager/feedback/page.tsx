"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Employee {
  id: string
  name: string
  role: string
}

export default function FeedbackPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [rating, setRating] = useState(3)
  const [feedback, setFeedback] = useState("")
  const [feedbackType, setFeedbackType] = useState("general")

  const employees: Employee[] = [
    { id: "1", name: "Sarah Johnson", role: "Sales Lead" },
    { id: "2", name: "Michael Chen", role: "Engineer" },
    { id: "3", name: "Emma Rodriguez", role: "Designer" },
    { id: "4", name: "David Kim", role: "Analyst" },
  ]

  const handleSubmitFeedback = () => {
    console.log("Feedback submitted:", { selectedEmployee, rating, feedback, feedbackType })
    setSelectedEmployee(null)
    setFeedback("")
    setRating(3)
    setFeedbackType("general")
  }

  if (selectedEmployee) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="flex items-center gap-2 text-primary hover:text-primary/80"
            >
              <ArrowLeft size={18} />
              Back to Employees
            </button>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Give Feedback</h1>
            <p className="text-muted-foreground">Provide feedback to {selectedEmployee.name}</p>
          </div>

          <Card className="p-8 border-border">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Feedback Type</label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="general">General Feedback</option>
                  <option value="praise">Praise</option>
                  <option value="constructive">Constructive Feedback</option>
                  <option value="recognition">Recognition</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">Rating (1-5 stars)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-3xl transition ${rating >= star ? "text-accent" : "text-border"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your feedback here..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={6}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitFeedback} className="bg-primary hover:bg-primary/90">
                  <Send size={18} className="mr-2" />
                  Submit Feedback
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/manager" className="flex items-center gap-2 text-primary hover:text-primary/80">
            <ArrowLeft size={18} />
            Back to Manager Hub
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Give Feedback</h1>
          <p className="text-muted-foreground">Select a team member to provide feedback</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {employees.map((emp) => (
            <Card
              key={emp.id}
              className="p-6 border-border hover:border-primary/50 hover:bg-secondary/50 cursor-pointer transition"
              onClick={() => setSelectedEmployee(emp)}
            >
              <h3 className="font-semibold text-lg">{emp.name}</h3>
              <p className="text-sm text-muted-foreground">{emp.role}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
