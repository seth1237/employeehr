"use client"

import { useState, useEffect } from "react"
import { generatePurchaseRequestPdf } from "@/lib/stock-document-pdf"
import { procurementApi, companyApi, stockApi } from "@/lib/api"
import { Printer } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Search } from "lucide-react"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"

export default function PurchaseRequestsPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [branding, setBranding] = useState<any>({})
  
  const [dateRequired, setDateRequired] = useState("")
  const [department, setDepartment] = useState("")
  const [items, setItems] = useState([{ productName: "", quantity: 1, estimatedUnitPrice: 0, reason: "" }])
  const [departments, setDepartments] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [purchaseType, setPurchaseType] = useState<"product" | "department">("product")
  const [categoryId, setCategoryId] = useState("")
  const [stockProducts, setStockProducts] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [prRes, depRes, catRes, brandRes, prodRes] = await Promise.all([
        procurementApi.getPurchaseRequests(),
        companyApi.getDepartments(),
        stockApi.getStockCategories(),
        companyApi.getBranding(),
        stockApi.getProducts()
      ])
      if (prRes.success) setRequests(prRes.data)
      if (depRes.success) setDepartments(depRes.data)
      if (catRes.success) setCategories(catRes.data)
      if (brandRes?.success) setBranding(brandRes.data)
      if (prodRes?.success) setStockProducts(prodRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const res = await procurementApi.getPurchaseRequests()
      if (res.success) {
        setRequests(res.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => setItems([...items, { productName: "", quantity: 1, estimatedUnitPrice: 0, reason: "" }])
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSave = async () => {
    try {
      if (!dateRequired) return alert("Date required is mandatory")
      if (items.some(item => !item.productName || item.quantity < 1)) return alert("Please fill all item names and ensure quantity is at least 1")
      
      setSaving(true)
      
      let total = 0;
      items.forEach(item => total += (Number(item.quantity) * Number(item.estimatedUnitPrice || 0)));

      const payload = {
        dateRequired,
        department: purchaseType === "department" ? department : undefined,
        purchaseType,
        categoryId: purchaseType === "product" ? categoryId : undefined,
        items: items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          estimatedUnitPrice: Number(item.estimatedUnitPrice || 0)
        })),
        totalEstimatedAmount: total
      }

      const res = await procurementApi.createPurchaseRequest(payload)
      if (res.success) {
        setModalOpen(false)
        setDateRequired("")
        setDepartment("")
        setCategoryId("")
        setPurchaseType("product")
        setItems([{ productName: "", quantity: 1, estimatedUnitPrice: 0, reason: "" }])
        loadRequests()
      }
    } catch (error: any) {
      alert(error.message || "Failed to submit request")
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = (req: any) => {
    generatePurchaseRequestPdf({
      requestNumber: req.requestNumber,
      dateRequired: req.dateRequired,
      department: req.department,
      purchaseType: req.purchaseType,
      items: req.items,
      totalEstimatedAmount: req.totalEstimatedAmount,
      branding: branding
    })
  }
  const handleApprove = async (id: string) => {
    try {
      if (!confirm("Are you sure you want to approve this request?")) return;
      const res = await procurementApi.updatePurchaseRequestStatus(id, { status: "approved" });
      if (res.success) loadRequests()
    } catch (error) {
      alert("Failed to approve")
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "draft": return "secondary"
      case "pending_approval": return "outline"
      case "approved": return "default"
      case "rejected": return "destructive"
      case "converted_to_po": return "default"
      default: return "secondary"
    }
  }

  const filteredRequests = requests.filter(r => 
    r.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.items?.some((i: any) => i.productName?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) return <PageLoadingSkeleton title="Purchase Requests" rows={5} />

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Purchase Requests
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              {filteredRequests.length}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Internal requests for procurement.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full sm:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search PRs..."
              className="pl-9 h-9 w-full bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="sm" className="h-9 w-full sm:w-auto bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New PR
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[11px] font-medium">
                <tr>
                  <th className="px-6 py-3">PR Number</th>
                  <th className="px-6 py-3">Date Required</th>
                  <th className="px-6 py-3">Purchase Type</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Est. Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      {searchTerm ? "No PRs match your search." : "No requests found. Create your first PR."}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-3 font-medium text-foreground">{req.requestNumber}</td>
                      <td className="px-6 py-3">{new Date(req.dateRequired).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        {req.purchaseType === "department" ? (
                           <Badge variant="outline">Dep: {req.department}</Badge>
                        ) : (
                           <Badge variant="secondary">Product</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span>{req.items?.length || 0} items</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {req.items?.map((i: any) => i.productName).join(", ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-medium">KES {req.totalEstimatedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 0.00}</td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusColor(req.status)} className="font-medium capitalize">
                          {req.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 space-x-2">
                        {req.status === "pending_approval" && (
                          <Button size="sm" variant="outline" onClick={() => handleApprove(req._id)} className="h-8 text-xs font-medium">
                            Approve
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => handlePrint(req)} className="h-8 text-xs font-medium">
                          <Printer className="mr-1 h-3 w-3" /> Print
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DesktopTableShell>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Required *</Label>
                <Input type="date" value={dateRequired} onChange={e => setDateRequired(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Type *</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={purchaseType}
                  onChange={(e: any) => setPurchaseType(e.target.value)}
                >
                  <option value="product">Product (Stock Category)</option>
                  <option value="department">Department Expense</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {purchaseType === "product" ? (
                <div className="space-y-2">
                  <Label>Product Category *</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={categoryId}
                    onChange={(e: any) => setCategoryId(e.target.value)}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={department}
                    onChange={(e: any) => setDepartment(e.target.value)}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d: any) => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Items Requested</Label>
                <Button size="sm" variant="outline" onClick={handleAddItem} type="button">
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_120px_40px] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Product Name</Label>
                    <Input list={purchaseType === "product" ? "product-suggestions" : undefined} value={item.productName} onChange={e => handleUpdateItem(idx, 'productName', e.target.value)} placeholder={purchaseType === "product" ? "Type to search..." : "Item name"} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Est. Unit Price</Label>
                    <Input type="number" min="0" value={item.estimatedUnitPrice} onChange={e => handleUpdateItem(idx, 'estimatedUnitPrice', e.target.value)} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 text-destructive" onClick={() => handleRemoveItem(idx)} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</Button>
          </DialogFooter>
          <datalist id="product-suggestions">
            {stockProducts
              .filter(p => !categoryId || p.category === categoryId)
              .map(p => <option key={p._id} value={p.name} />)}
          </datalist>
        </DialogContent>
      </Dialog>
    </div>
  )
}
