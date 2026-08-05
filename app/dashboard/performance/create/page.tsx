"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

export default function StartPerformanceReviewPage() {
    const router = useRouter()
    const [employees, setEmployees] = useState<any[]>([])
    const [kpis, setKPIs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        employee_id: "",
        review_period_start: "",
        review_period_end: "",
        kpi_scores: [] as { kpi_id: string; score: number; comments: string }[],
        strengths: "",
        areas_for_improvement: "",
        goals: "",
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [employeesRes, kpisRes] = await Promise.all([
                    api.users.getAll(),
                    api.kpis.getAll(),
                ])

                if (employeesRes.success && employeesRes.data) {
                    setEmployees(employeesRes.data)
                }
                if (kpisRes.success && kpisRes.data) {
                    setKPIs(kpisRes.data)
                    // Initialize KPI scores
                    setFormData((prev) => ({
                        ...prev,
                        kpi_scores: kpisRes.data.map((kpi: any) => ({
                            kpi_id: kpi._id,
                            score: 0,
                            comments: "",
                        })),
                    }))
                }
            } catch (err) {
                console.error("Failed to fetch data:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const updateKPIScore = (kpiId: string, field: "score" | "comments", value: any) => {
        setFormData((prev) => ({
            ...prev,
            kpi_scores: prev.kpi_scores.map((score) =>
                score.kpi_id === kpiId ? { ...score, [field]: value } : score
            ),
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.employee_id || !formData.review_period_start || !formData.review_period_end) {
            setError("Please fill in all required fields")
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const response = await api.performance.create({
                employee_id: formData.employee_id,
                review_period_start: formData.review_period_start,
                review_period_end: formData.review_period_end,
                kpi_scores: formData.kpi_scores,
                strengths: formData.strengths,
                areas_for_improvement: formData.areas_for_improvement,
                goals: formData.goals,
                status: "draft",
            })

            if (response.success) {
                router.push("/dashboard/reports")
            } else {
                setError(response.message || "Failed to create performance review")
            }
        } catch (err: any) {
            console.error("Failed to create review:", err)
            setError(err.message || "An error occurred")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition"
                >
                    <ArrowLeft size={18} />
                    Back to Dashboard
                </Link>

                <div>
                    <h1 className="text-3xl font-bold">Start Performance Review</h1>
                    <p className="text-muted-foreground mt-2">
                        Create a comprehensive performance review for an employee
                    </p>
                </div>

                {error && (
                    <Card className="p-4 border-destructive/50 bg-destructive/10">
                        <p className="text-destructive text-sm">{error}</p>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="p-8 border-border">
                        <h2 className="text-xl font-bold mb-6">Review Details</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Employee *</label>
                                <select
                                    value={formData.employee_id}
                                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map((emp) => (
                                        <option key={emp._id} value={emp._id}>
                                            {(emp as any).firstName} {(emp as any).lastName} - {emp.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Review Period Start *</label>
                                    <Input
                                        type="date"
                                        value={formData.review_period_start}
                                        onChange={(e) => setFormData({ ...formData, review_period_start: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Review Period End *</label>
                                    <Input
                                        type="date"
                                        value={formData.review_period_end}
                                        onChange={(e) => setFormData({ ...formData, review_period_end: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 border-border">
                        <h2 className="text-xl font-bold mb-6">KPI Scores</h2>
                        <div className="space-y-4">
                            {kpis.map((kpi) => {
                                const score = formData.kpi_scores.find((s) => s.kpi_id === kpi._id)
                                return (
                                    <Card key={kpi._id} className="p-4 border-border bg-secondary/20">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold">{kpi.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{kpi.description}</p>
                                                </div>
                                                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                                    Weight: {kpi.weight}%
                                                </span>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium">Score (0-100)</label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={score?.score || 0}
                                                        onChange={(e) =>
                                                            updateKPIScore(kpi._id, "score", Number.parseInt(e.target.value) || 0)
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium">Comments</label>
                                                    <Input
                                                        placeholder="Optional comments..."
                                                        value={score?.comments || ""}
                                                        onChange={(e) => updateKPIScore(kpi._id, "comments", e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </Card>

                    <Card className="p-8 border-border">
                        <h2 className="text-xl font-bold mb-6">Overall Assessment</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Strengths</label>
                                <textarea
                                    placeholder="Highlight the employee's key strengths and achievements..."
                                    value={formData.strengths}
                                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Areas for Improvement</label>
                                <textarea
                                    placeholder="Identify areas where the employee can improve..."
                                    value={formData.areas_for_improvement}
                                    onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Goals for Next Period</label>
                                <textarea
                                    placeholder="Set goals and objectives for the next review period..."
                                    value={formData.goals}
                                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={4}
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            className="flex-1 bg-primary hover:bg-primary/90"
                            disabled={submitting}
                        >
                            {submitting ? "Creating Review..." : "Create Performance Review"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
