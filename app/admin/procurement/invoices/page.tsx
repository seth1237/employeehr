"use client"

import { useState, useEffect, Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { procurementApi, cashBankingApi, stockApi } from "@/lib/api"
import { companyApi } from "@/lib/api"
import { Printer } from "lucide-react"
import { Banknote } from "lucide-react"
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
import { Plus, Trash2, Search, ArrowRightLeft } from "lucide-react"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"

function SupplierInvoicesContent() {
  const searchParams = useSearchParams()
  const defaultGrnId = searchParams.get('grn') || ""

  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<any[]>([])
  const [grns, setGrns] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(!!defaultGrnId)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [branding, setBranding] = useState<any>({})
  
  const [grnId, setGrnId] = useState(defaultGrnId)
  const [supplierId, setSupplierId] = useState("") // if no GRN
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [stockProducts, setStockProducts] = useState<any[]>([])
  
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payInvoice, setPayInvoice] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [payAccountId, setPayAccountId] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [payRef, setPayRef] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [invRes, grnRes, ordRes, supRes, bankRes, brandRes, prodRes] = await Promise.all([
        procurementApi.getSupplierInvoices(),
        procurementApi.getGRNs(),
        procurementApi.getPurchaseOrders(),
        procurementApi.getSuppliers(),
        cashBankingApi.getAccounts(),
        companyApi.getBranding(),
        stockApi.getProducts()
      ])
      if (invRes.success) setInvoices(invRes.data)
      if (grnRes.success) setGrns(grnRes.data)
      if (ordRes.success) setOrders(ordRes.data)
      if (supRes.success) setSuppliers(supRes.data)
      if (bankRes?.success) setBankAccounts(bankRes.data)
      if (brandRes?.success) setBranding(brandRes.data)
      if (prodRes?.success) setStockProducts(prodRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill from GRN -> PO
  useEffect(() => {
    if (grnId) {
      const grn = grns.find(g => g._id === grnId)
      if (grn) {
        setSupplierId(grn.supplierId?._id || grn.supplierId)
        
        // Find corresponding PO to get prices
        const po = orders.find(o => o._id === grn.purchaseOrderId?._id || o._id === grn.purchaseOrderId)
        if (po && grn.items) {
          setItems(grn.items.filter((i:any) => Number(i.receivedQuantity) > 0).map((i: any) => {
            const poItem = po.items.find((pi:any) => pi.productName === i.productName)
            return {
              productName: i.productName,
              quantity: i.receivedQuantity,
              unitPrice: poItem ? poItem.unitPrice : 0,
              taxRate: poItem ? poItem.taxRate : 0
            }
          }))
        }
      }
    } else if (modalOpen && !supplierId) {
      setItems([{ productName: "", quantity: 1, unitPrice: 0, taxRate: 0 }])
    }
  }, [grnId, grns, orders, modalOpen])

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
      taxAmount += lineTotal * (Number(item.taxRate || 0) / 100)
    })
    
    return { subTotal, taxAmount, grandTotal: subTotal + taxAmount }
  }, [items])

  const handleSave = async () => {
    try {
      if (!supplierId || !invoiceNumber || !invoiceDate || !dueDate) return alert("Please fill all required fields")
      
      setSaving(true)
      
      const payload = {
        supplierId,
        grnId: grnId || undefined,
        purchaseOrderId: grnId ? grns.find(g => g._id === grnId)?.purchaseOrderId : undefined,
        invoiceNumber,
        invoiceDate,
        dueDate,
        items: items.map(item => ({
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.quantity) * Number(item.unitPrice)
        })),
        subTotal: calculation.subTotal,
        taxAmount: calculation.taxAmount,
        grandTotal: calculation.grandTotal
      }

      const res = await procurementApi.createSupplierInvoice(payload)
      if (res.success) {
        setModalOpen(false)
        setGrnId("")
        setSupplierId("")
        setInvoiceNumber("")
        setDueDate("")
        setItems([{ productName: "", quantity: 1, unitPrice: 0, taxRate: 0 }])
        loadData()
      }
    } catch (error: any) {
      alert(error.message || "Failed to create invoice")
    } finally {
      setSaving(false)
    }
  }

  const handlePostGL = async (id: string) => {
    try {
      if (!confirm("This will post the invoice to the General Ledger (Accounts Payable). Proceed?")) return;
      const res = await procurementApi.postSupplierInvoiceToGL(id);
      if (res.success) {
        alert("Posted to GL successfully")
        loadData()
      }
    } catch (error: any) {
      alert(error.message || "Failed to post to GL")
    }
  }

  const handleOpenPay = (inv: any) => {
    setPayInvoice(inv)
    setPayAmount(String(inv.balanceRemaining || 0))
    setPayAccountId("")
    setPayRef("")
    setPayModalOpen(true)
  }
  
  
  const handlePrint = (inv: any) => {
    // We just trigger a basic layout using print styling or fallback to simple representation
    alert("Printing functionality for AP Invoices is linked to GL reporting. Full AP prints will be downloaded via native system soon.");
  }

  const handleProcessPayment = async () => {
    try {
      if (!payAccountId || !payAmount) return alert("Account and Amount required")
      setSaving(true)
      const res = await procurementApi.paySupplierInvoice(payInvoice._id, {
        accountId: payAccountId,
        amount: Number(payAmount),
        reference: payRef
      })
      if (res.success) {
        setPayModalOpen(false)
        loadData()
      }
    } catch(err:any) {
      alert(err.message || "Failed to process payment")
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "draft": return "secondary"
      case "pending_payment": return "outline"
      case "partially_paid": return "default"
      case "paid": return "default" // could be emerald
      case "cancelled": return "destructive"
      default: return "secondary"
    }
  }

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (inv.supplierId?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <PageLoadingSkeleton title="Supplier Bills" rows={5} />

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Supplier Bills (AP)
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              {filteredInvoices.length}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Log supplier invoices into Accounts Payable.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full sm:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Bills..."
              className="pl-9 h-9 w-full bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="sm" className="h-9 w-full sm:w-auto bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Supplier Bill
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
                  <th className="px-6 py-3">Inv Number</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Inv Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Grand Total</th>
                  <th className="px-6 py-3">Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">GL Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      {searchTerm ? "No bills match your search." : "No supplier bills found."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                      <td className="px-6 py-3">{inv.supplierId?.name || "Unknown"}</td>
                      <td className="px-6 py-3">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3 font-medium">KES {inv.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 0.00}</td>
                      <td className="px-6 py-3 font-medium text-destructive">KES {inv.balanceRemaining?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 0.00}</td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusColor(inv.status)} className="font-medium capitalize">
                          {inv.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        {inv.glPosted ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Posted to GL</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Not Posted</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3 space-x-2">
                        {!inv.glPosted && (
                          <Button size="sm" variant="outline" onClick={() => handlePostGL(inv._id)} className="h-8 text-xs font-medium">
                            <ArrowRightLeft className="mr-1 h-3 w-3" /> GL
                          </Button>
                        )}
                        {inv.glPosted && inv.balanceRemaining > 0 && (
                          <Button size="sm" variant="secondary" onClick={() => handleOpenPay(inv)} className="h-8 text-xs font-medium border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                            <Banknote className="mr-1 h-3 w-3" /> Pay
                          </Button>
                        )}
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
            <DialogTitle>Log Supplier Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Goods Receipt (Optional) *</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={grnId}
                  onChange={e => setGrnId(e.target.value)}
                  disabled={!!defaultGrnId}
                >
                  <option value="">-- Direct Invoice (No GRN) --</option>
                  {grns.filter(g => g.status === "confirmed").map(g => (
                    <option key={g._id} value={g._id}>{g.grnNumber} ({g.supplierId?.name})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  disabled={!!grnId}
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Supplier Invoice Number *</Label>
                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="From their invoice" />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Invoice Items</Label>
                {!grnId && (
                  <Button size="sm" variant="outline" onClick={handleAddItem} type="button">
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_80px_40px] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Input list="inv-product-suggestions" value={item.productName} onChange={e => handleUpdateItem(idx, 'productName', e.target.value)} disabled={!!grnId} placeholder="Type to search..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min="1" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)} disabled={!!grnId} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" min="0" value={item.unitPrice} onChange={e => handleUpdateItem(idx, 'unitPrice', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tax %</Label>
                      <Input type="number" min="0" max="100" value={item.taxRate} onChange={e => handleUpdateItem(idx, 'taxRate', e.target.value)} />
                    </div>
                    {!grnId && (
                      <Button variant="ghost" size="icon" className="h-10 text-destructive" onClick={() => handleRemoveItem(idx)} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Log Invoice"}</Button>
          </DialogFooter>
          <datalist id="inv-product-suggestions">
            {stockProducts.map(p => <option key={p._id} value={p.name} />)}
          </datalist>
        </DialogContent>
      </Dialog>

      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Supplier Bill</DialogTitle>
          </DialogHeader>
          {payInvoice && (
            <div className="grid gap-4 py-4">
              <div className="bg-muted p-3 rounded-md flex justify-between items-center text-sm">
                <span>Bill Total: <strong className="ml-1">KES {payInvoice.grandTotal?.toLocaleString()}</strong></span>
                <span className="text-destructive">Balance: <strong className="ml-1">KES {payInvoice.balanceRemaining?.toLocaleString()}</strong></span>
              </div>
              <div className="space-y-2">
                <Label>Pay From Account *</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={payAccountId}
                  onChange={e => setPayAccountId(e.target.value)}
                >
                  <option value="">-- Select Bank/Cash Account --</option>
                  {bankAccounts.map(b => <option key={b._id} value={b._id}>{b.accountName} ({b.bankName}) - Bal: {b.currentBalance}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount to Pay *</Label>
                <Input type="number" min="1" max={payInvoice.balanceRemaining} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. Check Number, MPESA Ref" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancel</Button>
            <Button onClick={handleProcessPayment} disabled={saving}>{saving ? "Processing..." : "Process Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SupplierInvoicesPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Supplier Bills" />}>
      <SupplierInvoicesContent />
    </Suspense>
  )
}
