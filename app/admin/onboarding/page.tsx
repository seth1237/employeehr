"use client"

import { useEffect, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Check, ChevronDown, Plus } from "lucide-react"

function displayName(u: any) {
  if (!u) return "Unknown"
  const first = u.firstName || u.first_name || ""
  const last = u.lastName || u.last_name || ""
  return `${first} ${last}`.trim() || u.email || "Unknown"
}

export default function OnboardingPage() {
  const { toast } = useToast()
  const [checklists, setChecklists] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toggling, setToggling] = useState<string | null>(null)

  const load = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const [listRes, usersRes] = await Promise.all([
        api.onboarding.list(),
        api.users.getAll(),
      ])
      if (listRes.success) setChecklists(listRes.data || [])
      if (usersRes.success) setUsers(usersRes.data || [])
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", description: "Failed to load onboarding" })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const usersWithoutChecklist = users.filter((u) => {
    const id = String(u._id)
    return !checklists.some((c) => String(c.user_id) === id)
  })

  const createChecklist = async () => {
    if (!selectedUserId) {
      toast({ variant: "destructive", description: "Select an employee first" })
      return
    }
    setCreating(true)
    try {
      const res = await api.onboarding.create({ userId: selectedUserId })
      if (!res.success) throw new Error(res.message || "Create failed")
      toast({ description: "Onboarding checklist created" })
      setSelectedUserId("")
      load({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to create checklist",
      })
    } finally {
      setCreating(false)
    }
  }

  const toggleTask = async (checklistId: string, taskId: string, completed: boolean) => {
    const key = `${checklistId}:${taskId}`
    setToggling(key)
    try {
      const res = await api.onboarding.toggleTask(checklistId, taskId, { completed: !completed })
      if (!res.success) throw new Error(res.message || "Update failed")
      load({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to update task",
      })
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Onboarding</h1>
        <p className="text-muted-foreground">
          Track new-hire checklists and task completion.
          {refreshing ? " Refreshing…" : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start checklist for employee</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label>Employee without checklist</Label>
            <Select value={selectedUserId || "none"} onValueChange={(v) => setSelectedUserId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select employee…</SelectItem>
                {usersWithoutChecklist.map((u) => (
                  <SelectItem key={u._id} value={String(u._id)}>
                    {displayName(u)} {u.email ? `(${u.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createChecklist} disabled={creating || !selectedUserId}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Creating…" : "Create checklist"}
          </Button>
        </CardContent>
      </Card>

      {loading && checklists.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <TableSkeleton rows={5} />
          </CardContent>
        </Card>
      ) : checklists.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No onboarding checklists yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {checklists.map((c) => {
            const id = String(c._id)
            const isOpen = !!expanded[id]
            const progress = c.progress ?? 0
            return (
              <Card key={id}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => setExpanded((e) => ({ ...e, [id]: open }))}
                >
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full text-left p-4 hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{displayName(c.user)}</p>
                            <Badge variant="outline">{c.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {c.user?.department || "—"} · {c.completedTasks ?? 0}/{c.totalTasks ?? c.tasks?.length ?? 0} tasks
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{progress}%</span>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 space-y-2">
                      {(c.tasks || []).map((task: any) => {
                        const taskId = String(task._id)
                        const busy = toggling === `${id}:${taskId}`
                        return (
                          <div
                            key={taskId}
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                          >
                            <div>
                              <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {task.assigneeRole || "hr"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={task.completed ? "secondary" : "outline"}
                              disabled={busy}
                              onClick={() => toggleTask(id, taskId, !!task.completed)}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              {task.completed ? "Done" : "Mark done"}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
