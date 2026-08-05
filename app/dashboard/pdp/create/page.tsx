"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

interface Goal {
    title: string
    description: string
    target_date: string
    status: "not_started" | "in_progress" | "completed"
    progress: number
}

export default function CreatePDPPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
    })
    const [goals, setGoals] = useState<Goal[]>([
        {
            title: "",
            description: "",
            target_date: "",
            status: "not_started",
            progress: 0,
        },
    ])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const addGoal = () => {
        setGoals([
            ...goals,
            {
                title: "",
                description: "",
                target_date: "",
                status: "not_started",
                progress: 0,
            },
        ])
    }

    const removeGoal = (index: number) => {
        setGoals(goals.filter((_, i) => i !== index))
    }

    const updateGoal = (index: number, field: keyof Goal, value: any) => {
        const newGoals = [...goals]
        newGoals[index] = { ...newGoals[index], [field]: value }
        setGoals(newGoals)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.end_date || goals.length === 0) {
            setError("Please fill in all required fields and add at least one goal")
            return
        }

        // Validate goals
        const invalidGoal = goals.find((g) => !g.title || !g.target_date)
        if (invalidGoal) {
            setError("Please fill in title and target date for all goals")
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const response = await api.pdps.create({
                employee_id: "", // Will be set by backend from auth token
                title: formData.title,
                description: formData.description,
                goals: goals,
                start_date: formData.start_date,
                end_date: formData.end_date,
            })

            if (response.success) {
                router.push("/employee/pdp")
            } else {
                setError(response.message || "Failed to create PDP")
            }
        } catch (err: any) {
            console.error("Failed to create PDP:", err)
            setError(err.message || "An error occurred")
        } finally {
            setSubmitting(false)
        }
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
                    <h1 className="text-3xl font-bold">Create PDP Template</h1>
                    <p className="text-muted-foreground mt-2">
                        Create a Personal Development Plan with goals and milestones
                    </p>
                </div>

                {error && (
                    <Card className="p-4 border-destructive/50 bg-destructive/10">
                        <p className="text-destructive text-sm">{error}</p>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="p-8 border-border">
                        <h2 className="text-xl font-bold mb-6">PDP Details</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">PDP Title *</label>
                                <Input
                                    placeholder="e.g., Leadership Development Plan 2024"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Description</label>
                                <textarea
                                    placeholder="Describe the overall objectives of this development plan..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={3}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Start Date *</label>
                                    <Input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">End Date *</label>
                                    <Input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 border-border">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Goals</h2>
                            <Button type="button" onClick={addGoal} variant="outline" size="sm">
                                <Plus size={16} className="mr-2" />
                                Add Goal
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {goals.map((goal, index) => (
                                <Card key={index} className="p-6 border-border bg-secondary/20">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-semibold">Goal {index + 1}</h3>
                                        {goals.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeGoal(index)}
                                                className="text-destructive hover:text-destructive/80"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium">Goal Title *</label>
                                            <Input
                                                placeholder="e.g., Complete Leadership Certification"
                                                value={goal.title}
                                                onChange={(e) => updateGoal(index, "title", e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium">Description</label>
                                            <textarea
                                                placeholder="Describe this goal..."
                                                value={goal.description}
                                                onChange={(e) => updateGoal(index, "description", e.target.value)}
                                                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                                rows={2}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium">Target Date *</label>
                                            <Input
                                                type="date"
                                                value={goal.target_date}
                                                onChange={(e) => updateGoal(index, "target_date", e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </Card>

                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            className="flex-1 bg-primary hover:bg-primary/90"
                            disabled={submitting}
                        >
                            {submitting ? "Creating PDP..." : "Create PDP"}
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
