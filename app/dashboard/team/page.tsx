"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"

export default function TeamManagement() {
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "" as User['role'],
    department: "",
    password: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.users.getAll()
      if (response.success && response.data) {
        setMembers(response.data)
      }
    } catch (err: any) {
      console.error('Failed to fetch team members:', err)
      setError(err.message || 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.role || !formData.firstName || !formData.lastName) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await api.users.create({
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        department: formData.department,
        password: formData.password || Math.random().toString(36).slice(-8), // Generate random password if not provided
      })

      if (response.success && response.data) {
        setMembers([...members, response.data])
        setFormData({ email: "", firstName: "", lastName: "", role: "" as User['role'], department: "", password: "" })
        setShowForm(false)
      }
    } catch (err: any) {
      console.error('Failed to invite member:', err)
      setError(err.message || 'Failed to invite team member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      // Optimistic update
      const previousMembers = [...members]
      setMembers(members.filter((m) => m._id !== id))

      const response = await api.users.delete(id)

      if (!response.success) {
        // Revert on failure
        setMembers(previousMembers)
        setError('Failed to remove team member')
      }
    } catch (err: any) {
      console.error('Failed to remove member:', err)
      // Revert on error
      fetchTeamMembers()
      setError(err.message || 'Failed to remove team member')
    }
  }

  const filteredMembers = members.filter(
    (member) =>
      `${(member as any).firstName} ${(member as any).lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-accent/10 text-accent"
      case "pending":
        return "bg-primary/10 text-primary"
      case "inactive":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-border text-foreground"
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Manage your organization's users and roles</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90">
          <Plus size={18} className="mr-2" />
          Invite Member
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/10">
          <p className="text-destructive text-sm">{error}</p>
        </Card>
      )}

      {showForm && (
        <Card className="p-6 border-border">
          <h3 className="font-semibold mb-4">Invite Team Member</h3>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <Input
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Email address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select Role</option>
                <option value="company_admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <Input
              placeholder="Department (optional)"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              placeholder="Password (optional - will auto-generate if empty)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <div className="flex gap-3">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90" disabled={submitting}>
                {submitting ? "Sending..." : "Send Invitation"}
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1" type="button">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div>
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <Card className="p-8 text-center border-border">
            <p className="text-muted-foreground">
              {searchTerm ? "No members found matching your search" : "No team members yet. Invite your first member!"}
            </p>
          </Card>
        ) : (
          filteredMembers.map((member) => (
            <Card key={member._id} className="p-6 border-border hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-semibold text-primary">
                      {((member as any).firstName?.[0] || '?')}{((member as any).lastName?.[0] || '?')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{(member as any).firstName} {(member as any).lastName}</h3>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-secondary rounded capitalize">{member.role.replace('_', ' ')}</span>
                      {member.department && (
                        <span className="text-xs px-2 py-1 bg-secondary rounded">{member.department}</span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Joined {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="text-muted-foreground hover:text-destructive transition mt-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
