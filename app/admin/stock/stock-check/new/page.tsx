"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchJson } from "@/lib/fetchUtils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface Warehouse {
  _id: string
  name: string
}

interface User {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
}

interface Category {
  _id: string
  name: string
}

export default function NewStockCheckPage() {
  const router = useRouter()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouseId, setWarehouseId] = useState("")
  const [checkType, setCheckType] = useState<"full" | "partial" | "cycle" | "emergency">("full")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [supervisor, setSupervisor] = useState("")
  const [assignedCounters, setAssignedCounters] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true)
      try {
        const [warehouseResult, usersResult, categoriesResult] = await Promise.allSettled([
          fetchJson("/api/stock/warehouses"),
          fetchJson("/api/users"),
          fetchJson("/api/stock/categories"),
        ])

        if (warehouseResult.status === "fulfilled" && warehouseResult.value.response.ok) {
          setWarehouses(warehouseResult.value.data?.data || [])
        }

        if (usersResult.status === "fulfilled" && usersResult.value.response.ok) {
          setUsers(usersResult.value.data?.data || [])
        }

        if (categoriesResult.status === "fulfilled" && categoriesResult.value.response.ok) {
          setCategories(categoriesResult.value.data?.data || [])
        }
      } catch {
        setWarehouses([])
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [])

  const toggleCounter = (userId: string) => {
    setAssignedCounters((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!warehouseId) {
      window.alert("Please select a warehouse")
      return
    }
    if (checkType !== "full" && selectedCategories.length === 0) {
      window.alert("Please select at least one category for partial, cycle, or emergency checks.")
      return
    }

    setSaving(true)

    try {
      const result = await fetchJson("/api/stock/stock-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          checkType,
          categories: checkType !== "full" ? selectedCategories : undefined,
          supervisor: supervisor === "unassigned" || supervisor === "" ? undefined : supervisor,
          assignedCounters: assignedCounters.length > 0 ? assignedCounters : undefined,
          notes,
        }),
      })
      
      if (!result.response.ok) {
        window.alert(result.data?.message || result.errorMessage || "Failed to create stock check")
        return
      }
      const newStockCheckId = result.data?.data?._id
      if (newStockCheckId) {
        router.push(`/admin/stock/stock-check/${newStockCheckId}/review`)
      } else {
        router.push("/admin/stock/stock-check")
      }
    } catch (error) {
      window.alert("Failed to create stock check")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">New stock check</h1>
            <p className="text-sm text-muted-foreground">
              Create a new stock check schedule for a warehouse and assign supervision.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/stock/stock-check">Back to stock checks</Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Create a new stock check</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouse" className="w-full">
                  <SelectValue placeholder={loading ? "Loading warehouses..." : "Select a warehouse"} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="checkType">Check type</Label>
              <Select value={checkType} onValueChange={(value) => setCheckType(value as any)}>
                <SelectTrigger id="checkType" className="w-full">
                  <SelectValue placeholder="Select a check type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cycle">Cycle</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {checkType !== "full" && (
              <div className="grid gap-2">
                <Label>Categories to count</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-[250px] overflow-y-auto bg-slate-50">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories available</p>
                  ) : (
                    categories.map((category) => (
                      <div key={category._id} className="flex items-center gap-2">
                        <Checkbox
                          id={`category-${category._id}`}
                          checked={selectedCategories.includes(category._id)}
                          onCheckedChange={() => {
                            setSelectedCategories((prev) =>
                              prev.includes(category._id)
                                ? prev.filter((id) => id !== category._id)
                                : [...prev, category._id],
                            )
                          }}
                        />
                        <Label
                          htmlFor={`category-${category._id}`}
                          className="flex-1 font-normal cursor-pointer"
                        >
                          {category.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {selectedCategories.length > 0 ? (
                  <p className="text-sm text-slate-600">
                    {selectedCategories.length} category(s) selected
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select at least one category for partial or cycle checks.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="supervisor">Supervisor (optional)</Label>
              <Select value={supervisor} onValueChange={setSupervisor}>
                <SelectTrigger id="supervisor" className="w-full">
                  <SelectValue placeholder="Select a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.firstName || user.email} {user.lastName || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Employees Conducting Stock Check (optional)</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-[250px] overflow-y-auto bg-slate-50">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees available</p>
                ) : (
                  users.map((user) => (
                    <div key={user._id} className="flex items-center gap-2">
                      <Checkbox
                        id={`counter-${user._id}`}
                        checked={assignedCounters.includes(user._id)}
                        onCheckedChange={() => toggleCounter(user._id)}
                      />
                      <Label
                        htmlFor={`counter-${user._id}`}
                        className="flex-1 font-normal cursor-pointer"
                      >
                        {user.firstName || user.email} {user.lastName || ""}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {assignedCounters.length > 0 && (
                <p className="text-sm text-slate-600">
                  {assignedCounters.length} employee(s) selected
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add any stock check instructions or notes"
                className="min-h-[120px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Creating..." : "Create stock check"}
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/admin/stock/stock-check">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
