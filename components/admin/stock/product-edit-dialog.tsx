"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import API_URL from "@/lib/apiBase";
import { getToken } from "@/lib/auth";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  categoryId?: string;
  category?: string;
  description?: string;
  sku?: string;
  unitPrice?: number;
  quantity?: number;
  reorderLevel?: number;
  supplier?: string;
  manufacturer?: string;
  imageUrl?: string;
}

interface ProductEditDialogProps {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onOpenChange: (open: boolean) => void;
  onSave: (product: Product) => void;
}

export function ProductEditDialog({
  open,
  product,
  categories,
  onOpenChange,
  onSave,
}: ProductEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    description: "",
    sku: "",
    unitPrice: "",
    quantity: "",
    reorderLevel: "",
    supplier: "",
    manufacturer: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [manufacturers, setManufacturers] = useState<any[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        categoryId: product.categoryId || product.category || "",
        description: product.description || "",
        sku: product.sku || "",
        unitPrice:
          (product.unitPrice ?? product.unitPrice === 0)
            ? String(product.unitPrice)
            : "",
        quantity:
          (product.quantity ?? product.quantity === 0)
            ? String(product.quantity)
            : "",
        reorderLevel:
          (product.reorderLevel ?? product.reorderLevel === 0)
            ? String(product.reorderLevel)
            : "10",
        supplier: product.supplier || "",
        manufacturer: product.manufacturer || "",
      });
      setSelectedImage(null);
      fetchManufacturers();
    }
  }, [product, open]);

  const fetchManufacturers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stock/manufacturers`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (data.success) setManufacturers(data.data);
    } catch (e) {}
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.categoryId) {
      toast({
        title: "Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }

    const unitPrice = parseFloat(formData.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      toast({
        title: "Error",
        description: "Unit price must be a valid positive number",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      toast({
        title: "Error",
        description: "Quantity must be a valid positive number",
        variant: "destructive",
      });
      return;
    }

    const reorderLevel = parseInt(formData.reorderLevel);
    if (isNaN(reorderLevel) || reorderLevel < 0) {
      toast({
        title: "Error",
        description: "Reorder level must be a valid positive number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append("name", formData.name.trim());
      submitData.append("category", formData.categoryId);
      submitData.append("description", formData.description.trim() || "");
      submitData.append("sku", formData.sku.trim() || "");
      submitData.append("sellingPrice", String(unitPrice));
      submitData.append("minAlertQuantity", String(reorderLevel));
      submitData.append("supplier", formData.supplier.trim() || "");
      submitData.append("manufacturer", formData.manufacturer || "");
      if (selectedImage) submitData.append("image", selectedImage);

      const response = await fetch(
        `${API_URL}/api/stock/products/${product?.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: submitData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update product");
      }

      toast({ title: "Success", description: "Product updated successfully" });
      onSave(data.data);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product details and pricing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Laptop"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => handleSelectChange("categoryId", value)}
              disabled={loading}
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add product description..."
              rows={2}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Optional)</Label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="e.g., SKU-001"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier (Optional)</Label>
              <Input
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                placeholder="Supplier name"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={handleInputChange}
                placeholder="0.00"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="0"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reorderLevel">Reorder Level</Label>
            <Input
              id="reorderLevel"
              name="reorderLevel"
              type="number"
              value={formData.reorderLevel}
              onChange={handleInputChange}
              placeholder="10"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Manufacturer / Source</Label>
            <Select
              value={formData.manufacturer}
              onValueChange={(value) =>
                handleSelectChange("manufacturer", value)
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {manufacturers.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.companyName} ({m.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Product Image (Optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              disabled={loading}
            />
            {product?.imageUrl && !selectedImage && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                <span>Current:</span>
                <img
                  src={`${API_URL}${product.imageUrl}`}
                  alt="Product"
                  className="w-8 h-8 rounded object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
