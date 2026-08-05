"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Edit2, Trash2, User } from "lucide-react"
import { api } from "@/lib/api"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { TableSkeleton } from "@/components/admin/ui/page-states"

interface Branch {
  _id: string
  name: string
  code: string
  location: string
  city?: string
  state?: string
  country?: string
  phone?: string
  email?: string
  managerId?: string
  managerName?: string
  isActive: boolean
}

interface FormData {
  name: string
  code: string
  location: string
  city: string
  state: string
  country: string
  phone: string
  email: string
  description: string
}

export default function BranchManagementPage() {
  const { toast } = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    location: "",
    city: "",
    state: "",
    country: "",
    phone: "",
    email: "",
    description: "",
  })

  const [admins, setAdmins] = useState<any[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState<string>("")
  const [allocatingBranchId, setAllocatingBranchId] = useState<string | null>(null)

  useEffect(() => {
    fetchBranches()
    fetchAdmins()
  }, [])

  const fetchBranches = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading)
    try {
      const response = await api.branches.getAll()
      setBranches(response?.data || [])
    } catch (error) {
      console.error("Error fetching branches:", error)
      toast({ description: "Failed to load branches", variant: "destructive" })
    } finally {
      finishDataLoad(silent, setLoading)
    }
  }

  const fetchAdmins = async () => {
    try {
      const response = await api.users.getAll()
      const filtered = (response?.data || []).filter((user: any) =>
        ["admin", "company_admin", "hr", "manager", "employee"].includes(user.role)
      )
      setAdmins(filtered)
    } catch (error) {
      console.error("Error fetching admins:", error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.code || !formData.location) {
      toast({ description: "Please fill in required fields", variant: "destructive" })
      return
    }

    try {
      if (editingId) {
        await api.branches.update(editingId, formData)
        toast({ description: "Branch updated successfully" })
        fetchBranches(true)
        resetForm()
      } else {
        await api.branches.create(formData)
        toast({ description: "Branch created successfully" })
        fetchBranches(true)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving branch:", error)
      toast({ description: "Failed to save branch", variant: "destructive" })
    }
  }

  const handleEdit = (branch: Branch) => {
    setFormData({
      name: branch.name,
      code: branch.code,
      location: branch.location,
      city: branch.city || "",
      state: branch.state || "",
      country: branch.country || "",
      phone: branch.phone || "",
      email: branch.email || "",
      description: "",
    })
    setEditingId(branch._id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this branch?")) return

    try {
      await api.branches.delete(id)
      toast({ description: "Branch deactivated successfully" })
      fetchBranches(true)
    } catch (error) {
      console.error("Error deleting branch:", error)
      toast({ description: "Failed to delete branch", variant: "destructive" })
    }
  }

  const handleAllocateManager = async (branchId: string) => {
    if (!selectedAdmin) {
      toast({ description: "Please select a branch manager", variant: "destructive" })
      return
    }

    try {
      await api.branches.allocateManager(branchId, selectedAdmin)
      toast({ description: "Branch manager assigned successfully" })
      fetchBranches(true)
      setAllocatingBranchId(null)
      setSelectedAdmin("")
    } catch (error) {
      console.error("Error allocating manager:", error)
      toast({ description: "Failed to assign branch manager", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      location: "",
      city: "",
      state: "",
      country: "",
      phone: "",
      email: "",
      description: "",
    })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branch Management</h1>
          <p className="text-muted-foreground text-sm">Create and manage company branches with assigned admins</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Branch
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Branch" : "Create New Branch"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Branch Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Office"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Branch Code *</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., BR001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Location *</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., 123 Main Street"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Nairobi"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">State/Province</label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g., Nairobi County"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., Kenya"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="branch@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details about this branch..."
                  className="w-full p-2 border rounded-md text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? "Update" : "Create"} Branch</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <TableSkeleton rows={8} />
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>No branches created yet. Click "Add Branch" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {branches.map((branch) => (
            <Card key={branch._id} className={!branch.isActive ? "opacity-50" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-lg">{branch.name}</p>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{branch.code}</span>
                      {!branch.isActive && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{branch.location}</p>
                    {branch.city && (
                      <p className="text-xs text-muted-foreground">
                        {branch.city} {branch.state ? `, ${branch.state}` : ""} {branch.country ? `, ${branch.country}` : ""}
                      </p>
                    )}
                    {branch.phone && <p className="text-xs text-muted-foreground">📞 {branch.phone}</p>}
                    {branch.email && <p className="text-xs text-muted-foreground">📧 {branch.email}</p>}

                    {branch.managerId && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <p className="font-medium text-green-900 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Manager: {branch.managerName}
                        </p>
                        <p className="text-xs text-green-800">{branch.email}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-col">
                    {!branch.managerId && (
                      <div className="space-y-2">
                        <select
                          value={allocatingBranchId === branch._id ? selectedAdmin : ""}
                          onChange={(e) => {
                            setAllocatingBranchId(branch._id)
                            setSelectedAdmin(e.target.value)
                          }}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="">Select Branch Manager...</option>
                          {admins.map((admin) => (
                            <option key={admin._id} value={admin._id}>
                              {admin.firstName} {admin.lastName} ({admin.role})
                            </option>
                          ))}
                        </select>
                        {allocatingBranchId === branch._id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAllocateManager(branch._id)}
                            className="gap-2 w-full"
                          >
                            <User className="w-4 h-4" />
                            Assign Admin
                          </Button>
                        )}
                      </div>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(branch)} className="gap-2">
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(branch._id)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Deactivate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
