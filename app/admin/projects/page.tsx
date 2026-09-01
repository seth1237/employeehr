"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import API_URL from "@/lib/apiBase";
import { getToken } from "@/lib/auth";
import { 
  FolderKanban, Plus, Search, Calendar, Users, 
  Clock, CheckCircle2, Activity, DollarSign 
} from "lucide-react";

import { projectsApi } from "@/lib/api";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";
import { type TenantBranding } from "@/lib/stock-document-pdf";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";

// --- Types ---
interface Project {
  _id: string;
  project_code: string;
  title: string;
  description: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  start_date?: string;
  end_date?: string;
  budget?: number;
  completed_task_count?: number;
  task_count?: number;
  members?: any[];
}

interface ProjectStats {
  total: number;
  active: number;
  planning: number;
  completed: number;
}

// --- Helpers ---
function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 79, g: 70, b: 229 }; // indigo-600 fallback
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-700 border-red-200";
    case "high": return "bg-orange-100 text-orange-700 border-orange-200";
    case "medium": return "bg-blue-100 text-blue-700 border-blue-200";
    case "low": return "bg-slate-100 text-slate-700 border-slate-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
    case "planning": return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    case "on_hold": return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
    case "cancelled": return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "planning",
    priority: "medium",
    start_date: "",
    end_date: "",
    budget: "",
  });
  const [saving, setSaving] = useState(false);

  // Multi-tenant branding colors
  const primaryColor = branding.primaryColor || "#4f46e5";
  const secondaryColor = branding.secondaryColor || "#0ea5e9";
  const primarySoftColor = hexToRgba(primaryColor, 0.08);
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08);
  const primaryBorderColor = hexToRgba(primaryColor, 0.18);

  const loadData = async () => {
    try {
      setLoading(true);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      };

      const [projRes, statsRes, brandingRes] = await Promise.all([
        projectsApi.getAll(),
        projectsApi.getStats(),
        fetch(`${API_URL}/api/company/branding`, { headers }).then(res => res.ok ? res.json() : { data: {} })
      ]);
      
      setProjects(projRes.data || []);
      setStats(statsRes.data || null);
      setBranding(brandingRes.data || {});
    } catch (err: any) {
      console.error(err);
      window.alert(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return window.alert("Project title is required");
    
    try {
      setSaving(true);
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : undefined
      };
      await projectsApi.create(payload);
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        status: "planning",
        priority: "medium",
        start_date: "",
        end_date: "",
        budget: "",
      });
      await loadData();
    } catch (err: any) {
      window.alert(err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter && statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(s) ||
        p.project_code.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (loading && !stats) return <PageLoadingSkeleton title="Projects" rows={8} />;

  return (
    <div className="space-y-5 w-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* --- Header & Stats Section (Branded) --- */}
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>
              Projects
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Project Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Track initiatives, allocate resources, and monitor task completion across your organization.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setShowForm(!showForm)} 
              className="text-white shadow-sm transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {showForm ? "Cancel" : "New Project"}
            </Button>
          </div>
        </div>

        {/* --- Stats Grid --- */}
        {stats && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total Projects" 
              value={stats.total} 
              icon={FolderKanban} 
              primaryColor={primaryColor}
              primarySoftColor={primarySoftColor}
              primaryBorderColor={primaryBorderColor}
            />
            <StatCard 
              title="Active" 
              value={stats.active} 
              icon={Activity} 
              primaryColor={primaryColor}
              primarySoftColor={primarySoftColor}
              primaryBorderColor={primaryBorderColor}
            />
            <StatCard 
              title="In Planning" 
              value={stats.planning} 
              icon={Calendar} 
              primaryColor={primaryColor}
              primarySoftColor={primarySoftColor}
              primaryBorderColor={primaryBorderColor}
            />
            <StatCard 
              title="Completed" 
              value={stats.completed} 
              icon={CheckCircle2} 
              primaryColor={primaryColor}
              primarySoftColor={primarySoftColor}
              primaryBorderColor={primaryBorderColor}
            />
          </div>
        )}

        {/* --- Search & Filter Bar --- */}
        <div className="mt-3">
          <div className="rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px] lg:items-end">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Project name, code, or description..." 
                    className="pl-9 h-10 w-full"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status Filter</Label>
                <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Create Form (Collapsible & Branded) --- */}
      {showForm && (
        <Card className="shadow-md border animate-in slide-in-from-top-4 duration-300" style={{ borderColor: primaryBorderColor }}>
          <CardHeader className="border-b" style={{ backgroundColor: primarySoftColor, borderColor: primaryBorderColor }}>
            <CardTitle className="flex items-center gap-2" style={{ color: primaryColor }}>
              <Plus className="h-5 w-5" />
              Create New Project
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Enter the project details below to initialize a new workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Project Title <span className="text-red-500">*</span></Label>
                  <Input 
                    id="title"
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    placeholder="e.g. Q3 ERP System Implementation"
                    className="h-11"
                    required 
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description"
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    placeholder="Brief objective and scope of this project" 
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({...form, status: val})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(val) => setForm({...form, priority: val})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date"
                    value={form.start_date} 
                    onChange={e => setForm({...form, start_date: e.target.value})} 
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target End Date</Label>
                  <Input 
                    type="date"
                    value={form.end_date} 
                    onChange={e => setForm({...form, end_date: e.target.value})} 
                    className="h-11"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Budget (Optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      value={form.budget} 
                      onChange={e => setForm({...form, budget: e.target.value})} 
                      placeholder="0.00" 
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-11 px-6">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="h-11 px-6 text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: primaryColor }}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" /> Saving...
                    </span>
                  ) : "Create Project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* --- Portfolio Grid --- */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Project Portfolio</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredProjects.length} of {projects.length} projects
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No projects found</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                {search || statusFilter 
                  ? "Try adjusting your search or filter criteria." 
                  : "Create your first project to start tracking progress and allocating resources."}
              </p>
              {!search && !statusFilter && (
                <Button 
                  onClick={() => setShowForm(true)} 
                  variant="link" 
                  className="mt-4"
                  style={{ color: primaryColor }}
                >
                  Create a new project &rarr;
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <Link key={project._id} href={`/admin/projects/${project._id}`}>
                    <Card className="group hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full flex flex-col bg-white border-muted/60">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <Badge variant="outline" className="font-mono text-xs bg-muted/50 text-muted-foreground border-muted">
                            {project.project_code}
                          </Badge>
                          <div className="flex gap-1.5">
                            <Badge className={`text-[10px] uppercase tracking-wider border ${getPriorityColor(project.priority)}`}>
                              {project.priority}
                            </Badge>
                            <Badge className={`text-[10px] uppercase tracking-wider border ${getStatusColor(project.status)}`}>
                              {project.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1" style={{ color: primaryColor }}>
                          {project.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[2.5rem] mt-1.5 text-sm leading-relaxed">
                          {project.description || "No description provided for this project."}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="mt-auto pt-4 space-y-4 border-t border-muted/60">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5" />
                            {project.budget ? formatCurrency(project.budget) : "No budget set"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {project.members?.length || 0} {project.members?.length === 1 ? 'member' : 'members'}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Task Completion</span>
                            <span style={{ color: primaryColor }}>
                              {project.completed_task_count || 0} / {project.task_count || 0}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: project.task_count > 0 
                                  ? `${((project.completed_task_count || 0) / project.task_count) * 100}%` 
                                  : '0%',
                                backgroundColor: project.task_count > 0 && (project.completed_task_count || 0) / project.task_count === 1 
                                  ? '#10b981' 
                                  : primaryColor
                              }} 
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {project.end_date ? (
                            <span>Target: {new Date(project.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          ) : (
                            <span className="italic">No deadline set</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Subcomponent for Stats to keep main component clean ---
function StatCard({ 
  title, 
  value, 
  icon: Icon,
  primaryColor,
  primarySoftColor,
  primaryBorderColor
}: { 
  title: string; 
  value: number; 
  icon: any;
  primaryColor: string;
  primarySoftColor: string;
  primaryBorderColor: string;
}) {
  return (
    <Card className="shadow-sm border" style={{ borderColor: primaryBorderColor, background: primarySoftColor }}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          <Icon className="h-4 w-4" style={{ color: primaryColor }} />
        </div>
        <div className="mt-1 text-xl font-semibold" style={{ color: primaryColor }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}