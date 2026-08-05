"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { ProductEditDialog } from "./product-edit-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  categoryId?: string
  category?: string
  description?: string
  sku?: string
  unitPrice?: number
  quantity?: number
  reorderLevel?: number
  supplier?: string
}

interface ProductsManagerProps {
  products: Product[]
  categories: Category[]
  onRefresh: () => void
}

export function ProductsManager({ products, categories, onRefresh }: ProductsManagerProps) {
  const { toast } = useToast()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleting, setDeleting] = useState(false)

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown"
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryName(p.categoryId || p.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockProducts = filteredProducts.filter((p) => p.quantity && p.reorderLevel && p.quantity <= p.reorderLevel)

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditDialogOpen(true)
  }

  const handleSaveProduct = (updatedProduct: Product) => {
    onRefresh()
    toast({ title: "Success", description: "Product updated successfully" })
  }

  const handleDeleteProduct = async (product: Product) => {
    setDeleting(true)
    try {
      const response = await fetch(`${API_URL}/api/stock/products/${product.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to delete product")
      }

      toast({ title: "Success", description: "Product deleted successfully" })
      setDeleteConfirm(null)
      onRefresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete product", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Manage Products
          </CardTitle>
          <CardDescription>Search and edit existing products</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by product name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 mb-2">
              {lowStockProducts.length} product(s) have reached or fallen below reorder level:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {lowStockProducts.slice(0, 8).map((product) => (
                <div key={product.id} className="text-xs bg-white p-2 rounded border border-amber-200">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-amber-600">
                    {product.quantity}/{product.reorderLevel}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length > 0 ? (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Qty / Reorder</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.quantity && product.reorderLevel && product.quantity <= product.reorderLevel
                    return (
                      <TableRow key={product.id} className={isLowStock ? "bg-amber-50" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{getCategoryName(product.categoryId || product.category || "")}</TableCell>
                        <TableCell className="text-right font-mono">
                          Ksh {product.unitPrice?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={isLowStock ? "text-amber-700 font-bold" : ""}>
                            {product.quantity || 0} / {product.reorderLevel || 10}
                          </span>
                        </TableCell>
                        <TableCell className="truncate max-w-[150px]">{product.supplier || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              title="Edit product"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(product)}
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No products match your search" : "No products available"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <ProductEditDialog
        open={editDialogOpen}
        product={editingProduct}
        categories={categories}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveProduct}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
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
              onClick={() => deleteConfirm && handleDeleteProduct(deleteConfirm)}
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
