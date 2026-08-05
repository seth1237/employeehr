'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/fetchUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import CreateJobDialog from './CreateJobDialog'

interface Job {
  _id: string
  serviceName: string
  clientName: string
  scheduledDate: string
  status: 'pending' | 'in-progress' | 'done' | 'cancelled'
  notes?: string
  isRecurring: boolean
  completedDate?: string
}

const statusBadgeColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusIcons = {
  pending: Clock,
  'in-progress': AlertCircle,
  done: CheckCircle,
  cancelled: AlertCircle,
}

export default function ServiceJobsList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchClient, setSearchClient] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchJobs()
  }, [statusFilter])

  const fetchJobs = async () => {
    try {
      const url = new URL('/api/stock/services/jobs', window.location.origin)
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter)
      }

      const result = await fetchJson<{ success: boolean; data: Job[]; message?: string }>(url.toString())
      if (result.response.ok && result.data?.success) {
        setJobs(result.data.data)
      } else {
        throw new Error(result.errorMessage || 'Failed to fetch jobs')
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch jobs'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const result = await fetchJson<{ success: boolean; message?: string }>(`/api/stock/services/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (result.response.ok && result.data?.success) {
        fetchJobs()
      } else {
        throw new Error(result.errorMessage || 'Failed to update job status')
      }
    } catch (error) {
      console.error('Failed to update job:', error)
      const message = error instanceof Error ? error.message : 'Failed to update job'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const filteredJobs = jobs.filter(j =>
    (searchClient === '' || j.clientName.toLowerCase().includes(searchClient.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Service Jobs</CardTitle>
          <CardDescription>Track and manage service appointments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by client..."
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map(job => {
                  const StatusIcon = statusIcons[job.status]
                  const scheduledDate = new Date(job.scheduledDate)
                  const isOverdue = scheduledDate < new Date() && job.status !== 'done'

                  return (
                    <TableRow key={job._id} className={isOverdue ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{job.serviceName}</TableCell>
                      <TableCell>{job.clientName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {scheduledDate.toLocaleDateString()}
                          {isOverdue && (
                            <Badge variant="destructive" className="ml-2">Overdue</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <Badge className={statusBadgeColor[job.status]}>
                            {job.status.replace('-', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={job.status} onValueChange={(val) => handleStatusChange(job._id, val)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateJobDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          fetchJobs()
          setIsCreateOpen(false)
        }}
      />
    </div>
  )
}
