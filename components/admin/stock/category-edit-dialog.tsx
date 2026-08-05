"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  level?: number
}

interface CategoryEditDialogProps {
  open: boolean
  category: Category | null
  allCategories?: Category[]
  onOpenChange: (open: boolean) => void
  onSave: (category: Category) => void
}

export function CategoryEditDialog({ open, category, allCategories = [], onOpenChange, onSave }: CategoryEditDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: "",
  })

  // Fetch category data when dialog opens
  useEffect(() => {
    if (open && category?.id) {
      fetchCategoryData()
    } else if (!open) {
      setFormData({ name: "", description: "", parentId: "none" })
    }
  }, [open, category?.id])

  const fetchCategoryData = async () => {
    setFetching(true)
    try {
      const response = await fetch(`${API_URL}/api/stock/categories/${category?.id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })
      const data = await response.json()
      if (response.ok && data.data) {
        setFormData({
          name: data.data.name || "",
          description: data.data.description || "",
          parentId: data.data.parentId || "none",
        })
      }
    } catch (error) {
      console.error("Failed to fetch category data:", error)
    } finally {
      setFetching(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      parentId: value,
    }))
  }

  // Get available parent categories (filter to only allow level 1 or 2 as parents)
  const getAvailableParents = () => {
    return allCategories.filter(
      (cat) => cat.id !== category?.id && (!cat.level || cat.level < 3)
    )
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/stock/categories/${category?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          parentId: formData.parentId && formData.parentId !== "none" ? formData.parentId : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to update category")
      }

      toast({ title: "Success", description: "Category updated successfully" })
      onSave(data.data)
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update category", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>Update category name and description</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fetching && <p className="text-sm text-muted-foreground">Loading category data...</p>}
          
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Lab Equipment"
              disabled={loading || fetching}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add a description for this category..."
              rows={3}
              disabled={loading || fetching}
            />
          </div>

          {getAvailableParents().length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category (Optional)</Label>
              <Select value={formData.parentId} onValueChange={handleSelectChange} disabled={loading || fetching}>
                <SelectTrigger id="parentId">
                  <SelectValue placeholder="Select a parent category (for subcategories)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (main category)</SelectItem>
                  {getAvailableParents().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Create subcategories by selecting a parent category</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || fetching}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || fetching}>
            {loading ? "Saving..." : fetching ? "Loading..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
