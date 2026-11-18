"use client"

import { useEffect, useMemo, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react"

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
]

function displayName(record: any) {
  if (record?.candidate_name) return record.candidate_name
  const u = record?.user
  if (!u) return "Unknown"
  const first = u.firstName || ""
  const last = u.lastName || ""
  return `${first} ${last}`.trim() || u.email || "Unknown"
}

function fieldId(label: string) {
  return (
    String(label || "field")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") +
    "_" +
    Date.now().toString().slice(-4)
  )
}

export default function OnboardingPage() {
  const { toast } = useToast()
  const [checklists, setChecklists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toggling, setToggling] = useState<string | null>(null)
  const [poolFilter, setPoolFilter] = useState("active")
  const [answersDraft, setAnswersDraft] = useState<Record<string, Record<string, any>>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState("Standard onboarding")
  const [sections, setSections] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [savingTemplate, setSavingTemplate] = useState(false)

  const load = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const [listRes, templateRes] = await Promise.all([
        api.onboarding.list(),
        api.onboarding.getTemplate(),
      ])
      if (listRes?.success) {
        const rows = listRes.data || []
        setChecklists(rows)
        const drafts: Record<string, Record<string, any>> = {}
        rows.forEach((row: any) => {
          drafts[String(row._id)] = { ...(row.form_answers || {}) }
        })
        setAnswersDraft(drafts)
      }
      if (templateRes?.success && templateRes.data) {
        setTemplateName(templateRes.data.name || "Standard onboarding")
        setSections(templateRes.data.sections || [])
        setTasks(templateRes.data.tasks || [])
      }
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

  const filtered = useMemo(() => {
    return checklists.filter((c) => {
      if (poolFilter === "active") return c.status !== "dropped" && c.status !== "completed"
      if (poolFilter === "completed") return c.status === "completed"
      if (poolFilter === "dropped") return c.status === "dropped"
      return true
    })
  }, [checklists, poolFilter])

  const toggleTask = async (checklistId: string, taskId: string, completed: boolean) => {
    const key = `${checklistId}:${taskId}`
    setToggling(key)
    try {
      const res = await api.onboarding.toggleTask(checklistId, taskId, { completed: !completed })
      if (!res?.success) throw new Error(res.message || "Update failed")
      load({ silent: true })
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message || "Failed to update task" })
    } finally {
      setToggling(null)
    }
  }

  const saveAnswers = async (checklistId: string) => {
    setSavingId(checklistId)
    try {
      const res = await api.onboarding.saveAnswers(checklistId, answersDraft[checklistId] || {})
      if (!res?.success) throw new Error(res.message || "Save failed")
      toast({ description: "Form saved" })
      load({ silent: true })
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message || "Failed to save form" })
    } finally {
      setSavingId(null)
    }
  }

  const dropCandidate = async (checklistId: string) => {
    const reason = window.prompt("Reason for dropping this candidate? (optional)") ?? undefined
    if (reason === undefined) return
    setSavingId(checklistId)
    try {
      const res = await api.onboarding.drop(checklistId, reason)
      if (!res?.success) throw new Error(res.message || "Drop failed")
      toast({ description: "Candidate dropped from onboarding" })
      load({ silent: true })
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message || "Failed to drop" })
    } finally {
      setSavingId(null)
    }
  }

  const completeOnboarding = async (checklistId: string) => {
    if (!confirm("Complete onboarding and create the employee record?")) return
    setSavingId(checklistId)
    try {
      await api.onboarding.saveAnswers(checklistId, answersDraft[checklistId] || {})
      const res = await api.onboarding.complete(checklistId)
      if (!res?.success) throw new Error(res.message || "Complete failed")
      toast({ description: "Employee created. Record moved out of the pool." })
      load({ silent: true })
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message || "Failed to complete onboarding" })
    } finally {
      setSavingId(null)
    }
  }

  const addSection = () => {
    setSections((current) => [
      ...current,
      {
        section_id: `section_${Date.now()}`,
        title: "New section",
        description: "",
        fields: [],
      },
    ])
  }

  const updateSection = (index: number, updates: Record<string, any>) => {
    setSections((current) => current.map((section, i) => (i === index ? { ...section, ...updates } : section)))
  }

  const addField = (sectionIndex: number) => {
    setSections((current) =>
      current.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              fields: [
                ...(section.fields || []),
                {
                  field_id: fieldId("field"),
                  label: "New field",
                  type: "text",
                  required: false,
                  placeholder: "",
                  options: [],
                },
              ],
            }
          : section,
      ),
    )
  }

  const updateField = (sectionIndex: number, fieldIndex: number, updates: Record<string, any>) => {
    setSections((current) =>
      current.map((section, i) => {
        if (i !== sectionIndex) return section
        const fields = [...(section.fields || [])]
        fields[fieldIndex] = { ...fields[fieldIndex], ...updates }
        return { ...section, fields }
      }),
    )
  }

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    setSections((current) =>
      current.map((section, i) =>
        i === sectionIndex
          ? { ...section, fields: (section.fields || []).filter((_: any, fi: number) => fi !== fieldIndex) }
          : section,
      ),
    )
  }

  const addTask = () => {
    setTasks((current) => [...current, { title: "New task", assigneeRole: "hr", dueOffsetDays: 7 }])
  }

  const saveForm = async () => {
    if (!sections.length) {
      toast({ variant: "destructive", description: "Add at least one section" })
      return
    }
    setSavingTemplate(true)
    try {
      const res = await api.onboarding.saveTemplate({
        name: templateName,
        sections,
        tasks,
      })
      if (!res?.success) throw new Error(res.message || "Save failed")
      toast({ description: "Onboarding form saved. New hires will use this version." })
      load({ silent: true })
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message || "Failed to save form" })
    } finally {
      setSavingTemplate(false)
    }
  }

  const renderFieldInput = (checklistId: string, field: any) => {
    const value = answersDraft[checklistId]?.[field.field_id] ?? ""
    const setValue = (next: any) =>
      setAnswersDraft((current) => ({
        ...current,
        [checklistId]: { ...(current[checklistId] || {}), [field.field_id]: next },
      }))

    if (field.type === "textarea") {
      return <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
    }
    if (field.type === "select") {
      return (
        <Select value={value || "none"} onValueChange={(v) => setValue(v === "none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select…</SelectItem>
            {(field.options || []).map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    if (field.type === "checkbox") {
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => setValue(e.target.checked)} />
          {field.placeholder || field.label}
        </label>
      )
    }
    return (
      <Input
        type={field.type === "phone" ? "tel" : field.type || "text"}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Onboarding</h1>
        <p className="text-muted-foreground">
          Hired candidates stay here until the form is complete. Completing it creates the employee.
          {refreshing ? " Refreshing…" : ""}
        </p>
      </div>

      <Tabs defaultValue="pool" className="w-full">
        <TabsList>
          <TabsTrigger value="pool">Pool</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
        </TabsList>

        <TabsContent value="pool" className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: "active", label: "In pool" },
              { id: "completed", label: "Completed" },
              { id: "dropped", label: "Dropped" },
            ].map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={poolFilter === item.id ? "default" : "outline"}
                onClick={() => setPoolFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {loading && checklists.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <TableSkeleton rows={5} />
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No records in this list.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const id = String(c._id)
                const isOpen = !!expanded[id]
                const progress = c.progress ?? 0
                const locked = c.status === "dropped" || c.status === "completed"
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
                                <p className="font-semibold">{displayName(c)}</p>
                                <Badge variant="outline">{c.status.replace("_", " ")}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {c.candidate_email || c.user?.email || "—"}
                                {c.job_title ? ` · ${c.job_title}` : ""}
                                {` · ${c.completedTasks ?? 0}/${c.totalTasks ?? c.tasks?.length ?? 0} tasks`}
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
                        <div className="border-t px-4 py-4 space-y-5">
                          {(c.sections || []).map((section: any) => (
                            <div key={section.section_id} className="space-y-3">
                              <div>
                                <h3 className="text-sm font-semibold">{section.title}</h3>
                                {section.description && (
                                  <p className="text-xs text-muted-foreground">{section.description}</p>
                                )}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {(section.fields || []).map((field: any) => (
                                  <div key={field.field_id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                                    <Label className="text-xs">
                                      {field.label}
                                      {field.required ? " *" : ""}
                                    </Label>
                                    <div className="mt-1">{renderFieldInput(id, field)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          <div className="space-y-2">
                            <h3 className="text-sm font-semibold">Checklist</h3>
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
                                    disabled={busy || locked}
                                    onClick={() => toggleTask(id, taskId, !!task.completed)}
                                  >
                                    <Check className="mr-1 h-3.5 w-3.5" />
                                    {task.completed ? "Done" : "Mark done"}
                                  </Button>
                                </div>
                              )
                            })}
                          </div>

                          {!locked && (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" disabled={savingId === id} onClick={() => saveAnswers(id)}>
                                {savingId === id ? "Saving…" : "Save form"}
                              </Button>
                              <Button size="sm" disabled={savingId === id} onClick={() => completeOnboarding(id)}>
                                Complete and create employee
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={savingId === id}
                                onClick={() => dropCandidate(id)}
                              >
                                Drop
                              </Button>
                            </div>
                          )}
                          {c.status === "dropped" && c.dropped_reason && (
                            <p className="text-sm text-muted-foreground">Dropped: {c.dropped_reason}</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onboarding form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 max-w-md">
                <Label>Form name</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground">
                Sections below are filled in for each hired candidate. Saving this form applies it to new hires.
              </p>
            </CardContent>
          </Card>

          {sections.map((section, sectionIndex) => (
            <Card key={section.section_id}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid gap-2">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                    />
                    <Input
                      placeholder="Section note (optional)"
                      value={section.description || ""}
                      onChange={(e) => updateSection(sectionIndex, { description: e.target.value })}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSections((current) => current.filter((_, i) => i !== sectionIndex))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {(section.fields || []).map((field: any, fieldIndex: number) => (
                  <div key={field.field_id} className="rounded-md border p-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateField(sectionIndex, fieldIndex, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Placeholder"
                        value={field.placeholder || ""}
                        onChange={(e) => updateField(sectionIndex, fieldIndex, { placeholder: e.target.value })}
                      />
                    </div>
                    {field.type === "select" && (
                      <Textarea
                        rows={3}
                        placeholder="One option per line"
                        value={(field.options || []).join("\n")}
                        onChange={(e) =>
                          updateField(sectionIndex, fieldIndex, {
                            options: e.target.value.split("\n").filter((line) => line.trim()),
                          })
                        }
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!field.required}
                          onChange={(e) => updateField(sectionIndex, fieldIndex, { required: e.target.checked })}
                        />
                        Required
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => removeField(sectionIndex, fieldIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button size="sm" variant="outline" onClick={() => addField(sectionIndex)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add field
                </Button>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={addSection}>
              <Plus className="mr-1 h-4 w-4" />
              Add section
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.map((task, index) => (
                <div key={`${task.title}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <Input
                    value={task.title}
                    onChange={(e) =>
                      setTasks((current) =>
                        current.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)),
                      )
                    }
                  />
                  <Select
                    value={task.assigneeRole || "hr"}
                    onValueChange={(value) =>
                      setTasks((current) =>
                        current.map((item, i) => (i === index ? { ...item, assigneeRole: value } : item)),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTasks((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addTask}>
                <Plus className="mr-1 h-4 w-4" />
                Add task
              </Button>
            </CardContent>
          </Card>

          <Button onClick={saveForm} disabled={savingTemplate}>
            {savingTemplate ? "Saving…" : "Generate form"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
