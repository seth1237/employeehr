"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"
import { CheckCircle2, ClipboardList, Target, UserCheck } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"

type Employee = {
  _id: string
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  email?: string
  role?: string
  department?: string
  position?: string
}

type TaskItem = {
  _id: string
  title: string
  description: string
  assigned_to: string
  assigned_by: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  due_date?: string
  notes?: string
  assigned_to_user?: Employee
  assigned_by_user?: Employee
}

type KPIItem = {
  _id: string
  name: string
  description?: string
  category: string
  weight: number
  target?: number
  unit?: string
  target_value?: number
  measurement_unit?: string
}

type PDPGoal = {
  title: string
  description?: string
  category: string
  timeframe: "short_term" | "long_term"
  targetDate?: string
  progress?: number
  status?: "not_started" | "in_progress" | "completed" | "at_risk"
}

type PDPItem = {
  _id: string
  user_id?: string
  title: string
  description?: string
  period?: string
  goals?: any[]
  status: string
  overallProgress?: number
}

const emptyGoal: PDPGoal = {
  title: "",
  description: "",
  category: "career",
  timeframe: "short_term",
  targetDate: "",
  progress: 0,
  status: "not_started",
}

export default function AdminAllocationsPage() {
  const { toast } = useToast()
  const router = useRouter()

  const currentUser = getUser()
  const [loading, setLoading] = useState(true)
  const [savingTask, setSavingTask] = useState(false)
  const [savingKpi, setSavingKpi] = useState(false)
  const [savingPdp, setSavingPdp] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [kpis, setKpis] = useState<KPIItem[]>([])
  const [pdps, setPdps] = useState<PDPItem[]>([])

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium" as TaskItem["priority"],
    due_date: "",
  })

  const [kpiForm, setKpiForm] = useState({
    name: "",
    description: "",
    category: "Operations",
    weight: "50",
    target: "100",
    unit: "%",
  })

  const [pdpForm, setPdpForm] = useState({
    user_id: "",
    title: "",
    description: "",
    period: new Date().getFullYear().toString(),
  })
  const [goalDraft, setGoalDraft] = useState<PDPGoal>(emptyGoal)
  const [goalList, setGoalList] = useState<PDPGoal[]>([])

  useEffect(() => {
    if (!currentUser) {
      router.push("/auth/login")
      return
    }

    const role = currentUser.role
    if (!["company_admin", "hr"].includes(role)) {
      router.push(role === "manager" ? "/manager" : "/employee")
      return
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading)
    try {
      const [usersRes, tasksRes, kpisRes, pdpsRes] = await Promise.all([
        api.users.getAll(),
        api.tasks.getAll(),
        api.kpis.getAll(),
        api.pdps.getAll(),
      ])

      const usersData = Array.isArray(usersRes.data) ? usersRes.data : []
      setEmployees(usersData.filter((user: any) => user.role === "employee"))
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : [])
      setKpis(Array.isArray(kpisRes.data) ? kpisRes.data : [])
      setPdps(Array.isArray(pdpsRes.data) ? pdpsRes.data : [])
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to load allocations data", variant: "destructive" })
    } finally {
      finishDataLoad(silent, setLoading)
    }
  }

  const employeeLabel = (employee?: Employee) => {
    if (!employee) return "Unknown employee"
    return `${employee.firstName || employee.first_name || ""} ${employee.lastName || employee.last_name || ""}`.trim() || employee.email || "Unknown employee"
  }

  const createDuty = async () => {
    if (!taskForm.title || !taskForm.description || !taskForm.assigned_to) {
      toast({ title: "Missing data", description: "Fill duty title, description and assignee", variant: "destructive" })
      return
    }

    try {
      setSavingTask(true)
      const response = await api.tasks.create({
        title: taskForm.title,
        description: taskForm.description,
        assigned_to: taskForm.assigned_to,
        priority: taskForm.priority,
        due_date: taskForm.due_date || undefined,
      })

      if (!response.success) throw new Error(response.message || "Failed to create duty")

      toast({ title: "Duty allocated", description: "Task created successfully" })
      setTaskForm({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" })
      loadData(true)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to allocate duty", variant: "destructive" })
    } finally {
      setSavingTask(false)
    }
  }

  const deleteDuty = async (id: string) => {
    try {
      await api.tasks.delete(id)
      toast({ title: "Duty removed", description: "Task deleted" })
      loadData(true)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete duty", variant: "destructive" })
    }
  }

  const createTarget = async () => {
    if (!kpiForm.name || !kpiForm.category || !kpiForm.unit) {
      toast({ title: "Missing data", description: "Fill target name, category and unit", variant: "destructive" })
      return
    }

    try {
      setSavingKpi(true)
      const response = await api.kpis.create({
        name: kpiForm.name,
        description: kpiForm.description,
        category: kpiForm.category,
        weight: Number(kpiForm.weight || 0),
        target: Number(kpiForm.target || 0),
        unit: kpiForm.unit,
      } as any)

      if (!response.success) throw new Error(response.message || "Failed to create target")

      toast({ title: "Target allocated", description: "KPI created successfully" })
      setKpiForm({ name: "", description: "", category: "Operations", weight: "50", target: "100", unit: "%" })
      loadData(true)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to allocate target", variant: "destructive" })
    } finally {
      setSavingKpi(false)
    }
  }

  const deleteTarget = async (id: string) => {
    try {
      await api.kpis.delete(id)
      toast({ title: "Target removed", description: "KPI deleted" })
      loadData(true)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete target", variant: "destructive" })
    }
  }

  const addGoal = () => {
    if (!goalDraft.title) {
      toast({ title: "Missing goal", description: "Add a goal title first", variant: "destructive" })
      return
    }

    setGoalList((prev) => [
      ...prev,
      {
        ...goalDraft,
        progress: Number(goalDraft.progress || 0),
      },
    ])
    setGoalDraft(emptyGoal)
  }

  const removeGoal = (index: number) => {
    setGoalList((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const createResponsibilityAllocation = async () => {
    if (!pdpForm.user_id || !pdpForm.title || goalList.length === 0) {
      toast({ title: "Missing data", description: "Pick an employee, add a title and at least one goal", variant: "destructive" })
      return
    }

    try {
      setSavingPdp(true)
      const response = await api.pdps.create({
        user_id: pdpForm.user_id,
        title: pdpForm.title,
        description: pdpForm.description,
        period: pdpForm.period,
        goals: goalList as any,
      } as any)

      if (!response.success) throw new Error(response.message || "Failed to create responsibility allocation")

      toast({ title: "Responsibility allocated", description: "PDP created successfully" })
      setPdpForm({ user_id: "", title: "", description: "", period: new Date().getFullYear().toString() })
      setGoalList([])
      setGoalDraft(emptyGoal)
      loadData(true)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to allocate responsibility", variant: "destructive" })
    } finally {
      setSavingPdp(false)
    }
  }

  const stats = useMemo(() => ({
    duties: tasks.length,
    targets: kpis.length,
    responsibilities: pdps.length,
    employees: employees.length,
  }), [tasks.length, kpis.length, pdps.length, employees.length])

  if (loading) return <PageLoadingSkeleton title="Loading allocations" rows={8} />

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Allocations Center</h1>
          <p className="text-muted-foreground">Allocate duties, targets and responsibilities from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Employees: {stats.employees}</Badge>
          <Badge variant="secondary">Duties: {stats.duties}</Badge>
          <Badge variant="secondary">Targets: {stats.targets}</Badge>
          <Badge variant="secondary">Responsibilities: {stats.responsibilities}</Badge>
        </div>
      </div>

      <Tabs defaultValue="duties" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="duties" className="gap-2"><ClipboardList className="h-4 w-4" /> Duties</TabsTrigger>
          <TabsTrigger value="targets" className="gap-2"><Target className="h-4 w-4" /> Targets</TabsTrigger>
          <TabsTrigger value="responsibilities" className="gap-2"><UserCheck className="h-4 w-4" /> Responsibilities</TabsTrigger>
        </TabsList>

        <TabsContent value="duties" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Allocate Duty</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Title</Label>
                <Input value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Monthly stock check" />
              </div>
              <div>
                <Label>Assignee</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={taskForm.assigned_to} onChange={(e) => setTaskForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee._id} value={employee._id}>{employeeLabel(employee)}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={taskForm.description} onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe the duty and expected outcome" />
              </div>
              <div>
                <Label>Priority</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={taskForm.priority} onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value as TaskItem["priority"] }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={createDuty} disabled={savingTask}>{savingTask ? "Allocating..." : "Allocate Duty"}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Duties</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Title</th>
                    <th className="py-2">Assignee</th>
                    <th className="py-2">Priority</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Due</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task._id} className="border-b">
                      <td className="py-2 pr-3">{task.title}</td>
                      <td className="py-2 pr-3">{employeeLabel(task.assigned_to_user || undefined)}</td>
                      <td className="py-2 pr-3 capitalize">{task.priority}</td>
                      <td className="py-2 pr-3 capitalize">{task.status}</td>
                      <td className="py-2 pr-3">{task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}</td>
                      <td className="py-2 pr-3"><Button size="sm" variant="destructive" onClick={() => deleteDuty(task._id)}>Delete</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Allocate Target</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Target Name</Label>
                <Input value={kpiForm.name} onChange={(e) => setKpiForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Monthly sales target" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={kpiForm.category} onChange={(e) => setKpiForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Sales / Operations / HR" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={kpiForm.description} onChange={(e) => setKpiForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Target details and expectations" />
              </div>
              <div>
                <Label>Weight (%)</Label>
                <Input type="number" min="0" max="100" value={kpiForm.weight} onChange={(e) => setKpiForm((prev) => ({ ...prev, weight: e.target.value }))} />
              </div>
              <div>
                <Label>Target Value</Label>
                <Input type="number" min="0" value={kpiForm.target} onChange={(e) => setKpiForm((prev) => ({ ...prev, target: e.target.value }))} />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={kpiForm.unit} onChange={(e) => setKpiForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="% / number / amount" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={createTarget} disabled={savingKpi}>{savingKpi ? "Saving..." : "Allocate Target"}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Target Allocations</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Target</th>
                    <th className="py-2">Weight</th>
                    <th className="py-2">Unit</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi) => (
                    <tr key={kpi._id} className="border-b">
                      <td className="py-2 pr-3">{kpi.name}</td>
                      <td className="py-2 pr-3">{kpi.category}</td>
                      <td className="py-2 pr-3">{kpi.target ?? kpi.target_value ?? 0}</td>
                      <td className="py-2 pr-3">{kpi.weight}%</td>
                      <td className="py-2 pr-3">{kpi.unit ?? kpi.measurement_unit ?? ""}</td>
                      <td className="py-2 pr-3"><Button size="sm" variant="destructive" onClick={() => deleteTarget(kpi._id)}>Delete</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsibilities" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Allocate Responsibility</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Employee</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={pdpForm.user_id} onChange={(e) => setPdpForm((prev) => ({ ...prev, user_id: e.target.value }))}>
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee._id} value={employee._id}>{employeeLabel(employee)}</option>)}
                </select>
              </div>
              <div>
                <Label>Period</Label>
                <Input value={pdpForm.period} onChange={(e) => setPdpForm((prev) => ({ ...prev, period: e.target.value }))} placeholder="2026-Q2 / 2026" />
              </div>
              <div className="md:col-span-2">
                <Label>Title</Label>
                <Input value={pdpForm.title} onChange={(e) => setPdpForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Employee responsibility plan" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={pdpForm.description} onChange={(e) => setPdpForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Responsibilities and performance focus areas" />
              </div>

              <div className="md:col-span-2 rounded-md border p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Goal Title</Label>
                    <Input value={goalDraft.title} onChange={(e) => setGoalDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Improve stock accuracy" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={goalDraft.category} onChange={(e) => setGoalDraft((prev) => ({ ...prev, category: e.target.value }))} placeholder="career / finance / health" />
                  </div>
                  <div>
                    <Label>Timeframe</Label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={goalDraft.timeframe} onChange={(e) => setGoalDraft((prev) => ({ ...prev, timeframe: e.target.value as PDPGoal["timeframe"] }))}>
                      <option value="short_term">Short term</option>
                      <option value="long_term">Long term</option>
                    </select>
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input type="date" value={goalDraft.targetDate || ""} onChange={(e) => setGoalDraft((prev) => ({ ...prev, targetDate: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={goalDraft.description || ""} onChange={(e) => setGoalDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="What should the employee achieve?" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={addGoal}><CheckCircle2 className="mr-2 h-4 w-4" />Add Goal</Button>
                  <div className="text-xs text-muted-foreground">Goals added below will be included in the responsibility allocation.</div>
                </div>
              </div>

              {goalList.length > 0 && (
                <div className="md:col-span-2 overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-2">Goal</th>
                        <th className="py-2 px-2">Category</th>
                        <th className="py-2 px-2">Timeframe</th>
                        <th className="py-2 px-2">Target Date</th>
                        <th className="py-2 px-2">Drop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goalList.map((goal, index) => (
                        <tr key={`${goal.title}-${index}`} className="border-b">
                          <td className="py-2 px-2">{goal.title}</td>
                          <td className="py-2 px-2">{goal.category}</td>
                          <td className="py-2 px-2">{goal.timeframe}</td>
                          <td className="py-2 px-2">{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "N/A"}</td>
                          <td className="py-2 px-2"><Button size="sm" variant="destructive" type="button" onClick={() => removeGoal(index)}>Drop</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end">
                <Button onClick={createResponsibilityAllocation} disabled={savingPdp}>{savingPdp ? "Saving..." : "Allocate Responsibility"}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Responsibility Allocations</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Employee</th>
                    <th className="py-2">Title</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Goals</th>
                    <th className="py-2">Progress</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pdps.map((pdp) => {
                    const employee = employees.find((user) => user._id === pdp.user_id)
                    return (
                      <tr key={pdp._id} className="border-b">
                        <td className="py-2 pr-3">{employeeLabel(employee)}</td>
                        <td className="py-2 pr-3">{pdp.title}</td>
                        <td className="py-2 pr-3">{pdp.period}</td>
                        <td className="py-2 pr-3">{pdp.goals?.length || 0}</td>
                        <td className="py-2 pr-3">{pdp.overallProgress || 0}%</td>
                        <td className="py-2 pr-3 capitalize">{pdp.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
