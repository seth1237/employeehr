"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2, Plus, AlertCircle, Printer } from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { ProductEditDialog } from "./product-edit-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { printProductLabels, printSelectedProductLabels } from "@/components/stock/barcode-print"

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
  barcode?: string
  manufacturerBarcode?: string
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [printCopies, setPrintCopies] = useState("1")
  const [printing, setPrinting] = useState(false)

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

  const printableProducts = useMemo(
    () => filteredProducts.filter((product) => Boolean(product.sku)),
    [filteredProducts],
  )
  const allVisibleSelected =
    printableProducts.length > 0 && printableProducts.every((product) => selectedIds.has(product.id))
  const someVisibleSelected = printableProducts.some((product) => selectedIds.has(product.id))
  const selectedProducts = products.filter((product) => selectedIds.has(product.id) && product.sku)
  const copiesEach = Math.max(1, Number(printCopies || 1) || 1)
  const labelCount = selectedProducts.length * copiesEach

  const toggleSelected = (productId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(productId)
      else next.delete(productId)
      return next
    })
  }

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      printableProducts.forEach((product) => {
        if (checked) next.add(product.id)
        else next.delete(product.id)
      })
      return next
    })
  }

  const handleBulkPrint = async () => {
    if (!selectedProducts.length) {
      toast({
        title: "Select products",
        description: "Tick the products whose barcodes you want on the sheet.",
        variant: "destructive",
      })
      return
    }
    setPrinting(true)
    try {
      const result = await printSelectedProductLabels(selectedProducts, Number(printCopies || 1))
      toast({
        title: "Print dialog opened",
        description:
          result.skipped > 0
            ? `${result.printed} barcode${result.printed === 1 ? "" : "s"} ready. ${result.skipped} without a SKU were skipped.`
            : `${result.printed} barcode${result.printed === 1 ? "" : "s"} on the sheet.`,
      })
    } catch (error: any) {
      toast({
        title: "Could not print",
        description: error.message || "Generate barcodes first, then print.",
        variant: "destructive",
      })
    } finally {
      setPrinting(false)
    }
  }

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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
            <CardDescription>
              Tick products, set copies, then print a 3-up barcode sheet. Products without a SKU stay unselectable until barcodes are generated.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="barcode-copies" className="text-xs text-muted-foreground whitespace-nowrap">
                Copies each
              </Label>
              <Input
                id="barcode-copies"
                type="number"
                min={1}
                max={50}
                className="h-9 w-20"
                value={printCopies}
                onChange={(event) => setPrintCopies(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => toggleSelectAllVisible(!allVisibleSelected)}
              disabled={!printableProducts.length}
            >
              {allVisibleSelected ? "Clear selection" : "Select all with SKU"}
            </Button>
            <Button
              type="button"
              onClick={() => void handleBulkPrint()}
              disabled={printing || selectedProducts.length === 0}
            >
              <Printer className="mr-1.5 h-4 w-4" />
              {printing
                ? "Preparing…"
                : selectedProducts.length
                  ? `Print barcodes (${labelCount})`
                  : "Print barcodes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length > 0 ? (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false
                        }
                        onCheckedChange={(value) => toggleSelectAllVisible(Boolean(value))}
                        aria-label="Select all products with a SKU"
                        disabled={!printableProducts.length}
                      />
                    </TableHead>
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
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            disabled={!product.sku}
                            onCheckedChange={(value) => toggleSelected(product.id, Boolean(value))}
                            aria-label={`Select ${product.name}`}
                          />
                        </TableCell>
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
                            {product.sku ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Print barcode label"
                                onClick={() =>
                                  void printProductLabels({
                                    id: product.id,
                                    name: product.name,
                                    sku: product.sku,
                                    sellingPrice: product.unitPrice,
                                  }, 1)
                                }
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            ) : null}
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
