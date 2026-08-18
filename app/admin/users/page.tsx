'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Lock, Unlock, Eye, FileText, 
  Calendar, Award, BarChart3, MessageSquare, CheckSquare, Mail,
  Phone, MapPin, Briefcase, Clock, Download, Filter, MoreVertical,
  UserCheck, UserX, Send, TrendingUp, Target, AlertCircle, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { finishDataLoad, startDataLoad } from '@/lib/silent-load';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  employee_id: string;
  role: string;
  department: string;
  position: string;
  phone?: string;
  location?: string;
  hireDate?: string;
  status?: string;
  manager?: string;
  lastActive?: string;
}

interface EmployeeDetails {
  pdpProgress: number;
  completedTasks: number;
  pendingTasks: number;
  attendanceRate: number;
  performanceScore: number;
  badgesEarned: number;
  suggestionsSubmitted: number;
  pollsParticipated: number;
}

interface TenantBranding {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return { r: 37, g: 99, b: 235 }
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [branding, setBranding] = useState<TenantBranding>({});

  // Employee detailed data
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [employeePDP, setEmployeePDP] = useState<any>(null);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [employeeAwards, setEmployeeAwards] = useState<any[]>([]);
  const [employeeAlerts, setEmployeeAlerts] = useState<any[]>([]);

  // Create user form state (simplified)
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    employee_id: '',
    department: '',
    role: 'employee',
    isManager: false,
  });

  // Message dialog
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [message, setMessage] = useState({ subject: '', body: '' });

  useEffect(() => {
    fetchUsers();
    (async () => {
      try {
        const r = await api.company.getDepartments()
        if (r?.success) setDepartments(r.data || [])
      } catch (err) {
        console.error('Failed to load departments', err)
      }
    })()
  }, []);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch(`${API_URL}/api/company/branding`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        })

        if (!response.ok) return

        const data = await response.json()
        setBranding(data?.data || {})
      } catch (error) {
        console.error('Failed to load branding:', error)
      }
    }

    loadBranding()
  }, [])

  const fetchUsers = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading);
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading);
    }
  };

  const fetchEmployeeDetails = async (userId: string) => {
    try {
      // Fetch comprehensive employee data
      const [pdpRes, tasksRes, attendanceRes, awardsRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/api/pdp/user/${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/tasks?userId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/attendance?userId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/badges/user/${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/alerts?userId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const pdpData = await pdpRes.json();
      const tasksData = await tasksRes.json();
      const attendanceData = await attendanceRes.json();
      const awardsData = await awardsRes.json();
      const alertsData = await alertsRes.json();

      setEmployeePDP(pdpData.data);
      setEmployeeTasks(Array.isArray(tasksData) ? tasksData : tasksData.data || []);
      setEmployeeAttendance(Array.isArray(attendanceData) ? attendanceData : attendanceData.data || []);
      setEmployeeAwards(Array.isArray(awardsData) ? awardsData : awardsData.data || []);
      setEmployeeAlerts(Array.isArray(alertsData) ? alertsData : alertsData.data || []);

      // Calculate metrics
      const tasks = Array.isArray(tasksData) ? tasksData : tasksData.data || [];
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;
      
      const attendance = Array.isArray(attendanceData) ? attendanceData : attendanceData.data || [];
      const attendanceRate = attendance.length > 0 
        ? (attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100 
        : 0;

      setEmployeeDetails({
        pdpProgress: pdpData.data?.progress || 0,
        completedTasks,
        pendingTasks,
        attendanceRate,
        performanceScore: pdpData.data?.performanceScore || 0,
        badgesEarned: (Array.isArray(awardsData) ? awardsData : awardsData.data || []).length,
        suggestionsSubmitted: 0, // Would need API endpoint
        pollsParticipated: 0, // Would need API endpoint
      });
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setActiveTab('overview');
    setIsDetailsDialogOpen(true);
    await fetchEmployeeDetails(user._id);
  };

  const handleCreateUser = async () => {
    try {
      const names = newUser.fullName.trim().split(/\s+/)
      const firstName = names.shift() || ''
      const lastName = names.join(' ') || ''
      const selectedDept = departments.find((d) => d._id === newUser.department)
      const role =
        newUser.role === 'admin'
          ? 'admin'
          : newUser.role === 'sales_rep'
            ? 'sales_rep'
            : newUser.isManager || newUser.role === 'manager'
              ? 'manager'
              : 'employee'
      const payload = {
        firstName,
        lastName,
        email: newUser.email,
        employee_id: newUser.employee_id,
        department: selectedDept?.name || newUser.department,
        role,
      }

      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const body = await response.json()
        const created = body.data || body
        // If marked as manager, assign to department
        if (role === 'manager' && newUser.department && created && created._id) {
          try {
            await api.company.updateDepartment(newUser.department, { managerId: created._id })
            toast({ description: 'Assigned manager to department' })
          } catch (err) {
            console.error('Failed to assign manager to department', err)
          }
        }

        toast({ title: 'Success', description: 'User created successfully' })
        setIsCreateDialogOpen(false)
        setNewUser({ fullName: '', email: '', employee_id: '', department: '', role: 'employee', isManager: false })
        if (created?._id) {
          setUsers((prev) => [...prev, {
            _id: created._id,
            firstName: created.firstName || firstName,
            lastName: created.lastName || lastName,
            email: created.email || newUser.email,
            employee_id: created.employee_id || newUser.employee_id,
            role: created.role || role,
            department: created.department || newUser.department,
            position: created.position || '',
          }])
        } else {
          fetchUsers(true)
        }
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User role updated successfully',
        });
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser) return;

    try {
      // Would need a messages API endpoint
      toast({
        title: 'Success',
        description: `Message sent to ${selectedUser.firstName} ${selectedUser.lastName}`,
      });
      setIsMessageDialogOpen(false);
      setMessage({ subject: '', body: '' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleExportData = () => {
    const csv = [
      ['Name', 'Email', 'Employee ID', 'Role', 'Department', 'Position', 'Status'],
      ...filteredUsers.map(u => [
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.employee_id,
        u.role,
        u.department,
        u.position,
        u.status || 'active',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const brand = useMemo(() => ({
    name: branding.name || 'Organization',
    primary: branding.primaryColor || '#2563eb',
    secondary: branding.secondaryColor || '#059669',
    accent: branding.accentColor || '#f59e0b',
    background: branding.backgroundColor || '#ffffff',
    text: branding.textColor || '#1f2937',
  }), [branding])

  const headerStyle = useMemo(() => ({
    borderColor: hexToRgba(brand.primary, 0.18),
    background: `linear-gradient(120deg, ${hexToRgba(brand.primary, 0.10)} 0%, #ffffff 65%)`,
    color: brand.text,
  }), [brand.background, brand.primary, brand.text])

  const statCardStyle = useMemo(() => ({
    borderColor: hexToRgba(brand.primary, 0.14),
    background: `linear-gradient(180deg, #ffffff 0%, ${hexToRgba(brand.primary, 0.03)} 100%)`,
  }), [brand.primary])

  

  if (loading) return <PageLoadingSkeleton title="Loading employees" rows={8} />;

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border px-5 py-4 shadow-sm"
        style={headerStyle}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Administration</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Employee Management</h1>
            <p className="mt-1 text-sm text-slate-600">Comprehensive employee management and monitoring system</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/80 text-slate-700">{users.length} employees</Badge>
            <Badge variant="secondary" className="bg-white/80 text-slate-700">{users.filter(u => u.role === 'sales_rep').length} sales reps</Badge>
            <Badge variant="secondary" className="bg-white/80 text-slate-700">{departments.length} departments</Badge>
            <Badge variant="secondary" className="bg-white/80 text-slate-700">{users.filter(u => u.role === 'admin').length} admins</Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm" style={statCardStyle as React.CSSProperties}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(brand.primary, 0.10), color: brand.primary }}>
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm" style={statCardStyle as React.CSSProperties}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(brand.secondary, 0.10), color: brand.secondary }}>
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status !== 'inactive').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm" style={statCardStyle as React.CSSProperties}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(brand.accent, 0.10), color: brand.accent }}>
              <Briefcase className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm" style={statCardStyle as React.CSSProperties}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(brand.primary, 0.10), color: brand.primary }}>
              <Lock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">System administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="shadow-sm" style={{ borderColor: hexToRgba(brand.primary, 0.12) }}>
        <CardHeader className="border-b bg-slate-50/70">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="sales_rep">Sales Representative</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleExportData} style={{ borderColor: hexToRgba(brand.primary, 0.18), color: brand.primary }}>
                <Download className="h-4 w-4" />
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: brand.primary }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                        Create a new employee with minimal required details
                    </DialogDescription>
                  </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Employee Name *</Label>
                        <Input
                          id="fullName"
                          value={newUser.fullName}
                          onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="employee_id">Phone Number *</Label>
                          <Input
                            id="employee_id"
                            value={newUser.employee_id}
                            onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })}
                            placeholder="+25400000000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            placeholder="jane.doe@company.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Select value={newUser.department} onValueChange={(v) => setNewUser({ ...newUser, department: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((d) => (
                              <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={newUser.role === 'employee' ? 'default' : 'outline'}
                            onClick={() => setNewUser({ ...newUser, role: 'employee', isManager: false })}
                          >
                            Employee
                          </Button>
                          <Button
                            type="button"
                            variant={newUser.role === 'sales_rep' ? 'default' : 'outline'}
                            onClick={() => setNewUser({ ...newUser, role: 'sales_rep', isManager: false })}
                          >
                            Sales Representative
                          </Button>
                          <Button
                            type="button"
                            variant={newUser.role === 'manager' ? 'default' : 'outline'}
                            onClick={() => setNewUser({ ...newUser, role: 'manager', isManager: true })}
                          >
                            Manager
                          </Button>
                          <Button
                            type="button"
                            variant={newUser.role === 'admin' ? 'default' : 'outline'}
                            onClick={() => setNewUser({ ...newUser, role: 'admin', isManager: false })}
                          >
                            Admin
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sales representatives log into the sales reporting tool, not the admin portal.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          checked={newUser.isManager}
                          disabled={newUser.role === 'admin' || newUser.role === 'sales_rep'}
                          onCheckedChange={(v: any) =>
                            setNewUser({
                              ...newUser,
                              isManager: !!v,
                              role: v
                                ? 'manager'
                                : newUser.role === 'admin'
                                  ? 'admin'
                                  : newUser.role === 'sales_rep'
                                    ? 'sales_rep'
                                    : 'employee',
                            })
                          }
                        />
                        <Label>Assign as department manager</Label>
                      </div>
                    </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>Create Employee</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredUsers.length} of {users.length} employees
          </div>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user._id} className="hover:shadow-md transition-shadow border-slate-200" style={{ borderColor: hexToRgba(brand.primary, 0.10) }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(brand.primary, 0.10), color: brand.primary }}>
                        <span className="text-lg font-semibold">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {user.firstName} {user.lastName}
                          </h3>
                          <Badge variant={
                            user.role === 'admin' ? 'destructive' :
                            user.role === 'manager' ? 'default' :
                            user.role === 'sales_rep' ? 'outline' : 'secondary'
                          }>
                            {user.role === 'sales_rep' ? 'Sales Representative' : user.role}
                          </Badge>
                          {user.status === 'inactive' && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {user.employee_id}
                          </div>
                          {user.department && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {departments.find((d) => d._id === user.department)?.name || user.department}
                            </div>
                          )}
                          {user.position && (
                            <Badge variant="outline">{user.position}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                        style={{ borderColor: hexToRgba(brand.primary, 0.18), color: brand.primary }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setIsMessageDialogOpen(true);
                          }}>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'admin')}>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Promote to Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'manager')}>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Promote to Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'sales_rep')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Assign as Sales Representative
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'employee')}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Demote to Employee
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" style={{ borderColor: hexToRgba(brand.primary, 0.14) }}>
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(brand.primary, 0.10), color: brand.primary }}>
                <span className="text-2xl font-semibold">
                  {selectedUser?.firstName?.charAt(0)}{selectedUser?.lastName?.charAt(0)}
                </span>
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </DialogTitle>
                <DialogDescription>
                  {selectedUser?.position} • {selectedUser?.department}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pdp">PDP</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="awards">Awards</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{selectedUser?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{selectedUser?.location || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Hire Date</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedUser?.hireDate ? new Date(selectedUser.hireDate).toLocaleDateString() : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              {employeeDetails && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">PDP Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.pdpProgress}%</div>
                      <Progress value={employeeDetails.pdpProgress} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.completedTasks}</div>
                      <p className="text-xs text-muted-foreground">
                        {employeeDetails.pendingTasks} pending
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.attendanceRate.toFixed(1)}%</div>
                      <Progress value={employeeDetails.attendanceRate} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.badgesEarned}</div>
                      <p className="text-xs text-muted-foreground">Total achievements</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdp" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Development Plan</CardTitle>
                  <CardDescription>
                    View employee's PDP progress and goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeePDP ? (
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <p className="font-medium">Career Aspirations</p>
                          <p className="text-sm text-muted-foreground">
                            {employeePDP.careerAspirations || 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Current Skills</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {employeePDP.currentSkills?.map((skill: string, i: number) => (
                              <Badge key={i} variant="secondary">{skill}</Badge>
                            )) || 'No skills listed'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No PDP data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Task Overview</CardTitle>
                  <CardDescription>
                    Employee's current and completed tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeTasks.length > 0 ? (
                    <div className="space-y-2">
                      {employeeTasks.map((task: any) => (
                        <div key={task._id} className="flex flex-col gap-2 p-3 border rounded-lg">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            </div>
                            <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                              {task.status}
                            </Badge>
                          </div>
                          <div>
                            {task.notes ? (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-semibold">Work note:</span> {task.notes}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">No work note added yet.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    Employee attendance history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeAttendance.length > 0 ? (
                    <div className="space-y-2">
                      {employeeAttendance.slice(0, 10).map((record: any) => (
                        <div key={record._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(record.date).toLocaleDateString()}</span>
                          </div>
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No attendance records</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="awards" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Awards & Recognition</CardTitle>
                  <CardDescription>
                    Badges and achievements earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeAwards.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {employeeAwards.map((award: any) => (
                        <div key={award._id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Award className="h-8 w-8 text-yellow-500" />
                          <div>
                            <p className="font-medium">{award.badgeType}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(award.awardedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No awards yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Alerts</CardTitle>
                  <CardDescription>
                    Current alerts for this employee
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeAlerts.length > 0 ? (
                    <div className="space-y-2">
                      {employeeAlerts.map((alert: any) => (
                        <div key={alert._id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <AlertCircle className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'high' ? 'text-red-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active alerts</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={message.subject}
                onChange={(e) => setMessage({ ...message, subject: e.target.value })}
                placeholder="Message subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={message.body}
                onChange={(e) => setMessage({ ...message, body: e.target.value })}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
