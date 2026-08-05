'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/fetchUtils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function CreateServiceDialog({ open, onOpenChange, onSuccess }: CreateServiceDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    isRecurring: false,
    intervalDays: '30',
  })

  useEffect(() => {
    // No longer fetching categories
  }, [open])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await fetchJson<{ success: boolean; data?: any; message?: string }>('/api/stock/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          intervalDays: parseInt(form.intervalDays),
        }),
      })

      if (result.response.ok && result.data?.success) {
        onSuccess()
        setForm({ name: '', description: '', price: '', isRecurring: false, intervalDays: '30' })
      } else {
        throw new Error(result.errorMessage || 'Failed to create service')
      }
    } catch (error) {
      console.error('Failed to create service:', error)
      const message = error instanceof Error ? error.message : 'Failed to create service'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Service</DialogTitle>
          <DialogDescription>Add a new service to your organization</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>


          <div>
            <Label htmlFor="price">Price (KES)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={form.isRecurring}
                onCheckedChange={(checked) => setForm({ ...form, isRecurring: !!checked })}
              />
              <Label htmlFor="recurring">Recurring Service</Label>
            </div>

            {form.isRecurring && (
              <div>
                <Label htmlFor="interval">Interval (days)</Label>
                <Input
                  id="interval"
                  type="number"
                  value={form.intervalDays}
                  onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                />
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Service'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
