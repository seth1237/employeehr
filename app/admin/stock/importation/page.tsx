'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/fetchUtils'
import { getToken } from '@/lib/auth'
import { finishDataLoad, startDataLoad } from '@/lib/silent-load'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'

export default function ImportationPage() {
  const { toast } = useToast()
  const [manufacturers, setManufacturers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'importer'|'local_supplier'>('importer')
  const [form, setForm] = useState({ companyName: '', countryOrLocation: '', contactPerson: '', contactPhone: '', comments: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [assignProduct, setAssignProduct] = useState<any | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedManufacturerForProduct, setSelectedManufacturerForProduct] = useState<string | null>(null)
  const [branding, setBranding] = useState<any>({})

  const primaryColor = branding.primaryColor || '#0f766e'
  const secondaryColor = branding.secondaryColor || '#0ea5e9'
  const primarySoftColor = branding.primaryColor ? `${branding.primaryColor}33` : 'rgba(15, 118, 110, 0.2)'
  const secondarySoftColor = branding.secondaryColor ? `${branding.secondaryColor}22` : 'rgba(14, 165, 233, 0.14)'

  useEffect(() => { loadData() }, [])

  const loadData = async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const token = getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined

      const [mf, pr, brandingResult] = await Promise.all([
        fetchJson('/api/stock/manufacturers', { headers }),
        fetchJson('/api/stock/products', { headers }),
        fetchJson('/api/company/branding', { headers }),
      ])

      if (mf.response.ok && mf.data?.success) setManufacturers(mf.data.data)
      if (pr.response.ok && pr.data?.success) setProducts(pr.data.data)
      if (brandingResult.response.ok && brandingResult.data?.success) setBranding(brandingResult.data.data || {})
    } catch (e) {
      console.error(e)
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  const openDialog = (type: 'importer'|'local_supplier') => {
    setDialogType(type)
    setForm({ companyName: '', countryOrLocation: '', contactPerson: '', contactPhone: '', comments: '' })
    setIsDialogOpen(true)
  }

  const openAssignDialog = (product: any) => {
    setAssignProduct(product)
    setSelectedManufacturerForProduct(product?.manufacturer || null)
    setIsAssignDialogOpen(true)
  }

  const handleCreateManufacturer = async () => {
    setSaving(true)
    try {
      const payload = {
        type: dialogType,
        companyName: form.companyName,
        countryOrLocation: form.countryOrLocation,
        contactPerson: form.contactPerson,
        contactPhone: form.contactPhone,
        comments: form.comments,
      }
      const token = getToken()
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      const res = await fetchJson('/api/stock/manufacturers', { method: 'POST', headers, body: JSON.stringify(payload) })
      if (res.response.ok && res.data?.success) {
        toast({ title: 'Saved', description: 'Manufacturer saved', variant: 'default' })
        setIsDialogOpen(false)
        loadData({ silent: true })
      } else {
        throw new Error(res.errorMessage || 'Failed')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const updateProductManufacturer = async (productId: string, manufacturerId: string) => {
    try {
      const token = getToken()
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      const res = await fetchJson(`/api/stock/products/${productId}`, { method: 'PUT', headers, body: JSON.stringify({ manufacturer: manufacturerId }) })
      if (res.response.ok && res.data?.success) {
        toast({ title: 'Updated', description: 'Product manufacturer updated' })
        loadData({ silent: true })
      } else {
        throw new Error(res.errorMessage || 'Failed to update')
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to update', variant: 'destructive' })
    }
  }

  const handleAssignSave = async () => {
    if (!assignProduct || !selectedManufacturerForProduct) return
    setSaving(true)
    try {
      await updateProductManufacturer(assignProduct._id, selectedManufacturerForProduct)
      setIsAssignDialogOpen(false)
      setAssignProduct(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IMPORTATION</h1>
          <p className="text-sm text-gray-600">Manage importers and local suppliers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openDialog('importer')}>Add Importer</Button>
          <Button onClick={() => openDialog('local_supplier')}>Add Local Supplier</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Saved Sources</CardTitle>
            <CardDescription>Importers and local suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {manufacturers.map(m => (
                <li key={m._id} className="border p-2 rounded">
                  <div className="font-medium">{m.companyName}</div>
                  <div className="text-sm text-gray-600">{m.type === 'importer' ? m.countryOrLocation : m.countryOrLocation}</div>
                  <div className="text-xs text-gray-500">{m.contactPerson} • {m.contactPhone}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Link Products to Manufacturer</CardTitle>
            <CardDescription>Select a product and assign a manufacturer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.categoryDetails?.name || p.category}</TableCell>
                      <TableCell>{p.manufacturerDetails?.companyName || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button onClick={() => openAssignDialog(p)}>Assign</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogType === 'importer' ? 'Add Importer' : 'Add Local Supplier'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Company Name</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div>
              <Label>{dialogType === 'importer' ? 'Country' : 'Location'}</Label>
              <Input value={form.countryOrLocation} onChange={(e) => setForm({ ...form, countryOrLocation: e.target.value })} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div>
              <Label>Comments</Label>
              <Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCreateManufacturer} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manufacturer</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <div className="font-medium">{assignProduct?.name}</div>
            </div>

            <div>
              <Label>Select Manufacturer</Label>
              <Select value={selectedManufacturerForProduct || ''} onValueChange={(val) => setSelectedManufacturerForProduct(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map(m => (
                    <SelectItem key={m._id} value={m._id}>{m.companyName} ({m.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
