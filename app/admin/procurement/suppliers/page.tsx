"use client"

import { useState, useEffect } from "react"
import { procurementApi } from "@/lib/api"
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
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"
import { Search, Plus } from "lucide-react"

export default function SuppliersPage() {
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState({
    name: "", contactName: "", email: "", phone: "", address: "", taxPin: "", paymentTerms: "",
    bankName: "", accountName: "", accountNumber: "", branch: "",
  })

  useEffect(() => { loadSuppliers() }, [])

  const loadSuppliers = async () => {
    try {
      const res = await procurementApi.getSuppliers()
      if (res.success) setSuppliers(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) return alert("Supplier name is required")
      
      setSaving(true)
      const payload = {
        ...formData,
        bankDetails: {
          bankName: formData.bankName,
          accountName: formData.accountName,
          accountNumber: formData.accountNumber,
          branch: formData.branch,
        }
      }
      const res = await procurementApi.createSupplier(payload)
      if (res.success) {
        setModalOpen(false)
        setFormData({ name: "", contactName: "", email: "", phone: "", address: "", taxPin: "", paymentTerms: "", bankName: "", accountName: "", accountNumber: "", branch: "" })
        loadSuppliers()
      }
    } catch (error: any) {
      alert(error.message || "Failed to save supplier")
    } finally {
      setSaving(false)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.contactName || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <PageLoadingSkeleton title="Vendors & Suppliers" rows={5} />

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Vendors & Suppliers
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              {filteredSuppliers.length}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your supplier directory for procurement.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full sm:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              className="pl-9 h-9 w-full bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="sm" className="h-9 w-full sm:w-auto bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
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
                  <th className="px-6 py-3">Supplier Name</th>
                  <th className="px-6 py-3">Contact Person</th>
                  <th className="px-6 py-3">Email / Phone</th>
                  <th className="px-6 py-3">Tax PIN</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      {searchTerm ? "No suppliers match your search." : "No suppliers found. Create your first supplier."}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-3 font-medium text-foreground">{supplier.name}</td>
                      <td className="px-6 py-3">{supplier.contactName || "—"}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground">{supplier.email || "—"}</span>
                          <span className="text-xs text-muted-foreground">{supplier.phone || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">{supplier.taxPin || "—"}</td>
                      <td className="px-6 py-3">
                        <Badge variant={supplier.status === "active" ? "default" : "secondary"} className="font-medium">
                          {supplier.status}
                        </Badge>
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="e.g. Jane Doe" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax PIN</Label>
                <Input value={formData.taxPin} onChange={e => setFormData({...formData, taxPin: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} placeholder="e.g. Net 30" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>

            <div className="pt-4 border-t space-y-4">
              <Label className="font-semibold">Bank Details (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
