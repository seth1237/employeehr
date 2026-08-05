"use client"

import { useEffect, useMemo, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, Clock3, RefreshCw, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

type AttendanceRecord = {
  _id: string
  user_id: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  status: "present" | "absent" | "late" | "half-day" | string
  hours?: number
  remarks?: string
}

type UserRecord = {
  _id: string
  first_name?: string
  last_name?: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

interface TenantBranding {
  primaryColor?: string
  secondaryColor?: string
  companyName?: string
  logo?: string
  favicon?: string
  email?: string
  phone?: string
  address?: string
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const normalizeUserId = (value: any): string => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object") {
    if (typeof value._id === "string") return value._id
    if (typeof value.$oid === "string") return value.$oid
    if (typeof value.toString === "function") {
      const text = value.toString()
      if (text && text !== "[object Object]") return text
    }
  }
  return String(value)
}

const getUserDisplayName = (user?: UserRecord | null): string => {
  if (!user) return "Unknown User"
  const first = user.first_name || user.firstName || ""
  const last = user.last_name || user.lastName || ""
  const fullName = `${first} ${last}`.trim()
  return fullName || user.email || "Unknown User"
}

const normalizeRecord = (record: any): AttendanceRecord => ({
  _id: String(record._id),
  user_id: normalizeUserId(record.user_id || record.userId || record.user?._id || record.user),
  date: record.date,
  checkIn: record.checkIn ?? null,
  checkOut: record.checkOut ?? null,
  status: record.status || "present",
  hours: Number(record.hours ?? record.hoursWorked ?? 0),
  remarks: record.remarks,
})

const statusVariant = {
  present: "default",
  absent: "destructive",
  late: "secondary",
  "half-day": "outline",
} as const

const RECORDS_PER_PAGE = 20

export default function AdminAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [branding, setBranding] = useState<TenantBranding>({})
  const [recordsPage, setRecordsPage] = useState(1)

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)
  const primaryLightColor = hexToRgba(primaryColor, 0.05)

  const loadAttendance = async (opts?: SilentLoadOptions | boolean) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      setError(null)

      const [attendanceRes, usersRes, brandingRes] = await Promise.all([
        api.attendance.getAll(),
        api.users.getAll(),
        fetch(`${API_URL}/api/company/branding`, { headers }),
      ])

      setRecords(((attendanceRes?.data || []) as any[]).map(normalizeRecord))
      setUsers(usersRes?.data || [])

      if (brandingRes.ok) {
        try {
          const brandingData = await brandingRes.json()
          setBranding(brandingData.data || {})
        } catch {
          setBranding({})
        }
      } else {
        setBranding({})
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load attendance tracker")
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    loadAttendance()
  }, [])

  // Reset page when employee changes
  useEffect(() => {
    setRecordsPage(1)
  }, [selectedEmployeeId])

  const usersMap = useMemo(() => {
    const map = new Map<string, UserRecord>()
    users.forEach((user) => map.set(normalizeUserId(user._id), user))
    return map
  }, [users])

  const employees = useMemo(() => {
    const employeeUsers = users.filter((user) => user.role === "employee")
    return employeeUsers.length > 0 ? employeeUsers : users
  }, [users])

  const employeeStatsByUser = useMemo(() => {
    const map = new Map<string, { records: number; totalHours: number; present: number; late: number; absent: number }>()
    records.forEach((record) => {
      const key = String(record.user_id)
      const previous = map.get(key) || { records: 0, totalHours: 0, present: 0, late: 0, absent: 0 }
      previous.records += 1
      previous.totalHours += Number(record.hours || 0)
      if (record.status === "present") previous.present += 1
      if (record.status === "late") previous.late += 1
      if (record.status === "absent") previous.absent += 1
      map.set(key, previous)
    })
    return map
  }, [records])

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    if (!query) return employees

    return employees.filter((user) => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase()
      return fullName.includes(query) || (user.email || "").toLowerCase().includes(query)
    })
  }, [employees, employeeSearch])

  useEffect(() => {
    if (!filteredEmployees.length) {
      setSelectedEmployeeId(null)
      return
    }

    if (!selectedEmployeeId || !filteredEmployees.some((user) => String(user._id) === selectedEmployeeId)) {
      setSelectedEmployeeId(String(filteredEmployees[0]._id))
    }
  }, [filteredEmployees, selectedEmployeeId])

  const selectedEmployee = useMemo(
    () => filteredEmployees.find((user) => normalizeUserId(user._id) === selectedEmployeeId) || null,
    [filteredEmployees, selectedEmployeeId],
  )

  const selectedEmployeeRecords = useMemo(() => {
    if (!selectedEmployeeId) return []
    return records
      .filter((record) => String(record.user_id) === selectedEmployeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [records, selectedEmployeeId])

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (recordsPage - 1) * RECORDS_PER_PAGE
    const end = start + RECORDS_PER_PAGE
    return selectedEmployeeRecords.slice(start, end)
  }, [selectedEmployeeRecords, recordsPage])

  const totalRecordPages = useMemo(() => {
    return Math.max(1, Math.ceil(selectedEmployeeRecords.length / RECORDS_PER_PAGE))
  }, [selectedEmployeeRecords.length])

  const getStats = (source: AttendanceRecord[]) => {
    const totalRecords = source.length
    const present = source.filter((record) => record.status === "present").length
    const late = source.filter((record) => record.status === "late").length
    const absent = source.filter((record) => record.status === "absent").length
    const totalHours = source.reduce((sum, record) => sum + Number(record.hours || 0), 0)
    const avgHours = totalRecords ? totalHours / totalRecords : 0
    const attendanceRate = totalRecords ? ((present + late) / totalRecords) * 100 : 0
    return { totalRecords, present, late, absent, totalHours, avgHours, attendanceRate }
  }

  const weekStart = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6)
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const monthRange = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }, [])

  const weeklyStats = useMemo(() => {
    return getStats(selectedEmployeeRecords.filter((record) => new Date(record.date).getTime() >= weekStart.getTime()))
  }, [selectedEmployeeRecords, weekStart])

  const monthlyStats = useMemo(() => {
    return getStats(
      selectedEmployeeRecords.filter((record) => {
        const date = new Date(record.date)
        return date >= monthRange.start && date <= monthRange.end
      }),
    )
  }, [selectedEmployeeRecords, monthRange])

  const allTimeStats = useMemo(() => getStats(selectedEmployeeRecords), [selectedEmployeeRecords])

  if (loading) return <PageLoadingSkeleton title="Loading attendance" rows={8} />

  return (
    <div className="space-y-6 p-6">
      <div 
        className="rounded-2xl border px-4 py-3 shadow-sm" 
        style={{ 
          borderColor: primaryBorderColor, 
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})` 
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>HR Management</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Attendance Tracker</h1>
            <p className="text-sm text-muted-foreground">Monitor employee check-ins, check-outs and working hours.</p>
          </div>
          <Button 
            onClick={() => loadAttendance({ silent: true })} 
            disabled={refreshing} 
            variant="outline"
            style={{ borderColor: primaryBorderColor }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card 
          className="lg:col-span-4 shadow-sm"
          style={{ borderColor: primaryBorderColor }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: primaryColor }}>
              <Users className="h-4 w-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              placeholder="Search employee by name or email"
              style={{ borderColor: primaryBorderColor }}
              className="focus-visible:ring-primary"
            />

            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees found.</p>
              ) : (
                filteredEmployees.map((employee) => {
                  const key = normalizeUserId(employee._id)
                  const stats = employeeStatsByUser.get(key) || { records: 0, totalHours: 0, present: 0, late: 0, absent: 0 }
                  const fullName = getUserDisplayName(employee)
                  const active = key === selectedEmployeeId

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedEmployeeId(key)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        active 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/40"
                      }`}
                      style={active ? { borderColor: primaryColor } : {}}
                    >
                      <div className="font-medium" style={active ? { color: primaryColor } : {}}>
                        {fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">{employee.email || "No email"}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{stats.records} records</span>
                        <span>•</span>
                        <span>{stats.totalHours.toFixed(1)}h total</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-8">
          <Card 
            className="shadow-sm"
            style={{ borderColor: primaryBorderColor }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: primaryColor }}>
                <BarChart3 className="h-4 w-4" />
                {selectedEmployee
                  ? `${getUserDisplayName(selectedEmployee)} Performance`
                  : "Attendance Performance"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedEmployee ? (
                <p className="text-sm text-muted-foreground">Select an employee to view attendance performance.</p>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">{selectedEmployee.email || "No email"}</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card 
                      className="shadow-sm"
                      style={{ 
                        borderColor: primaryBorderColor,
                        background: primaryLightColor 
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm" style={{ color: primaryColor }}>Weekly Avg Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                          {weeklyStats.avgHours.toFixed(1)}h
                        </div>
                        <p className="text-xs text-muted-foreground">Attendance: {weeklyStats.attendanceRate.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                    <Card 
                      className="shadow-sm"
                      style={{ 
                        borderColor: primaryBorderColor,
                        background: primaryLightColor 
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm" style={{ color: primaryColor }}>Monthly Avg Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                          {monthlyStats.avgHours.toFixed(1)}h
                        </div>
                        <p className="text-xs text-muted-foreground">Attendance: {monthlyStats.attendanceRate.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                    <Card 
                      className="shadow-sm"
                      style={{ 
                        borderColor: primaryBorderColor,
                        background: primaryLightColor 
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm" style={{ color: primaryColor }}>All-Time Avg Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                          {allTimeStats.avgHours.toFixed(1)}h
                        </div>
                        <p className="text-xs text-muted-foreground">Attendance: {allTimeStats.attendanceRate.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <Card 
                      className="shadow-sm"
                      style={{ borderColor: primaryBorderColor }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm" style={{ color: primaryColor }}>Present</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-semibold">{allTimeStats.present}</div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="shadow-sm"
                      style={{ borderColor: primaryBorderColor }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm" style={{ color: primaryColor }}>Late</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-semibold">{allTimeStats.late}</div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="shadow-sm"
                      style={{ borderColor: primaryBorderColor }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm" style={{ color: primaryColor }}>Absent</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-semibold">{allTimeStats.absent}</div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="shadow-sm"
                      style={{ borderColor: primaryBorderColor }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm" style={{ color: primaryColor }}>Total Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-semibold">{allTimeStats.totalHours.toFixed(1)}h</div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card 
            className="shadow-sm"
            style={{ borderColor: primaryBorderColor }}
          >
            <CardHeader>
              <CardTitle style={{ color: primaryColor }}>Selected Employee Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: primaryBorderColor }}>
                      <TableHead style={{ color: primaryColor }}>Date</TableHead>
                      <TableHead style={{ color: primaryColor }}>Check In</TableHead>
                      <TableHead style={{ color: primaryColor }}>Check Out</TableHead>
                      <TableHead style={{ color: primaryColor }}>Hours</TableHead>
                      <TableHead style={{ color: primaryColor }}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No attendance records for this employee
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRecords.map((record) => {
                        const badgeVariant = statusVariant[record.status as keyof typeof statusVariant] || "outline"
                        return (
                          <TableRow key={record._id} style={{ borderColor: primaryBorderColor }}>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                            <TableCell>{record.checkIn || "N/A"}</TableCell>
                            <TableCell>{record.checkOut || "N/A"}</TableCell>
                            <TableCell>{record.hours ? `${Number(record.hours).toFixed(1)}h` : "0h"}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={badgeVariant}
                                className={record.status === "present" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                              >
                                {record.status || "unknown"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {selectedEmployeeRecords.length > RECORDS_PER_PAGE && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((recordsPage - 1) * RECORDS_PER_PAGE) + 1}–
                    {Math.min(recordsPage * RECORDS_PER_PAGE, selectedEmployeeRecords.length)} of {selectedEmployeeRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecordsPage((prev) => Math.max(1, prev - 1))}
                      disabled={recordsPage === 1}
                      style={{ borderColor: primaryBorderColor }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalRecordPages) }, (_, i) => {
                        let pageNum
                        if (totalRecordPages <= 5) {
                          pageNum = i + 1
                        } else if (recordsPage <= 3) {
                          pageNum = i + 1
                        } else if (recordsPage >= totalRecordPages - 2) {
                          pageNum = totalRecordPages - 4 + i
                        } else {
                          pageNum = recordsPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={recordsPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRecordsPage(pageNum)}
                            className="min-w-9"
                            style={recordsPage === pageNum ? { backgroundColor: primaryColor } : { borderColor: primaryBorderColor }}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                      
                      {totalRecordPages > 5 && recordsPage < totalRecordPages - 2 && (
                        <>
                          <span className="px-1 text-sm text-muted-foreground">…</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRecordsPage(totalRecordPages)}
                            className="min-w-9"
                            style={{ borderColor: primaryBorderColor }}
                          >
                            {totalRecordPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecordsPage((prev) => Math.min(totalRecordPages, prev + 1))}
                      disabled={recordsPage === totalRecordPages}
                      style={{ borderColor: primaryBorderColor }}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                Showing {RECORDS_PER_PAGE} records per page • Total: {selectedEmployeeRecords.length} records
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}