'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/fetchUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Edit, Plus } from 'lucide-react'
import CreateServiceDialog from './CreateServiceDialog'
import EditServiceDialog from './EditServiceDialog'

interface Service {
  _id: string
  name: string
  sellingPrice: number
  isRecurring: boolean
  intervalDays: number
  isActive: boolean
}

export default function ServicesList() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const result = await fetchJson<{ success: boolean; data: Service[]; message?: string }>('/api/stock/services')
      if (result.response.ok && result.data?.success) {
        setServices(result.data.data)
      } else {
        throw new Error(result.errorMessage || 'Failed to fetch services')
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch services'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (service: Service) => {
    setSelectedService(service)
    setIsEditOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      const result = await fetchJson<{ success: boolean; message?: string }>(`/api/stock/services/${id}`, { method: 'DELETE' })
      if (result.response.ok && result.data?.success) {
        setServices(services.filter(s => s._id !== id))
      } else {
        throw new Error(result.errorMessage || 'Failed to delete service')
      }
    } catch (error) {
      console.error('Failed to delete service:', error)
      const message = error instanceof Error ? error.message : 'Failed to delete service'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const filteredServices = services.filter(s =>
    search === '' || s.name.toLowerCase().includes(search.toLowerCase())
  )


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Services Management</CardTitle>
          <CardDescription>Create and manage services for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Service
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map(service => (
                  <TableRow key={service._id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>KES {service.sellingPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      {service.isRecurring ? `Every ${service.intervalDays} days` : 'No'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateServiceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          fetchServices()
          setIsCreateOpen(false)
        }}
      />

      {selectedService && (
        <EditServiceDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          service={selectedService}
          onSuccess={() => {
            fetchServices()
            setIsEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
