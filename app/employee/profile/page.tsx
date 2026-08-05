"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, Calendar, Building, MapPin, Edit, Save, X } from "lucide-react"
import { getUser, getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"


interface UserProfile {
  _id: string
  employee_id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position?: string
  department?: string
  avatar?: string
  dateOfJoining?: string
  status: string
  role: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({})

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const user = getUser()
      if (!user) return

      const token = getToken()
      const response = await fetch(`${API_URL}/api/users/${user.userId || user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.data || data)
        setEditedProfile(data.data || data)
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const user = getUser()
      if (!user) return

      const token = getToken()
      
      // Only send editable fields (exclude email, firstName, lastName, employee_id, role, status, position, department)
      const updateData = {
        phone: editedProfile.phone,
        avatar: editedProfile.avatar,
      }
      
      const response = await fetch(`${API_URL}/api/users/${user.userId || user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.data || data)
        setEditedProfile(data.data || data)
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProfile(profile || {})
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    )
  }

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profile.avatar} alt={`${profile.firstName} ${profile.lastName}`} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-semibold">
                {profile.firstName} {profile.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">{profile.position || "Employee"}</p>
              <Badge className="mt-2" variant={profile.status === "active" ? "default" : "secondary"}>
                {profile.status}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Change Photo
            </Button>
            <div className="w-full mt-2">
              <Label>Upload Signature</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const user = getUser()
                  if (!user) return
                  const token = getToken()
                  const form = new FormData()
                  form.append("signature", file)
                  try {
                    const res = await fetch(`${API_URL}/api/users/${user.userId || user._id}/signature`, {
                      method: "POST",
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                      body: form,
                    })
                    if (res.ok) {
                      const json = await res.json()
                      setProfile(json.data || json)
                    }
                  } catch (err) {
                    console.error("Failed to upload signature", err)
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.firstName}</span>
                </div>
                <p className="text-xs text-muted-foreground">Contact admin to change name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.lastName}</span>
                </div>
                <p className="text-xs text-muted-foreground">Contact admin to change name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">Contact admin to change email</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editedProfile.phone || ""}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center space-x-2 rounded-md border p-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                  <Badge variant="outline">{profile.employee_id}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfJoining">Date of Joining</Label>
                <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {profile.dateOfJoining ? new Date(profile.dateOfJoining).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Work Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.position || "Not assigned"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.department || "Not assigned"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                    <Badge variant="secondary">{profile.role}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="flex items-center space-x-2 rounded-md border p-2 bg-muted">
                    <Badge variant={profile.status === "active" ? "default" : "secondary"}>{profile.status}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage your password and security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline">Change Password</Button>
          <Button variant="outline">Two-Factor Authentication</Button>
        </CardContent>
      </Card>
    </div>
  )
}
