"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Send } from "lucide-react"
import Link from "next/link"

interface Employee {
  id: string
  name: string
  role: string
  lastEvaluation: string
  evaluationStatus: "pending" | "in-progress" | "completed"
}

export default function EvaluationsPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [evaluation, setEvaluation] = useState({
    overallScore: 0,
    kpiScores: { sales: 0, quality: 0, attendance: 0, customer: 0 },
    strengths: "",
    improvements: "",
    goals: "",
    feedback: "",
  })

  const employees: Employee[] = [
    { id: "1", name: "Sarah Johnson", role: "Sales Lead", lastEvaluation: "Mar 2024", evaluationStatus: "completed" },
    { id: "2", name: "Michael Chen", role: "Engineer", lastEvaluation: "Apr 2024", evaluationStatus: "pending" },
    { id: "3", name: "Emma Rodriguez", role: "Designer", lastEvaluation: "Feb 2024", evaluationStatus: "pending" },
    { id: "4", name: "David Kim", role: "Analyst", lastEvaluation: "Jan 2024", evaluationStatus: "in-progress" },
  ]

  const handleSubmitEvaluation = () => {
    console.log("Evaluation submitted:", evaluation)
    setSelectedEmployee(null)
    setEvaluation({
      overallScore: 0,
      kpiScores: { sales: 0, quality: 0, attendance: 0, customer: 0 },
      strengths: "",
      improvements: "",
      goals: "",
      feedback: "",
    })
  }

  if (selectedEmployee) {
    return (
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link href="/manager" className="flex items-center gap-2 text-primary hover:text-primary/80">
              <ArrowLeft size={18} />
              Back to Manager Hub
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Performance Evaluation</h1>
            <p className="text-muted-foreground">
              Evaluating: {selectedEmployee.name} - {selectedEmployee.role}
            </p>
          </div>

          <Card className="p-8 border-border">
            <div className="space-y-8">
              {/* Overall Score */}
              <div>
                <label className="block text-sm font-medium mb-4">Overall Performance Score (0-10)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={evaluation.overallScore}
                    onChange={(e) => setEvaluation({ ...evaluation, overallScore: Number.parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold w-12 text-primary">{evaluation.overallScore}</span>
                </div>
              </div>

              {/* KPI Scores */}
              <div>
                <h3 className="font-semibold mb-4">KPI Scores</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(evaluation.kpiScores).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2 capitalize">{key} (0-10)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={value}
                          onChange={(e) =>
                            setEvaluation({
                              ...evaluation,
                              kpiScores: { ...evaluation.kpiScores, [key]: Number.parseFloat(e.target.value) },
                            })
                          }
                          className="flex-1"
                        />
                        <span className="font-semibold w-8 text-center">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div>
                <label className="block text-sm font-medium mb-2">Key Strengths</label>
                <textarea
                  value={evaluation.strengths}
                  onChange={(e) => setEvaluation({ ...evaluation, strengths: e.target.value })}
                  placeholder="What are the employee's main strengths?"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>

              {/* Areas for Improvement */}
              <div>
                <label className="block text-sm font-medium mb-2">Areas for Improvement</label>
                <textarea
                  value={evaluation.improvements}
                  onChange={(e) => setEvaluation({ ...evaluation, improvements: e.target.value })}
                  placeholder="What areas should the employee focus on developing?"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>

              {/* Goals for Next Period */}
              <div>
                <label className="block text-sm font-medium mb-2">Recommended Goals for Next Period</label>
                <textarea
                  value={evaluation.goals}
                  onChange={(e) => setEvaluation({ ...evaluation, goals: e.target.value })}
                  placeholder="What goals should this employee focus on?"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>

              {/* Additional Feedback */}
              <div>
                <label className="block text-sm font-medium mb-2">Additional Feedback</label>
                <textarea
                  value={evaluation.feedback}
                  onChange={(e) => setEvaluation({ ...evaluation, feedback: e.target.value })}
                  placeholder="Any other feedback or comments?"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitEvaluation} className="bg-primary hover:bg-primary/90">
                  <Send size={18} className="mr-2" />
                  Submit Evaluation
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
      {/* Navigation */}
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
          <h1 className="text-3xl font-bold">Performance Evaluations</h1>
          <p className="text-muted-foreground">Conduct performance reviews for your team members</p>
        </div>

        <div className="space-y-3">
          {employees.map((emp) => (
            <Card
              key={emp.id}
              className="p-6 border-border hover:border-primary/50 cursor-pointer transition"
              onClick={() => setSelectedEmployee(emp)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{emp.name}</h3>
                  <p className="text-sm text-muted-foreground">{emp.role}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last evaluation: {emp.lastEvaluation}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    emp.evaluationStatus === "completed"
                      ? "bg-accent/20 text-accent"
                      : emp.evaluationStatus === "in-progress"
                        ? "bg-primary/20 text-primary"
                        : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {emp.evaluationStatus === "pending"
                    ? "Pending"
                    : emp.evaluationStatus === "in-progress"
                      ? "In Progress"
                      : "Completed"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
