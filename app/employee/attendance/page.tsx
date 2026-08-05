"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight } from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { HolidayList } from "@/components/attendance/holiday-list"

interface AttendanceRecord {
  _id: string
  date: string
  checkIn: string
  checkOut?: string
  status: "present" | "absent" | "late" | "half-day"
  hours?: number
  notes?: string
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

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<"check-in" | "check-out" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    totalHours: 0,
  })

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  useEffect(() => {
    fetchBranding()
    fetchAttendance()
  }, [])

  const fetchBranding = async () => {
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/company/branding`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setBranding(data.data || {})
      }
    } catch {
      // Silently fail
    }
  }

  const fetchAttendance = async () => {
    try {
      const token = getToken()
      if (!token) {
        setErrorMessage("You are not authenticated. Please log in again.")
        return
      }

      setErrorMessage(null)

      const response = await fetch(`${API_URL}/api/attendance/my-attendance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message || "Failed to load attendance records")
        return
      }

      setAttendanceRecords(data.data || [])
      calculateStats(data.data || [])
    } catch (error) {
      console.error("Failed to fetch attendance:", error)
      setErrorMessage("Failed to load attendance records")
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (records: AttendanceRecord[]) => {
    const stats = records.reduce(
      (acc, record) => {
        if (record.status === "present") acc.present++
        if (record.status === "absent") acc.absent++
        if (record.status === "late") acc.late++
        if (record.hours) acc.totalHours += record.hours
        return acc
      },
      { present: 0, absent: 0, late: 0, totalHours: 0 }
    )
    setStats(stats)
  }

  const handleCheckIn = async () => {
    try {
      const token = getToken()
      if (!token) {
        setErrorMessage("You are not authenticated. Please log in again.")
        return
      }

      setActionLoading("check-in")
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`${API_URL}/api/attendance/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message || "Failed to check in")
        return
      }

      setSuccessMessage("✅ Check-in successful")
      fetchAttendance()
    } catch (error) {
      console.error("Failed to check in:", error)
      setErrorMessage("Failed to check in")
    } finally {
      setActionLoading(null)
    }
  }

  const handleCheckOut = async () => {
    try {
      const token = getToken()
      if (!token) {
        setErrorMessage("You are not authenticated. Please log in again.")
        return
      }

      setActionLoading("check-out")
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`${API_URL}/api/attendance/check-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message || "Failed to check out")
        return
      }

      setSuccessMessage("✅ Check-out successful")
      fetchAttendance()
    } catch (error) {
      console.error("Failed to check out:", error)
      setErrorMessage("Failed to check out")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
      case "absent":
        return <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
      case "late":
        return <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
      default:
        return <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: "border-emerald-200 bg-emerald-50 text-emerald-700",
      absent: "border-rose-200 bg-rose-50 text-rose-700",
      late: "border-amber-200 bg-amber-50 text-amber-700",
      "half-day": "border-sky-200 bg-sky-50 text-sky-700",
    }
    return (
      <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium capitalize ${variants[status] || "border-gray-200 bg-gray-50 text-gray-700"}`}>
        {status.replace("-", " ")}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: primaryColor }}></div>
      </div>
    )
  }

  const todayRecord = attendanceRecords.find(
    (record) => new Date(record.date).toDateString() === new Date().toDateString()
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header Section */}
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: primaryBorderColor, background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})` }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Attendance</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">My Attendance</h1>
            <p className="text-sm text-muted-foreground">Track your attendance and working hours</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            {!todayRecord?.checkIn && (
              <Button 
                onClick={handleCheckIn} 
                disabled={actionLoading === "check-in" || actionLoading === "check-out"}
                className="text-xs sm:text-sm h-8 sm:h-10"
              >
                <Clock className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {actionLoading === "check-in" ? "Checking In..." : "Check In"}
              </Button>
            )}
            {todayRecord?.checkIn && !todayRecord?.checkOut && (
              <Button 
                onClick={handleCheckOut} 
                variant="outline" 
                disabled={actionLoading === "check-in" || actionLoading === "check-out"}
                className="text-xs sm:text-sm h-8 sm:h-10"
              >
                <Clock className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {actionLoading === "check-out" ? "Checking Out..." : "Check Out"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchAttendance} className="h-8 sm:h-10">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {errorMessage && (
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30">
          <CardContent className="pt-4 sm:pt-6 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
            {errorMessage}
          </CardContent>
        </Card>
      )}

      {successMessage && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CardContent className="pt-4 sm:pt-6 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
            {successMessage}
          </CardContent>
        </Card>
      )}

      {/* Statistics - Mobile optimized 2x2 grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Present</CardTitle>
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.present}</div>
            <p className="text-[8px] sm:text-xs text-muted-foreground">Total days</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Absent</CardTitle>
              <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.absent}</div>
            <p className="text-[8px] sm:text-xs text-muted-foreground">Total days</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Late</CardTitle>
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.late}</div>
            <p className="text-[8px] sm:text-xs text-muted-foreground">Total times</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Hours</CardTitle>
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: secondaryColor }} />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalHours.toFixed(1)}</div>
            <p className="text-[8px] sm:text-xs text-muted-foreground">Total worked</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Status - Compact mobile */}
      {todayRecord && (
        <Card className="shadow-sm">
          <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-2">
            <CardTitle className="text-sm sm:text-base">Today's Status</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
              <div>
                <p className="text-[9px] sm:text-sm text-muted-foreground">Check In</p>
                <p className="text-sm sm:text-lg font-semibold">{todayRecord.checkIn || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-sm text-muted-foreground">Check Out</p>
                <p className="text-sm sm:text-lg font-semibold">{todayRecord.checkOut || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-sm text-muted-foreground">Hours</p>
                <p className="text-sm sm:text-lg font-semibold">{todayRecord.hours ? `${todayRecord.hours.toFixed(1)}h` : "—"}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-sm text-muted-foreground">Status</p>
                <div className="mt-0.5">{getStatusBadge(todayRecord.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar and Records - Stack on mobile */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-2">
            <CardTitle className="text-sm sm:text-base">Calendar</CardTitle>
            <CardDescription className="text-[10px] sm:text-sm">Select a date to view</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <Calendar 
              mode="single" 
              selected={selectedDate} 
              onSelect={setSelectedDate} 
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <CardTitle className="text-sm sm:text-base">Recent Attendance</CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Your attendance history</CardDescription>
              </div>
              <p className="text-[8px] sm:text-xs text-muted-foreground">Last 10 records</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] sm:text-xs">Date</TableHead>
                    <TableHead className="text-[10px] sm:text-xs">Check In</TableHead>
                    <TableHead className="text-[10px] sm:text-xs hidden sm:table-cell">Check Out</TableHead>
                    <TableHead className="text-[10px] sm:text-xs">Hours</TableHead>
                    <TableHead className="text-[10px] sm:text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceRecords.slice(0, 10).map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="text-[10px] sm:text-sm py-2">
                          {new Date(record.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-[10px] sm:text-sm py-2">{record.checkIn || "—"}</TableCell>
                        <TableCell className="text-[10px] sm:text-sm py-2 hidden sm:table-cell">{record.checkOut || "—"}</TableCell>
                        <TableCell className="text-[10px] sm:text-sm py-2">{record.hours ? `${record.hours.toFixed(1)}h` : "—"}</TableCell>
                        <TableCell className="py-2">{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holidays Section */}
      <HolidayList />
    </div>
  )
}