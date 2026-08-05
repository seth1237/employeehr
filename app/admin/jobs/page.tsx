'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, ExternalLink, Eye, Copy, 
  Briefcase, MapPin, Calendar, DollarSign, CheckCircle, XCircle, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { finishDataLoad, startDataLoad } from '@/lib/silent-load';

interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: string[];
  application_deadline?: string;
  status: string;
  share_link: string;
  views: number;
  applications_count: number;
  created_at: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    employment_type: 'full-time',
    description: '',
    requirements: '',
    responsibilities: '',
    salary_min: '',
    salary_max: '',
    benefits: '',
    application_deadline: '',
    status: 'draft',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading);
    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      setJobs(data.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading);
    }
  };

  const handleAddJob = async () => {
    if (!formData.title || !formData.department || !formData.location || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const jobData = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        employment_type: formData.employment_type,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
        salary_range: formData.salary_min && formData.salary_max ? {
          min: Number(formData.salary_min),
          max: Number(formData.salary_max),
          currency: 'KES',
        } : undefined,
        benefits: formData.benefits.split('\n').filter(b => b.trim()),
        application_deadline: formData.application_deadline || undefined,
        status: formData.status,
      };

      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(jobData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Job created successfully',
        });
        setShareUrl(data.shareUrl);
        setFormData({
          title: '',
          department: '',
          location: '',
          employment_type: 'full-time',
          description: '',
          requirements: '',
          responsibilities: '',
          salary_min: '',
          salary_max: '',
          benefits: '',
          application_deadline: '',
          status: 'draft',
        });
        fetchJobs(true);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Job deleted successfully',
        });
        fetchJobs(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete job',
        variant: 'destructive',
      });
    }
  };

  const copyShareLink = (shareLink: string) => {
    const url = `https://hr.codewithseth.co.ke/careers/${shareLink}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Share link copied to clipboard',
    });
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      filled: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <PageLoadingSkeleton title="Loading jobs" rows={8} />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Postings</h1>
          <p className="text-gray-600 mt-2">Manage job openings and vacancies</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={20} />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>Fill in the job details below</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g. Software Engineer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Department *</Label>
                  <Input
                    placeholder="e.g. Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location *</Label>
                  <Input
                    placeholder="e.g. Nairobi, Kenya"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select value={formData.employment_type} onValueChange={(value) => setFormData({ ...formData, employment_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description *</Label>
                <Textarea
                  placeholder="Job description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label>Requirements (one per line)</Label>
                <Textarea
                  placeholder="- Bachelor's degree in Computer Science&#10;- 3+ years experience..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label>Responsibilities (one per line)</Label>
                <Textarea
                  placeholder="- Develop software applications&#10;- Collaborate with team..."
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Salary Min (KES)</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Salary Max (KES)</Label>
                  <Input
                    type="number"
                    placeholder="100000"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Benefits (one per line)</Label>
                <Textarea
                  placeholder="- Health insurance&#10;- Flexible hours..."
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Application Deadline</Label>
                  <Input
                    type="date"
                    value={formData.application_deadline}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddJob}>Create Job</Button>
              </div>

              {shareUrl && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 mb-2">Job created! Share this link:</p>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="bg-white" />
                    <Button size="sm" onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast({ title: 'Copied!', description: 'Link copied to clipboard' });
                    }}>
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{jobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {jobs.filter((j) => j.status === 'open').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {jobs.reduce((sum, job) => sum + job.views, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {jobs.reduce((sum, job) => sum + job.applications_count, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>Manage and track job postings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase size={20} className="text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <p className="text-sm text-gray-500">{job.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {job.views} views
                      </span>
                      <span>{job.applications_count} applications</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyShareLink(job.share_link)}
                      >
                        <Copy size={14} className="mr-1" />
                        Copy Link
                      </Button>
                      <a
                        href={`https://hr.codewithseth.co.ke/careers/${job.share_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline">
                          <ExternalLink size={14} className="mr-1" />
                          View Public
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/admin/jobs/${job._id}/form-builder`}
                      >
                        <FileText size={14} className="mr-1" />
                        Build Form
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteJob(job._id)}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
