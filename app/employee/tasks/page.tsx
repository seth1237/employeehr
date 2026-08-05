"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Circle, Clock, AlertCircle, Package, Calendar, User, X } from "lucide-react"
import { getToken, getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { useToast } from "@/hooks/use-toast"

interface Task {
  _id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string
  assigned_by_user?: {
    firstName: string
    lastName: string
    _id: string
  }
  completed_at?: string
  createdAt: string
  related_entity_type?: string
  related_entity_id?: string
  source_label?: string
  is_packaging_duty?: boolean
  notes_history?: Array<{
    text: string
    user_name: string
    createdAt: string
  }>
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

export default function EmployeeTasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [postponeDate, setPostponeDate] = useState<string | null>(null)
  const [postponeReason, setPostponeReason] = useState("")
  const [showPostponeForm, setShowPostponeForm] = useState(false)
  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }

  useEffect(() => {
    fetchBranding()
    fetchTasks()
  }, [filter])

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

  const fetchTasks = async () => {
    try {
      const token = getToken()
      if (!token) {
        setError("You are not signed in. Please log in again.")
        setTasks([])
        return
      }

      const statusParam = filter !== "all" ? `?status=${filter}` : ""
      
      const response = await fetch(`${API_URL}/api/tasks${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setTasks(data.data)
        setError(null)
      } else {
        setTasks([])
        setError(data.message || "Failed to load tasks")
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
      setError("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const token = getToken()
      if (!token) return
      
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: "Task completed by employee" }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Task completed",
          description: "Task marked as completed successfully",
        })
        fetchTasks()
        if (selectedTask?._id === taskId) {
          setSelectedTask(null)
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to complete task",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to complete task:", error)
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive",
      })
    }
  }

  const fetchTaskDetails = async (taskId: string) => {
    try {
      setDetailLoading(true)
      const token = getToken()
      if (!token) {
        setError("You are not signed in. Please log in again.")
        return
      }

      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setSelectedTask(data.data)
        setError(null)
        setShowPostponeForm(false)
        setPostponeDate(null)
        setPostponeReason("")
      } else {
        setSelectedTask(null)
        setError(data.message || "Failed to load task")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to load task")
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!selectedTask) return
    const trimmedNote = noteText.trim()
    if (!trimmedNote) {
      toast({
        title: "Error",
        description: "Please enter a work note before saving.",
        variant: "destructive",
      })
      return
    }

    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/tasks/${selectedTask._id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: trimmedNote }),
      })
      const data = await res.json()
      if (data.success) {
        setNoteText("")
        toast({
          title: "Note added",
          description: "Work note added successfully",
        })
        fetchTaskDetails(selectedTask._id)
        fetchTasks()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add note",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      })
    }
  }

  const handleRequestPostpone = async () => {
    if (!selectedTask) return
    if (!postponeDate) {
      toast({
        title: "Error",
        description: "Please select a new due date",
        variant: "destructive",
      })
      return
    }

    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/tasks/${selectedTask._id}/postpone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_due_date: postponeDate, reason: postponeReason }),
      })
      const data = await res.json()
      if (data.success) {
        setPostponeDate(null)
        setPostponeReason("")
        setShowPostponeForm(false)
        toast({
          title: "Postpone requested",
          description: "Postpone request submitted successfully",
        })
        fetchTaskDetails(selectedTask._id)
        fetchTasks()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to request postpone",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to request postpone",
        variant: "destructive",
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500"
      case "high": return "bg-orange-500"
      case "medium": return "bg-yellow-500"
      case "low": return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "urgent": return "border-red-200 bg-red-50 text-red-700"
      case "high": return "border-orange-200 bg-orange-50 text-orange-700"
      case "medium": return "border-yellow-200 bg-yellow-50 text-yellow-700"
      case "low": return "border-green-200 bg-green-50 text-green-700"
      default: return "border-gray-200 bg-gray-50 text-gray-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "in_progress": return <Clock className="h-5 w-5 text-blue-500" />
      case "pending": return <Circle className="h-5 w-5 text-gray-400" />
      default: return <AlertCircle className="h-5 w-5 text-orange-500" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed": return "border-emerald-200 bg-emerald-50 text-emerald-700"
      case "in_progress": return "border-blue-200 bg-blue-50 text-blue-700"
      case "pending": return "border-amber-200 bg-amber-50 text-amber-700"
      default: return "border-gray-200 bg-gray-50 text-gray-700"
    }
  }

  const filteredTasks = filter === "all" 
    ? tasks 
    : tasks.filter(task => task.status === filter)

  const packagingTasks = tasks.filter(
    (task) =>
      task.is_packaging_duty ||
      task.related_entity_type === "invoice" ||
      String(task.source_label || "").toLowerCase().includes("packaging") ||
      String(task.title || "").toLowerCase().includes("packaging"),
  )

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: primaryBorderColor, background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})` }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Tasks</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage your assigned duties and track your progress</p>
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fetchTasks()}>Refresh</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Tasks</div>
              <div className="mt-1 text-xl font-semibold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending</div>
              <div className="mt-1 text-xl font-semibold text-amber-600">
                {tasks.filter(t => t.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">In Progress</div>
              <div className="mt-1 text-xl font-semibold" style={{ color: secondaryColor }}>
                {tasks.filter(t => t.status === "in_progress").length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Completed</div>
              <div className="mt-1 text-xl font-semibold text-emerald-600">
                {tasks.filter(t => t.status === "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Packaging Duties</div>
              <div className="mt-1 text-xl font-semibold text-amber-600">
                {packagingTasks.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Task List */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Task List</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Click a task to view details and add work notes.</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
              <div>
                <p className="text-sm font-medium text-foreground">No tasks found</p>
                <p className="mt-1 text-sm text-muted-foreground">You have no tasks in this category.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full table-fixed text-[13px]">
                <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr className="border-b">
                    <th className="px-3 py-3 font-medium w-[5%]">Status</th>
                    <th className="px-3 py-3 font-medium w-[25%]">Task</th>
                    <th className="px-3 py-3 font-medium w-[15%]">Priority</th>
                    <th className="px-3 py-3 font-medium w-[15%]">Assigned By</th>
                    <th className="px-3 py-3 font-medium w-[15%]">Due Date</th>
                    <th className="px-3 py-3 font-medium w-[10%]">Type</th>
                    <th className="px-3 py-3 font-medium w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task, index) => (
                    <tr
                      key={task._id}
                      className={`border-b align-top transition-colors hover:bg-muted/40 cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                      onClick={() => fetchTaskDetails(task._id)}
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center justify-center">
                          {getStatusIcon(task.status)}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground" title={task.title}>
                            {task.title}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground" title={task.description}>
                            {task.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 align-top truncate" title={`${task.assigned_by_user?.firstName || ""} ${task.assigned_by_user?.lastName || ""}`}>
                        {task.assigned_by_user?.firstName || ""} {task.assigned_by_user?.lastName || ""}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString("en-KE", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        }) : "-"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {(task.is_packaging_duty || task.related_entity_type === "invoice") && (
                          <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                            <Package className="h-3 w-3 mr-1" />
                            Packaging
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          {task.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleCompleteTask(task._id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => fetchTaskDetails(task._id)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Panel - Fixed Position */}
      {selectedTask && (
        <div className="fixed right-4 top-20 w-96 max-h-[calc(100vh-120px)] overflow-y-auto bg-white dark:bg-gray-900 border rounded-lg shadow-2xl z-50 p-5" style={{ borderColor: primaryBorderColor }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">{selectedTask.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${getStatusBadgeClass(selectedTask.status)}`}>
                  {selectedTask.status.replace("_", " ")}
                </Badge>
                <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${getPriorityBadgeClass(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </Badge>
                {(selectedTask.is_packaging_duty || selectedTask.related_entity_type === "invoice") && (
                  <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                    <Package className="h-3 w-3 mr-1" />
                    Packaging
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-3">{selectedTask.description}</p>

          <div className="space-y-2 text-sm mb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Assigned by: <span className="text-foreground">{selectedTask.assigned_by_user?.firstName || ""} {selectedTask.assigned_by_user?.lastName || ""}</span></span>
            </div>
            {selectedTask.due_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Due: <span className="text-foreground">{new Date(selectedTask.due_date).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "long",
                  day: "2-digit",
                })}</span></span>
              </div>
            )}
            {selectedTask.completed_at && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed: {new Date(selectedTask.completed_at).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "long",
                  day: "2-digit",
                })}</span>
              </div>
            )}
          </div>

          <div className="mb-3">
            <h4 className="font-medium text-sm mb-2">Work Notes</h4>
            <div className="space-y-2 max-h-40 overflow-auto">
              {(selectedTask.notes_history || []).length > 0 ? (
                (selectedTask.notes_history || []).map((n, i) => (
                  <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                    <div className="text-[10px] text-muted-foreground">{n.user_name} • {new Date(n.createdAt).toLocaleString()}</div>
                    <div>{n.text}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No work notes added yet.</div>
              )}
            </div>
            <Label className="block text-sm font-medium text-foreground mt-4">Add Work Note</Label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="mt-2"
              placeholder="Write your work note here..."
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <Button onClick={handleAddNote} className="flex-1">Save Work Note</Button>
              {selectedTask.status !== "completed" && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleCompleteTask(selectedTask._id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Done
                </Button>
              )}
            </div>
          </div>

          <div>
            <Button variant="outline" onClick={() => setShowPostponeForm((prev) => !prev)} className="w-full">
              {showPostponeForm ? "Hide postpone request" : "Request Postpone"}
            </Button>
          </div>
          {showPostponeForm && (
            <div className="mt-3 rounded-lg border p-4 bg-muted/20">
              <h4 className="font-medium text-sm">Request Postpone</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Add a new due date and optional reason for this task.
              </p>
              <Input
                type="date"
                value={postponeDate || ""}
                onChange={(e) => setPostponeDate(e.target.value)}
                className="w-full mt-2"
              />
              <Textarea
                value={postponeReason}
                onChange={(e) => setPostponeReason(e.target.value)}
                className="w-full mt-2"
                placeholder="Reason (optional)"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <Button onClick={handleRequestPostpone} className="flex-1">Submit request</Button>
                <Button variant="ghost" onClick={() => setShowPostponeForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}