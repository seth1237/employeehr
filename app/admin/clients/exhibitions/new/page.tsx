"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"

export default function NewExhibitionPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    date: "",
    endDate: "",
    assignedReps: [] as string[],
    customFields: [] as any[],
  })

  useEffect(() => {
    // Fetch users for assignment
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        const data = await res.json()
        if (data.success) {
          setUsers(data.data)
        }
      } catch (err) {
        console.error("Failed to load users", err)
      }
    }
    fetchUsers()
  }, [])

  const handleAddCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { name: "", label: "", type: "text", required: false }],
    }))
  }

  const handleUpdateCustomField = (index: number, key: string, value: any) => {
    setFormData((prev) => {
      const updatedFields = [...prev.customFields]
      updatedFields[index] = { ...updatedFields[index], [key]: value }
      if (key === "label") {
        updatedFields[index].name = value.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()
      }
      return { ...prev, customFields: updatedFields }
    })
  }

  const handleRemoveCustomField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/exhibitions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        router.push("/admin/clients/exhibitions")
      } else {
        setError(data.message || "Failed to create exhibition")
      }
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleRepToggle = (userId: string) => {
    setFormData((prev) => {
      const isSelected = prev.assignedReps.includes(userId)
      return {
        ...prev,
        assignedReps: isSelected
          ? prev.assignedReps.filter((id) => id !== userId)
          : [...prev.assignedReps, userId],
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/clients/exhibitions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Exhibition</h1>
        </div>
      </div>

      {error && <div className="mb-6 rounded bg-red-50 p-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Exhibition Name</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kenya Trade Show 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. KICC, Nairobi"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assign Sales Reps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-60 gap-2 overflow-y-auto rounded-md border p-2">
              {users.map((user) => (
                <label key={user._id} className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.assignedReps.includes(user._id)}
                    onChange={() => handleRepToggle(user._id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Custom Fields (Form Builder)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddCustomField}>
              <Plus className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-500">
              The form already includes: Name, Facility of Association, Role, Location, Phone Number, Email, and Product of Interest. Add any extra fields you need below.
            </p>
            {formData.customFields.length === 0 ? (
              <div className="rounded border border-dashed py-8 text-center text-sm text-slate-500">
                No custom fields added.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.customFields.map((field, index) => (
                  <div key={index} className="flex items-end gap-3 rounded border bg-slate-50 p-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Field Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleUpdateCustomField(index, "label", e.target.value)}
                        placeholder="e.g. Budget Range"
                        required
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={field.type}
                        onChange={(e) => handleUpdateCustomField(index, "type", e.target.value)}
                      >
                        <option value="text">Text (Short answer)</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Checkbox (Yes/No)</option>
                      </select>
                    </div>
                    <label className="flex h-10 items-center gap-2 px-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateCustomField(index, "required", e.target.checked)}
                      />
                      Required
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRemoveCustomField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t bg-slate-50 p-4">
            <Link href="/admin/clients/exhibitions">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Exhibition"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
