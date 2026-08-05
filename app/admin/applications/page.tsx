'use client';

import React, { useState, useEffect } from 'react';
import { Search, Star, Eye, MessageSquare, Filter, Mail, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { finishDataLoad, startDataLoad } from '@/lib/silent-load';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';

interface Application {
  _id: string;
  job_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  status: string;
  rating?: number;
  submitted_at: string;
  answers: Record<string, any>;
  notes: Array<{ note: string; type: string; created_at: string }>;
  uploaded_files?: Record<string, string>;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [noteText, setNoteText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
    fetchJobs();
  }, [jobFilter]);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (data.success) setJobs(data.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchApplications = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading);
    try {
      const params = new URLSearchParams();
      if (jobFilter !== 'all') params.append('job_id', jobFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`${API_URL}/api/job-applications?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setApplications(data.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch applications',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading);
    }
  };

  const updateStatus = async (appId: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/api/job-applications/${appId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Status updated successfully' });
        fetchApplications(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const addNote = async (appId: string) => {
    if (!noteText.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/job-applications/${appId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ note: noteText, type: 'private' }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Note added successfully' });
        setNoteText('');
        fetchApplications(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    }
  };

  const rateApplication = async (appId: string, rating: number) => {
    try {
      const response = await fetch(`${API_URL}/api/job-applications/${appId}/rating`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ rating }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Rating updated' });
        fetchApplications(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rating',
        variant: 'destructive',
      });
    }
  };

  const filteredApplications = applications.filter(
    (app) =>
      app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      reviewing: 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      hired: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <PageLoadingSkeleton title="Loading applications" rows={8} />;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Job Applications</h1>
        <p className="text-gray-600 mt-2">Review and manage candidate applications</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{applications.length}</p>
          </CardContent>
        </Card>
        {['pending', 'reviewing', 'shortlisted', 'hired'].map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">{status}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {applications.filter((a) => a.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Filter and search applications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job._id} value={job._id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredApplications.map((app) => (
              <div key={app._id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{app.applicant_name}</h3>
                      <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                      {app.rating && (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < app.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{app.applicant_email}</p>
                    {app.applicant_phone && (
                      <p className="text-sm text-gray-600">{app.applicant_phone}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted: {new Date(app.submitted_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)}>
                          <Eye size={16} className="mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{app.applicant_name}</DialogTitle>
                          <DialogDescription>{app.applicant_email}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Application Details</h4>
                            <div className="space-y-3 bg-gray-50 p-4 rounded">
                              {Array.isArray(app.answers) ? (
                                // Handle array of answer objects
                                app.answers.map((answer: any, idx: number) => (
                                  <div key={idx} className="border-b pb-2 last:border-b-0">
                                    <span className="font-medium text-gray-700">{answer.label}:</span>
                                    <span className="ml-2 text-gray-600">
                                      {Array.isArray(answer.value)
                                        ? answer.value.join(', ')
                                        : String(answer.value || 'N/A')}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                // Handle legacy object format
                                Object.entries(app.answers).map(([key, value]) => (
                                  <div key={key} className="border-b pb-2 last:border-b-0">
                                    <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                                    <span className="ml-2 text-gray-600">
                                      {Array.isArray(value)
                                        ? value.join(', ')
                                        : String(value || 'N/A')}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {app.uploaded_files && Object.keys(app.uploaded_files).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Uploaded Files</h4>
                              <div className="space-y-2 bg-gray-50 p-4 rounded">
                                {Object.entries(app.uploaded_files).map(([fieldId, filePath]) => {
                                  const fileName = filePath.split('/').pop() || 'Download';
                                  const fileExtension = fileName.split('.').pop()?.toLowerCase();
                                  
                                  return (
                                    <div key={fieldId} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                          fileExtension === 'pdf' ? 'bg-red-100 text-red-700' :
                                          ['doc', 'docx'].includes(fileExtension || '') ? 'bg-blue-100 text-blue-700' :
                                          ['xls', 'xlsx'].includes(fileExtension || '') ? 'bg-green-100 text-green-700' :
                                          ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension || '') ? 'bg-purple-100 text-purple-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {fileExtension?.toUpperCase().slice(0, 3)}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{fileName}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(
                                              `${API_URL}/api/job-applications/${app._id}/download/${fieldId}`,
                                              {
                                                headers: {
                                                  Authorization: `Bearer ${getToken()}`,
                                                },
                                              }
                                            );
                                            
                                            if (!response.ok) throw new Error('Download failed');
                                            
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = fileName;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);
                                            
                                            toast({ title: 'Success', description: 'File downloaded successfully' });
                                          } catch (error) {
                                            toast({
                                              title: 'Error',
                                              description: 'Failed to download file',
                                              variant: 'destructive',
                                            });
                                          }
                                        }}
                                      >
                                        Download
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="font-semibold mb-2">Update Status</h4>
                            <Select
                              value={app.status}
                              onValueChange={(value) => updateStatus(app._id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="reviewing">Reviewing</SelectItem>
                                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="hired">Hired</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Rating</h4>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <Button
                                  key={rating}
                                  size="sm"
                                  variant={app.rating === rating ? 'default' : 'outline'}
                                  onClick={() => rateApplication(app._id, rating)}
                                >
                                  <Star size={14} className="mr-1" />
                                  {rating}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Add Note</h4>
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Add a private note..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                rows={2}
                              />
                              <Button onClick={() => addNote(app._id)}>
                                <MessageSquare size={16} />
                              </Button>
                            </div>
                          </div>

                          {app.notes && app.notes.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Notes</h4>
                              <div className="space-y-2">
                                {app.notes.map((note, i) => (
                                  <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                                    <p>{note.note}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(note.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
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
