"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck, Save, Lock, Eye } from "lucide-react"
import { api, companyApi, usersApi } from "@/lib/api"
import { getUser } from "@/lib/auth"

type RoleKey = "company_admin" | "admin" | "hr" | "manager" | "employee"

interface AccessState {
  company_admin: string[]
  admin: string[]
  hr: string[]
  manager: string[]
  employee: string[]
}

interface SystemUser {
  _id: string
  first_name?: string
  last_name?: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

interface Department {
  _id: string
  name: string
}

interface Branch {
  _id: string
  name: string
  code?: string
}

const FALLBACK_SECTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "CLIENTS",
  "FLEET",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
]

const EDITABLE_ROLES: Array<{ key: Exclude<RoleKey, "company_admin">; label: string }> = [
  { key: "admin", label: "Admin" },
  { key: "hr", label: "HR" },
  { key: "manager", label: "Manager" },
  { key: "employee", label: "Employee" },
]

const PERMISSION_LABELS: Record<string, string> = {
  "users:read": "View users",
  "users:write": "Manage users",
  "users:delete": "Delete users",
  "payroll:read": "View payroll",
  "payroll:write": "Manage payroll",
  "stock:read": "View stock",
  "stock:write": "Manage stock",
  "stock:approve": "Approve stock actions",
  "accounts:read": "View accounts",
  "accounts:write": "Manage accounts",
  "reports:read": "View reports",
  "reports:approve": "Approve reports",
  "settings:read": "View settings",
  "settings:write": "Manage settings",
}

export default function PageAccessSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [availableSections, setAvailableSections] = useState<string[]>(FALLBACK_SECTIONS)
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("")
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [previewRole, setPreviewRole] = useState<RoleKey>("employee")
  const [userOverrides, setUserOverrides] = useState<Record<string, string[]>>({})
  const [departmentOverrides, setDepartmentOverrides] = useState<Record<string, string[]>>({})
  const [branchOverrides, setBranchOverrides] = useState<Record<string, string[]>>({})
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([])
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, string[]>>({})
  const [userPermissionOverrides, setUserPermissionOverrides] = useState<Record<string, string[]>>({})
  const [accessState, setAccessState] = useState<AccessState>({
    company_admin: FALLBACK_SECTIONS,
    admin: FALLBACK_SECTIONS,
    hr: FALLBACK_SECTIONS,
    manager: [],
    employee: [],
  })

  const currentUser = useMemo(() => getUser(), [])
  const canEdit = currentUser?.role === "company_admin"

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setError("")

        const response = await companyApi.getPageAccess()
        if (response.success) {
          const sections = response.data?.availableSections || FALLBACK_SECTIONS
          const byRole = response.data?.adminSectionsByRole || {}
          const byUser = response.data?.adminSectionsByUser || {}

          setAvailableSections(sections)
          setAccessState({
            company_admin: byRole.company_admin || sections,
            admin: byRole.admin || sections,
            hr: byRole.hr || sections,
            manager: byRole.manager || [],
            employee: byRole.employee || [],
          })
          setUserOverrides(byUser)
        }

        const usersResponse = await usersApi.getAll()
        if (usersResponse.success) {
          setSystemUsers(usersResponse.data || [])
        }

        const [departmentsResponse, branchesResponse] = await Promise.allSettled([
          companyApi.getDepartments(),
          api.branches.getAll({ active: true }),
        ])

        if (departmentsResponse.status === "fulfilled" && departmentsResponse.value.success) {
          setDepartments(departmentsResponse.value.data || [])
        }

        if (branchesResponse.status === "fulfilled" && branchesResponse.value.success) {
          setBranches(branchesResponse.value.data || [])
        }

        if (response.success) {
          setDepartmentOverrides(response.data?.adminSectionsByDepartment || {})
          setBranchOverrides(response.data?.adminSectionsByBranch || {})
          setAvailablePermissions(response.data?.availablePermissions || [])
          setPermissionMatrix(response.data?.permissionMatrixByRole || {})
          setUserPermissionOverrides(response.data?.permissionMatrixByUser || {})
        }
      } catch (loadError: any) {
        setError(loadError?.message || "Failed to load page access settings")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const toggleSectionForRole = (role: Exclude<RoleKey, "company_admin">, section: string) => {
    if (!canEdit) return

    setAccessState((prev) => {
      const exists = prev[role].includes(section)
      return {
        ...prev,
        [role]: exists ? prev[role].filter((item) => item !== section) : [...prev[role], section],
      }
    })
  }

  const selectedUser = systemUsers.find((user) => user._id === selectedUserId)

  const selectedUserRole = (selectedUser?.role || "") as Exclude<RoleKey, "company_admin"> | ""

  const selectedUserRoleSections = selectedUserRole && selectedUserRole in accessState
    ? accessState[selectedUserRole as Exclude<RoleKey, "company_admin">]
    : []

  const selectedUserOverrideSections = selectedUserId ? userOverrides[selectedUserId] || [] : []

  const selectedUserEffectiveSections = selectedUserId
    ? Array.from(new Set([...selectedUserRoleSections, ...selectedUserOverrideSections]))
    : []

  const toggleSectionForUser = (userId: string, section: string) => {
    if (!canEdit || !userId) return

    const roleSections = selectedUserRole && selectedUserRole in accessState
      ? accessState[selectedUserRole as Exclude<RoleKey, "company_admin">]
      : []

    if (roleSections.includes(section)) {
      return
    }

    setUserOverrides((prev) => {
      const current = prev[userId] || []
      const exists = current.includes(section)
      const next = exists ? current.filter((item) => item !== section) : [...current, section]
      return {
        ...prev,
        [userId]: next,
      }
    })
  }

  const resetUserToRoleDefault = (userId: string) => {
    if (!canEdit || !userId) return
    setUserOverrides((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }

  const toggleSectionInMap = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    mapKey: string,
    section: string,
  ) => {
    if (!canEdit || !mapKey) return

    setter((prev) => {
      const current = prev[mapKey] || []
      const exists = current.includes(section)
      return {
        ...prev,
        [mapKey]: exists ? current.filter((item) => item !== section) : [...current, section],
      }
    })
  }

  const togglePermissionForRole = (role: RoleKey, permission: string) => {
    if (!canEdit || role === "company_admin") return
    setPermissionMatrix((prev) => {
      const current = prev[role] || []
      const exists = current.includes(permission)
      return {
        ...prev,
        [role]: exists ? current.filter((item) => item !== permission) : [...current, permission],
      }
    })
  }

  const togglePermissionForUser = (userId: string, permission: string) => {
    if (!canEdit || !userId) return

    setUserPermissionOverrides((prev) => {
      const current = prev[userId] || []
      const exists = current.includes(permission)
      return {
        ...prev,
        [userId]: exists ? current.filter((item) => item !== permission) : [...current, permission],
      }
    })
  }

  const previewSections = accessState[previewRole] || []
  const previewPermissions = permissionMatrix[previewRole] || []

  const handleSave = async () => {
    try {
      if (!canEdit) return

      setIsSaving(true)
      setError("")
      setSuccessMessage("")

      const response = await companyApi.updatePageAccess({
        adminSectionsByRole: {
          admin: accessState.admin,
          hr: accessState.hr,
          manager: accessState.manager,
          employee: accessState.employee,
        },
        adminSectionsByUser: userOverrides,
        adminSectionsByDepartment: departmentOverrides,
        adminSectionsByBranch: branchOverrides,
        permissionMatrixByRole: permissionMatrix,
        permissionMatrixByUser: userPermissionOverrides,
      })

      if (response.success) {
        setSuccessMessage("Page visibility updated successfully")
      }
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save page access settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Page Access Control</h1>
          <p className="text-muted-foreground">
            Choose which admin page categories are visible to each role.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <ShieldCheck className="w-3 h-3 mr-1" />
          SYSTEM
        </Badge>
      </div>

      {!canEdit && (
        <Alert>
          <Lock className="w-4 h-4" />
          <AlertDescription>
            Only Company Admin can update these settings. You can view but not modify.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role-based visibility matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border p-4 bg-muted/20">
            <p className="text-sm font-medium">Company Admin</p>
            <p className="text-xs text-muted-foreground mt-1">
              Company Admin always has access to all categories.
            </p>
          </div>

          {EDITABLE_ROLES.map((role) => (
            <div key={role.key} className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{role.label}</h3>
                <Badge variant="secondary">{accessState[role.key].length} selected</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableSections.map((section) => {
                  const checked = accessState[role.key].includes(section)
                  return (
                    <label
                      key={`${role.key}-${section}`}
                      className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSectionForRole(role.key, section)}
                        disabled={!canEdit}
                      />
                      <span className="text-sm">{section}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">User-specific allocation</h3>
                <p className="text-xs text-muted-foreground">
                  Override role defaults for one user.
                </p>
              </div>
              {selectedUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetUserToRoleDefault(selectedUserId)}
                  disabled={!canEdit}
                >
                  Reset User Override
                </Button>
              )}
            </div>

            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select user to allocate...</option>
              {systemUsers.map((user) => {
                const firstName = user.first_name || user.firstName || ""
                const lastName = user.last_name || user.lastName || ""
                const fullName = `${firstName} ${lastName}`.trim() || user.email || user._id
                return (
                  <option key={user._id} value={user._id}>
                    {fullName} {user.role ? `(${user.role})` : ""}
                  </option>
                )
              })}
            </select>

            {selectedUserId ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {selectedUserEffectiveSections.length} section(s) visible for this user. Role sections stay enabled and extra sections can be added below.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableSections.map((section) => {
                    const checked = selectedUserEffectiveSections.includes(section)
                    const inherited = selectedUserRoleSections.includes(section)
                    return (
                      <label
                        key={`${selectedUserId}-${section}`}
                        className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSectionForUser(selectedUserId, section)}
                          disabled={!canEdit || inherited}
                        />
                        <span className="text-sm flex items-center gap-2">
                          {section}
                          {inherited && <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">role</span>}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a user to allocate page categories.</p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-md border p-4">
              <div>
                <h3 className="font-semibold">Department-based access</h3>
                <p className="text-xs text-muted-foreground">
                  Add extra page categories for everyone in a department.
                </p>
              </div>

              <select
                value={selectedDepartmentId}
                onChange={(event) => setSelectedDepartmentId(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select department...</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>{department.name}</option>
                ))}
              </select>

              {selectedDepartmentId ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSections.map((section) => (
                    <label key={`${selectedDepartmentId}-${section}`} className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={(departmentOverrides[selectedDepartmentId] || []).includes(section)}
                        onCheckedChange={() => toggleSectionInMap(setDepartmentOverrides, selectedDepartmentId, section)}
                        disabled={!canEdit}
                      />
                      <span className="text-sm">{section}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select a department to add access overrides.</p>
              )}
            </div>

            <div className="space-y-3 rounded-md border p-4">
              <div>
                <h3 className="font-semibold">Branch-based access</h3>
                <p className="text-xs text-muted-foreground">
                  Add extra page categories for users managing a branch.
                </p>
              </div>

              <select
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select branch...</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>
                ))}
              </select>

              {selectedBranchId ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSections.map((section) => (
                    <label key={`${selectedBranchId}-${section}`} className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={(branchOverrides[selectedBranchId] || []).includes(section)}
                        onCheckedChange={() => toggleSectionInMap(setBranchOverrides, selectedBranchId, section)}
                        disabled={!canEdit}
                      />
                      <span className="text-sm">{section}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select a branch to add access overrides.</p>
              )}
            </div>
          </div>

          {availablePermissions.length > 0 && (
            <div className="space-y-4 rounded-md border p-4">
              <div>
                <h3 className="font-semibold">Permission matrix</h3>
                <p className="text-xs text-muted-foreground">
                  Control action-level capabilities separately from page visibility.
                </p>
              </div>

              {EDITABLE_ROLES.map((role) => (
                <div key={`permissions-${role.key}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{role.label}</p>
                    <Badge variant="secondary">{(permissionMatrix[role.key] || []).length} permissions</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availablePermissions.map((permission) => (
                      <label key={`${role.key}-${permission}`} className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40">
                        <Checkbox
                          checked={(permissionMatrix[role.key] || []).includes(permission)}
                          onCheckedChange={() => togglePermissionForRole(role.key, permission)}
                          disabled={!canEdit}
                        />
                        <span className="text-sm">{PERMISSION_LABELS[permission] || permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {selectedUserId && (
                <div className="space-y-2 rounded-md bg-muted/20 p-3">
                  <p className="text-sm font-medium">Extra permissions for selected user</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availablePermissions.map((permission) => (
                      <label key={`${selectedUserId}-${permission}`} className="flex items-center gap-2 rounded border bg-background p-2 cursor-pointer hover:bg-muted/40">
                        <Checkbox
                          checked={(userPermissionOverrides[selectedUserId] || []).includes(permission)}
                          onCheckedChange={() => togglePermissionForUser(selectedUserId, permission)}
                          disabled={!canEdit}
                        />
                        <span className="text-sm">{PERMISSION_LABELS[permission] || permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">View as role</h3>
            </div>
            <select
              value={previewRole}
              onChange={(event) => setPreviewRole(event.target.value as RoleKey)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="company_admin">Company Admin</option>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Visible sections</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewSections.length ? previewSections.map((section) => (
                    <Badge key={section} variant="outline">{section}</Badge>
                  )) : <span className="text-xs text-muted-foreground">No sections enabled</span>}
                </div>
              </div>
              <div className="rounded-md bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Action permissions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewPermissions.length ? previewPermissions.map((permission) => (
                    <Badge key={permission} variant="outline">{PERMISSION_LABELS[permission] || permission}</Badge>
                  )) : <span className="text-xs text-muted-foreground">No permissions enabled</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!canEdit || isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Access Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
