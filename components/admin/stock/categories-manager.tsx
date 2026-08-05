"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2, Plus, Package } from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { CategoryEditDialog } from "./category-edit-dialog"

interface Category {
  id: string
  name: string
  description?: string
  level?: number
  parentId?: string
}

interface Product {
  id: string
  name: string
  sku?: string
  category?: string
}

interface CategoriesManagerProps {
  categories: Category[]
  products: Product[]
  onRefresh: () => void
}

export function CategoriesManager({ categories, products, onRefresh }: CategoriesManagerProps) {
  const { toast } = useToast()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDesc, setNewCategoryDesc] = useState("")
  const [newCategoryParentId, setNewCategoryParentId] = useState("none")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const getParentName = (parentId: string) => {
    return categories.find((c) => c.id === parentId)?.name || ""
  }

  const getProductsInCategory = (categoryId: string) => {
    return products.filter((p) => p.category === categoryId)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setEditDialogOpen(true)
  }

  const getSubcategories = (parentId: string) => {
    return categories.filter((c) => c.parentId === parentId)
  }

  const getMainCategories = () => {
    return categories.filter((c) => !c.parentId)
  }

  const renderCategoryHierarchy = (category: Category, depth = 0) => {
    const categoryProducts = getProductsInCategory(category.id)
    const subcategories = getSubcategories(category.id)

    return (
      <div key={category.id}>
        <Card className={`transition-shadow hover:shadow-sm ${depth > 0 ? "ml-6 border-border/70" : ""}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className={`truncate ${depth === 0 ? "text-lg" : depth === 1 ? "text-base" : "text-sm"}`}>
                    {category.name}
                  </CardTitle>
                  {depth > 0 && (
                    <span className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">
                      Subcategory
                    </span>
                  )}
                  {category.level && category.level > 1 && (
                    <span className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">
                      Level {category.level}
                    </span>
                  )}
                </div>
                {category.description && (
                  <CardDescription className="mt-1 line-clamp-2">{category.description}</CardDescription>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditCategory(category)}
                  title="Edit category"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(category)}
                  disabled={deleting}
                  title={
                    subcategories.length > 0
                      ? "Cannot delete - has subcategories"
                      : categoryProducts.length > 0
                        ? "Cannot delete - has products"
                        : "Delete category"
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subcategories.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">{subcategories.length} subcategory/categories</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{categoryProducts.length} product(s)</span>
              </div>
              {categoryProducts.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  {categoryProducts.slice(0, 3).map((product: Product) => (
                    <div key={product.id} className="text-sm truncate text-muted-foreground">
                      • {product.name}
                    </div>
                  ))}
                  {categoryProducts.length > 3 && (
                    <div className="text-sm text-muted-foreground italic">+{categoryProducts.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Render subcategories */}
        {subcategories.map((subcat) => renderCategoryHierarchy(subcat, depth + 1))}
      </div>
    )
  }

  const handleSaveCategory = (updatedCategory: Category) => {
    onRefresh()
    toast({ title: "Success", description: "Category updated successfully" })
  }

  const handleDeleteCategory = async (category: Category) => {
    const subcategories = getSubcategories(category.id)
    const productsInCategory = getProductsInCategory(category.id)
    if (subcategories.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This category has ${subcategories.length} subcategory(ies). Remove them first.`,
        variant: "destructive",
      })
      return
    }
    if (productsInCategory.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This category has ${productsInCategory.length} product(s). Remove all products first.`,
        variant: "destructive",
      })
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`${API_URL}/api/stock/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to delete category")
      }

      toast({ title: "Success", description: "Category deleted successfully" })
      setDeleteConfirm(null)
      onRefresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete category", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const getAvailableParentsForCreate = () => {
    return categories.filter((cat) => !cat.level || cat.level < 3)
  }

  const normalizeInputValue = (value: string) => String(value || "").trim().replace(/\s+/g, " ")

  const handleCreateCategory = async () => {
    const cleanedName = normalizeInputValue(newCategoryName)
    if (!cleanedName) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" })
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`${API_URL}/api/stock/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: cleanedName,
          description: normalizeInputValue(newCategoryDesc) || null,
          parentId: newCategoryParentId && newCategoryParentId !== "none" ? newCategoryParentId : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to create category")
      }

      toast({ title: "Success", description: "Category created successfully" })
      setNewCategoryName("")
      setNewCategoryDesc("")
      setNewCategoryParentId("none")
      onRefresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create category", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create New Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Category
          </CardTitle>
          <CardDescription>Create a new product category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Category name (e.g., Electronics)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={creating}
          />
          <Input
            placeholder="Description (optional)"
            value={newCategoryDesc}
            onChange={(e) => setNewCategoryDesc(e.target.value)}
            disabled={creating}
          />
          {getAvailableParentsForCreate().length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category (Optional)</Label>
              <Select value={newCategoryParentId} onValueChange={setNewCategoryParentId} disabled={creating}>
                <SelectTrigger id="parentId">
                  <SelectValue placeholder="Select a parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (main category)</SelectItem>
                  {getAvailableParentsForCreate().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleCreateCategory} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create Category"}
          </Button>
        </CardContent>
      </Card>

      {/* Categories List - Hierarchical */}
      <div className="space-y-3">
        {getMainCategories().map((category) => renderCategoryHierarchy(category, 0))}
      </div>

      {categories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No categories yet. Create one to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Category Dialog */}
      <CategoryEditDialog
        open={editDialogOpen}
        category={editingCategory}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveCategory}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "<strong>{deleteConfirm?.name}</strong>"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteCategory(deleteConfirm)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
