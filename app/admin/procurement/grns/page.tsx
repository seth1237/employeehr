"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { generateGrnPdf } from "@/lib/stock-document-pdf"
import { procurementApi, stockApi, companyApi } from "@/lib/api"
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
import { Plus, Search, CheckCircle, Printer } from "lucide-react"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"

function GRNContent() {
  const searchParams = useSearchParams()
  const defaultPoId = searchParams.get('po') || ""

  const [loading, setLoading] = useState(true)
  const [grns, setGrns] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [stockProducts, setStockProducts] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(!!defaultPoId)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [branding, setBranding] = useState<any>({})
  
  const [purchaseOrderId, setPurchaseOrderId] = useState(defaultPoId)
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("")
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [grnRes, ordRes, supRes, prodRes, brandRes] = await Promise.all([
        procurementApi.getGRNs(),
        procurementApi.getPurchaseOrders(),
        procurementApi.getSuppliers(),
        stockApi.getProducts(),
        companyApi.getBranding()
      ])
      if (grnRes.success) setGrns(grnRes.data)
      if (ordRes.success) setOrders(ordRes.data)
      if (supRes.success) setSuppliers(supRes.data)
      if (prodRes.success) setStockProducts(prodRes.data)
      if (brandRes?.success) setBranding(brandRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill from PO
  useEffect(() => {
    if (purchaseOrderId) {
      const po = orders.find(o => o._id === purchaseOrderId)
      if (po && po.items) {
        setItems(po.items.map((i: any) => {
          // Attempt to match PO item to stock product by name
          const match = stockProducts.find(p => p.name.toLowerCase() === i.productName.toLowerCase())
          return {
            productName: i.productName,
            productId: match ? match._id : "", // Pre-fill if found
            orderedQuantity: i.quantity,
            receivedQuantity: i.quantity, // Default to full receipt
            rejectedQuantity: 0,
            rejectionReason: ""
          }
        }))
      }
    } else {
      setItems([])
    }
  }, [purchaseOrderId, orders, stockProducts])

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSave = async () => {
    try {
      if (!purchaseOrderId) return alert("Purchase Order is required")
      const po = orders.find(o => o._id === purchaseOrderId)
      if (!po) return alert("Invalid PO")

      // Ensure mapping to stock system
      if (items.some(item => !item.productId)) {
        return alert("All items must be mapped to an existing Stock Product in the system before receiving.")
      }
      
      setSaving(true)
      
      const payload = {
        purchaseOrderId,
        supplierId: po.supplierId,
        receiptDate,
        deliveryNoteNumber,
        items: items.map(item => ({
          ...item,
          orderedQuantity: Number(item.orderedQuantity),
          receivedQuantity: Number(item.receivedQuantity),
          rejectedQuantity: Number(item.rejectedQuantity)
        }))
      }

      const res = await procurementApi.createGRN(payload)
      if (res.success) {
        setModalOpen(false)
        setPurchaseOrderId("")
        setDeliveryNoteNumber("")
        setItems([])
        loadData()
      }
    } catch (error: any) {
      alert(error.message || "Failed to create GRN")
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = (grn: any) => {
    generateGrnPdf({
      grnNumber: grn.grnNumber,
      receiptDate: grn.receiptDate,
      deliveryNoteNumber: grn.deliveryNoteNumber,
      supplier: grn.supplierId || { name: "Unknown" },
      poNumber: grn.purchaseOrderId?.poNumber,
      items: grn.items,
      branding: branding
    })
  }
  const handleConfirm = async (id: string) => {
    try {
      if (!confirm("Confirming this GRN will permanently update inventory quantities in the stock module. Proceed?")) return;
      const res = await procurementApi.confirmGRN(id);
      if (res.success) {
        alert("Stock updated successfully!")
        loadData()
      }
    } catch (error: any) {
      alert(error.message || "Failed to confirm GRN")
    }
  }

  const filteredGrns = grns.filter(g => 
    g.grnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (g.supplierId?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <PageLoadingSkeleton title="Goods Receipt Notes" rows={5} />

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Goods Receipt Notes
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              {filteredGrns.length}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Receive goods and update inventory.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full sm:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GRNs..."
              className="pl-9 h-9 w-full bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="sm" className="h-9 w-full sm:w-auto bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Receive Goods
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
                  <th className="px-6 py-3">GRN Number</th>
                  <th className="px-6 py-3">PO Reference</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredGrns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      {searchTerm ? "No GRNs match your search." : "No receipt notes found."}
                    </td>
                  </tr>
                ) : (
                  filteredGrns.map((grn) => (
                    <tr key={grn._id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-3 font-medium text-foreground">{grn.grnNumber}</td>
                      <td className="px-6 py-3">
                        {grn.purchaseOrderId?.poNumber || "Unknown PO"}
                      </td>
                      <td className="px-6 py-3">{grn.supplierId?.name || "Unknown"}</td>
                      <td className="px-6 py-3">{new Date(grn.receiptDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span>{grn.items?.length || 0} lines</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {grn.items?.map((i: any) => `${i.receivedQuantity}x ${i.productName}`).join(", ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={grn.status === "confirmed" ? "default" : "secondary"} className="font-medium">
                          {grn.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 space-x-2">
                        {grn.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => handleConfirm(grn._id)} className="h-8 text-xs font-medium border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Confirm
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => handlePrint(grn)} className="h-8 text-xs font-medium">
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
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Receive Goods (GRN)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Against Purchase Order *</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={purchaseOrderId}
                  onChange={e => setPurchaseOrderId(e.target.value)}
                  disabled={!!defaultPoId}
                >
                  <option value="">-- Select PO --</option>
                  {orders.filter(o => o.status === "issued" || o.status === "partially_received").map(o => (
                    <option key={o._id} value={o._id}>{o.poNumber} ({o.supplierId?.name})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Receipt Date *</Label>
                <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Note Number</Label>
                <Input value={deliveryNoteNumber} onChange={e => setDeliveryNoteNumber(e.target.value)} placeholder="From supplier's paperwork" />
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <Label className="font-semibold text-primary">Item Receiving & Stock Mapping</Label>
              <p className="text-xs text-muted-foreground -mt-2">Map supplier items to internal stock products. Quantities received here will be added to inventory.</p>
              
              <div className="space-y-3">
                {items.length === 0 && <p className="text-sm text-muted-foreground italic">Select a PO first.</p>}
                
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1.5fr_1fr_80px_80px_1fr] gap-2 items-start border p-3 rounded-md bg-muted/20">
                    <div className="space-y-1">
                      <Label className="text-xs">PO Item Name</Label>
                      <Input value={item.productName} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-primary">Map to Stock Product *</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={item.productId}
                        onChange={e => handleUpdateItem(idx, 'productId', e.target.value)}
                      >
                        <option value="">-- Link Product --</option>
                        {stockProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ordered</Label>
                      <Input value={item.orderedQuantity} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Received</Label>
                      <Input type="number" min="0" value={item.receivedQuantity} onChange={e => handleUpdateItem(idx, 'receivedQuantity', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reject Qty & Reason</Label>
                      <div className="flex gap-2">
                        <Input type="number" min="0" className="w-16" value={item.rejectedQuantity} onChange={e => handleUpdateItem(idx, 'rejectedQuantity', e.target.value)} />
                        <Input placeholder="Reason" value={item.rejectionReason} onChange={e => handleUpdateItem(idx, 'rejectionReason', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Create Draft GRN"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function GoodsReceiptNotesPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Goods Receipt Notes" />}>
      <GRNContent />
    </Suspense>
  )
}
