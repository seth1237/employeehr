"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";
import { ArrowLeft, Calendar, CheckCircle2, CircleDashed, Clock, Users, FileText, Activity } from "lucide-react";
import { getToken } from "@/lib/auth";
import API_URL from "@/lib/apiBase";

// Dynamic branding helpers
function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }; // fallback teal
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

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [branding, setBranding] = useState<any>({});
  const [loading, setLoading] = useState(true);

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

      const [projRes, tasksRes, timeRes, brandingRes] = await Promise.all([
        projectsApi.getById(id as string),
        projectsApi.getTasks(id as string).catch(() => ({ data: [] })),
        projectsApi.getTimeLogs(id as string).catch(() => ({ data: [] })),
        fetch(`${API_URL}/api/company/branding`, { headers }).then(res => res.ok ? res.json() : { data: {} })
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data || []);
      setTimeLogs(timeRes.data || []);
      setBranding(brandingRes.data || {});
    } catch (err: any) {
      console.error(err);
      window.alert(err.message || "Failed to load project details");
      router.push("/admin/projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading || !project) return <PageLoadingSkeleton title="Project Details" />;

  const progress = project.task_count > 0 
    ? Math.round(((project.completed_task_count || 0) / project.task_count) * 100) 
    : 0;

  return (
    <div className="space-y-6 w-full p-4 md:p-8 animate-in fade-in duration-500">
      <div 
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild style={{ borderColor: primaryBorderColor }}>
            <Link href="/admin/projects">
              <ArrowLeft className="h-4 w-4" style={{ color: primaryColor }} />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>{project.title}</h1>
              <Badge 
                variant={project.status === 'completed' ? 'default' : project.status === 'active' ? 'default' : 'secondary'}
                className={
                  project.status === 'active' ? "bg-blue-100 text-blue-800" :
                  project.status === 'planning' ? "bg-amber-100 text-amber-800" :
                  project.status === 'completed' ? "bg-emerald-100 text-emerald-800" : ""
                }
              >
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <span className="font-mono text-sm">{project.project_code}</span>
              <span>·</span>
              <span className="capitalize text-sm">{project.priority} Priority</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border" style={{ borderColor: primaryBorderColor }}>
            <CardHeader className="border-b bg-muted/20" style={{ borderColor: primaryBorderColor }}>
              <CardTitle className="text-lg" style={{ color: primaryColor }}>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm leading-relaxed">{project.description || "No description provided."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: primaryBorderColor }}>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" style={{ color: primaryColor }} /> Start Date</h4>
                  <p className="text-sm">{project.start_date ? new Date(project.start_date).toLocaleDateString() : "Not set"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" style={{ color: secondaryColor }} /> Target End Date</h4>
                  <p className="text-sm">{project.end_date ? new Date(project.end_date).toLocaleDateString() : "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border" style={{ borderColor: primaryBorderColor }}>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20" style={{ borderColor: primaryBorderColor }}>
              <CardTitle className="text-lg" style={{ color: primaryColor }}>Project Tasks</CardTitle>
              <Badge variant="secondary" style={{ backgroundColor: primarySoftColor, color: primaryColor }}>{tasks.length} Total</Badge>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    No tasks assigned to this project yet.
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                        ) : (
                          <CircleDashed className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span className="capitalize">{task.status}</span>
                            {task.due_date && (
                              <>
                                <span>·</span>
                                <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">{task.priority}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border" style={{ borderColor: primaryBorderColor }}>
            <CardHeader className="border-b bg-muted/20" style={{ borderColor: primaryBorderColor }}>
              <CardTitle className="text-lg" style={{ color: primaryColor }}>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-bold" style={{ color: primaryColor }}>{progress}%</span>
                <span className="text-sm text-muted-foreground mb-1">{project.completed_task_count || 0} / {project.task_count || 0} Tasks</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500" 
                  style={{ width: `${progress}%`, backgroundColor: primaryColor }} 
                />
              </div>
              {project.budget > 0 && (
                <div className="pt-4 border-t mt-4" style={{ borderColor: primaryBorderColor }}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Allocated Budget</h4>
                  <p className="font-semibold text-lg" style={{ color: secondaryColor }}>KES {project.budget.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border" style={{ borderColor: primaryBorderColor }}>
            <CardHeader className="border-b bg-muted/20" style={{ borderColor: primaryBorderColor }}>
              <CardTitle className="text-lg flex items-center gap-2" style={{ color: primaryColor }}>
                <Users className="h-4 w-4" /> Team Members
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {(!project.members || project.members.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No members assigned</p>
                ) : (
                  project.members.map((member: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center font-medium text-xs"
                        style={{ backgroundColor: primarySoftColor, color: primaryColor }}
                      >
                        {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.user?.firstName} {member.user?.lastName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border" style={{ borderColor: primaryBorderColor }}>
            <CardHeader className="border-b bg-muted/20" style={{ borderColor: primaryBorderColor }}>
              <CardTitle className="text-lg flex items-center gap-2" style={{ color: primaryColor }}>
                <Clock className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-muted">
                {(!project.notes || project.notes.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-2 pl-6 relative">No recent notes</p>
                ) : (
                  project.notes.slice(0, 5).map((note: any, idx: number) => (
                    <div key={idx} className="relative pl-6">
                      <div 
                        className="absolute left-0 top-1.5 h-[6px] w-[6px] rounded-full ring-4 ring-background z-10" 
                        style={{ backgroundColor: primaryColor }}
                      />
                      <p className="text-sm">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
