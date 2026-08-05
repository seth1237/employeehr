"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface UserRow {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
  signatureUrl?: string
  promptStampOnPdf?: boolean
}

export default function AdminUserSettings() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const token = getToken()

  const loadUsers = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading)
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to load users")
      setUsers(json.data || [])
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to load users", variant: "destructive" })
    } finally {
      finishDataLoad(silent, setLoading)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const uploadSignature = async (userId: string, file?: File | null) => {
    if (!file) return
    try {
      const form = new FormData()
      form.append("signature", file)
      const res = await fetch(`${API_URL}/api/users/${userId}/signature`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Upload failed")
      toast({ title: "Uploaded", description: "Signature uploaded" })
      if (json.data?.signatureUrl) {
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, signatureUrl: json.data.signatureUrl } : u))
      } else {
        loadUsers(true)
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Failed to upload signature", variant: "destructive" })
    }
  }

  const toggleStampPref = async (userId: string, value: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ promptStampOnPdf: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to update user")
      toast({ title: "Saved", description: "User preference updated" })
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, promptStampOnPdf: value } : u))
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update user", variant: "destructive" })
    }
  }

  const updateUserName = async (userId: string, firstName: string, lastName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ firstName, lastName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to update user")
      toast({ title: "Updated", description: "User name updated successfully" })
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, firstName, lastName } : u))
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update user name", variant: "destructive" })
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading users" rows={8} />

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">User Settings</h1>
      <p className="text-sm text-muted-foreground">Manage user signatures and PDF stamp preferences</p>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user._id} className="flex flex-col gap-4 rounded-md border p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs">User Information</Label>
                    <div className="font-medium text-sm">{user.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">{user.role || "No Role Assigned"}</div>
                  </div>

                  <div className="w-40">
                    <Label className="text-xs">First Name</Label>
                    <Input 
                      defaultValue={user.firstName} 
                      placeholder="First Name" 
                      id={`fname-${user._id}`}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="w-40">
                    <Label className="text-xs">Last Name</Label>
                    <Input 
                      defaultValue={user.lastName} 
                      placeholder="Last Name" 
                      id={`lname-${user._id}`}
                      className="h-8 text-sm"
                    />
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8"
                    onClick={() => {
                      const f = (document.getElementById(`fname-${user._id}`) as HTMLInputElement)?.value || ""
                      const l = (document.getElementById(`lname-${user._id}`) as HTMLInputElement)?.value || ""
                      updateUserName(user._id, f, l)
                    }}
                  >
                    Save Name
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Digital Signature</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        className="h-8 text-xs cursor-pointer"
                        onChange={(e) => uploadSignature(user._id, e.target.files?.[0] || null)} 
                      />
                    </div>
                    {user.signatureUrl ? (
                      <div className="text-[10px] text-green-600 font-medium">Signature Set</div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground">No Signature Uploaded</div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <Label className="mb-0 text-xs text-muted-foreground">Always Prompt Stamp on PDF</Label>
                    <Switch checked={!!user.promptStampOnPdf} onCheckedChange={(val) => toggleStampPref(user._id, Boolean(val))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
