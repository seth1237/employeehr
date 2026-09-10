"use client"

import { useState, useEffect, useMemo } from "react"
import { procurementApi, companyApi, stockApi } from "@/lib/api"
import { generatePurchaseOrderPdf } from "@/lib/stock-document-pdf"
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
import { Plus, Trash2, Search, Edit } from "lucide-react"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [branding, setBranding] = useState<any>({})
  
  const [supplierId, setSupplierId] = useState("")
  const [purchaseRequestId, setPurchaseRequestId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")
  const [items, setItems] = useState([{ productName: "", quantity: 1, unitPrice: 0, taxRate: 0 }])
  const [stockProducts, setStockProducts] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ordRes, supRes, reqRes, brandRes, prodRes] = await Promise.all([
        procurementApi.getPurchaseOrders(),
        procurementApi.getSuppliers(),
        procurementApi.getPurchaseRequests(),
        companyApi.getBranding(),
        stockApi.getProducts()
      ])
      if (ordRes.success) setOrders(ordRes.data)
      if (supRes.success) setSuppliers(supRes.data)
      if (reqRes.success) setRequests(reqRes.data)
      if (brandRes?.success) setBranding(brandRes.data)
      if (prodRes?.success) setStockProducts(prodRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill from PR
  useEffect(() => {
    if (purchaseRequestId) {
      const pr = requests.find(r => r._id === purchaseRequestId)
      if (pr && pr.items) {
        setItems(pr.items.map((i: any) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.estimatedUnitPrice || 0,
          taxRate: 0
        })))
      }
    }
  }, [purchaseRequestId, requests])

  const handleAddItem = () => setItems([...items, { productName: "", quantity: 1, unitPrice: 0, taxRate: 0 }])
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculation = useMemo(() => {
    let subTotal = 0
    let taxAmount = 0
    
    items.forEach(item => {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice)
      subTotal += lineTotal
      taxAmount += lineTotal * (Number(item.taxRate) / 100)
    })
    
    return { subTotal, taxAmount, grandTotal: subTotal + taxAmount }
  }, [items])

  
  const handleEdit = (ord: any) => {
    setEditId(ord._id)
    setSupplierId(ord.supplierId?._id || ord.supplierId || "")
    setPurchaseRequestId(ord.purchaseRequestId || "")
    setDeliveryDate(ord.deliveryDate ? new Date(ord.deliveryDate).toISOString().split('T')[0] : "")
    setTermsAndConditions(ord.termsAndConditions || "")
    setItems(ord.items.map((i: any) => ({ ...i })))
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (!supplierId || !deliveryDate) return alert("Supplier and Delivery Date are required")
      if (items.some(item => !item.productName || item.quantity < 1 || item.unitPrice < 0)) {
        return alert("Please check item lines (Names, Qty > 0, Price >= 0)")
      }
      
      setSaving(true)
      
      const payload = {
        supplierId,
        purchaseRequestId: purchaseRequestId || undefined,
        deliveryDate,
        termsAndConditions,
        items: items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          lineTotal: Number(item.quantity) * Number(item.unitPrice)
        })),
        subTotal: calculation.subTotal,
        taxAmount: calculation.taxAmount,
        grandTotal: calculation.grandTotal
      }

      const res = editId ? await procurementApi.updatePurchaseOrder(editId, payload) : await procurementApi.createPurchaseOrder(payload)
      if (res.success) {
        setModalOpen(false)
        setEditId("")
        setSupplierId("")
        setPurchaseRequestId("")
        setDeliveryDate("")
        setTermsAndConditions("")
        setItems([{ productName: "", quantity: 1, unitPrice: 0, taxRate: 0 }])
        loadData()
      }
    } catch (error: any) {
      alert(error.message || "Failed to create PO")
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = (ord: any) => {
    generatePurchaseOrderPdf({
      poNumber: ord.poNumber,
      orderDate: ord.orderDate,
      deliveryDate: ord.deliveryDate,
      supplier: ord.supplierId,
      items: ord.items,
      subTotal: ord.subTotal,
      taxTotal: ord.taxAmount,
      grandTotal: ord.grandTotal,
      branding: branding,
      termsAndConditions: ord.termsAndConditions,
      preparedBy: ord.issuedBy?.firstName ? `${ord.issuedBy.firstName} ${ord.issuedBy.lastName || ""}` : "Procurement Officer",
    });
  }

  const handleIssue = async (id: string) => {
    try {
      if (!confirm("Issue this PO to the supplier? This changes status to 'issued'.")) return;
      const res = await procurementApi.updatePurchaseOrderStatus(id, { status: "issued" });
      if (res.success) loadData()
    } catch (error) {
      alert("Failed to issue")
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "draft": return "secondary"
      case "issued": return "default"
      case "partially_received": return "outline"
      case "fulfilled": return "default"
      case "cancelled": return "destructive"
      default: return "secondary"
    }
  }

  const filteredOrders = orders.filter(o => 
    o.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.supplierId?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <PageLoadingSkeleton title="Purchase Orders" rows={5} />

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Purchase Orders
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              {filteredOrders.length}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage vendor purchase orders.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full sm:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search POs..."
              className="pl-9 h-9 w-full bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="sm" className="h-9 w-full sm:w-auto bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create PO
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
                  <th className="px-6 py-3">PO Number</th>
                  <th className="px-6 py-3">Order Date</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Grand Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      {searchTerm ? "No POs match your search." : "No orders found. Create your first PO."}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-3 font-medium text-foreground">{ord.poNumber}</td>
                      <td className="px-6 py-3">{new Date(ord.orderDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3">{ord.supplierId?.name || "Unknown Supplier"}</td>
                      <td className="px-6 py-3 font-medium">KES {ord.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 0.00}</td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusColor(ord.status)} className="font-medium capitalize">
                          {ord.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 space-x-2">
                        {ord.status === "draft" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(ord)} className="h-8 text-xs font-medium">
                              <Edit className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleIssue(ord._id)} className="h-8 text-xs font-medium">
                              Issue PO
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => handlePrint(ord)} className="h-8 text-xs font-medium">
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

      <Dialog open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) setEditId(""); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Link from PR (Optional)</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={purchaseRequestId}
                  onChange={e => setPurchaseRequestId(e.target.value)}
                >
                  <option value="">-- Direct PO (No PR) --</option>
                  {requests.filter(r => r.status === "approved").map(r => (
                    <option key={r._id} value={r._id}>{r.requestNumber} - {r.department}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Delivery Date *</Label>
                <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Input value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} placeholder="e.g. Net 30, Deliver to main warehouse" />
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Order Items</Label>
                <Button size="sm" variant="outline" onClick={handleAddItem} type="button">
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_80px_40px] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Input list="po-product-suggestions" value={item.productName} onChange={e => handleUpdateItem(idx, 'productName', e.target.value)} placeholder="Type to search..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min="1" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" min="0" value={item.unitPrice} onChange={e => handleUpdateItem(idx, 'unitPrice', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tax %</Label>
                      <Input type="number" min="0" max="100" value={item.taxRate} onChange={e => handleUpdateItem(idx, 'taxRate', e.target.value)} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 text-destructive" onClick={() => handleRemoveItem(idx)} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>KES {calculation.subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Amount:</span>
                    <span>KES {calculation.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Grand Total:</span>
                    <span>KES {calculation.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditId(""); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editId ? "Update PO" : "Create PO"}</Button>
          </DialogFooter>
          <datalist id="po-product-suggestions">
            {stockProducts.map(p => <option key={p._id} value={p.name} />)}
          </datalist>
        </DialogContent>
      </Dialog>
    </div>
  )
}
