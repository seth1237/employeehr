"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

export default function AddKPIPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        weight: 0,
        target: 0,
        unit: "",
        description: "",
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name || !formData.category || formData.weight <= 0) {
            setError("Please fill in all required fields")
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const response = await api.kpis.create({
                name: formData.name,
                category: formData.category,
                weight: formData.weight,
                target_value: formData.target,
                measurement_unit: formData.unit,
                description: formData.description,
            })

            if (response.success) {
                router.push("/dashboard/kpis")
            } else {
                setError(response.message || "Failed to create KPI")
            }
        } catch (err: any) {
            console.error("Failed to create KPI:", err)
            setError(err.message || "An error occurred")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-background p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition"
                >
                    <ArrowLeft size={18} />
                    Back to Dashboard
                </Link>

                <div>
                    <h1 className="text-3xl font-bold">Add Performance KPI</h1>
                    <p className="text-muted-foreground mt-2">
                        Define a new key performance indicator for your organization
                    </p>
                </div>

                {error && (
                    <Card className="p-4 border-destructive/50 bg-destructive/10">
                        <p className="text-destructive text-sm">{error}</p>
                    </Card>
                )}

                <Card className="p-8 border-border">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">KPI Name *</label>
                            <Input
                                placeholder="e.g., Sales Revenue, Customer Satisfaction"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    <option value="Performance">Performance</option>
                                    <option value="Quality">Quality</option>
                                    <option value="Reliability">Reliability</option>
                                    <option value="Customer">Customer</option>
                                    <option value="Innovation">Innovation</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Attendance">Attendance</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Weight (%) *</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="e.g., 25"
                                    value={formData.weight || ""}
                                    onChange={(e) => setFormData({ ...formData, weight: Number.parseInt(e.target.value) || 0 })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Percentage weight in overall performance calculation
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Target Value</label>
                                <Input
                                    type="number"
                                    placeholder="e.g., 100"
                                    value={formData.target || ""}
                                    onChange={(e) => setFormData({ ...formData, target: Number.parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Measurement Unit</label>
                                <Input
                                    placeholder="e.g., %, $, hours, points"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Description</label>
                            <textarea
                                placeholder="Describe what this KPI measures and how it's calculated..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                className="flex-1 bg-primary hover:bg-primary/90"
                                disabled={submitting}
                            >
                                {submitting ? "Creating KPI..." : "Create KPI"}
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
                </Card>
            </div>
        </div>
    )
}
