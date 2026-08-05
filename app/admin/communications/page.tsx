'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Send, Check, AlertCircle, Briefcase, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { TableSkeleton } from '@/components/admin/ui/page-states';

interface Job {
  _id: string;
  title: string;
  company_name: string;
}

interface Applicant {
  _id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  notes?: Array<{ note: string; type: string }>;
}

interface SentEmail {
  _id: string;
  subject: string;
  body: string;
  sent_count: number;
  failed_count: number;
  recipient_count: number;
  recipient_emails: string[];
  failed_emails?: string[];
  job_id: string;
  created_at: string;
  include_notes: boolean;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

const statusOptions = ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'];

export default function CommunicationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedApplicants, setSelectedApplicants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingSentEmails, setLoadingSentEmails] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate>({
    subject: '',
    body: '',
  });
  const [includeNotes, setIncludeNotes] = useState(true);
  const [sentResult, setSentResult] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
    fetchSentEmails();
  }, []);

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

  const fetchSentEmails = async (jobId?: string) => {
    try {
      setLoadingSentEmails(true);
      const params = new URLSearchParams();
      if (jobId) params.append('job_id', jobId);
      const response = await fetch(`${API_URL}/api/communications/sent?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (data.success) setSentEmails(data.data || []);
    } catch (error) {
      console.error('Error fetching sent emails:', error);
    } finally {
      setLoadingSentEmails(false);
    }
  };

  const fetchApplicants = async (jobId: string, status: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/communications/applicants?job_id=${jobId}&status=${status}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await response.json();
      if (data.success) {
        setApplicants(data.data || []);
        setSelectedApplicants(new Set()); // Reset selection
      }
    } catch (error) {
      console.error('Error fetching applicants:', error);
      toast({ title: 'Error', description: 'Failed to load applicants', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleJobChange = (jobId: string) => {
    setSelectedJob(jobId);
    setSelectedStatus('');
    setApplicants([]);
    if (jobId) {
      fetchSentEmails(jobId);
    }
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    if (selectedJob && status) {
      fetchApplicants(selectedJob, status);
    }
  };

  const toggleApplicantSelection = (applicantId: string) => {
    const newSelection = new Set(selectedApplicants);
    if (newSelection.has(applicantId)) {
      newSelection.delete(applicantId);
    } else {
      newSelection.add(applicantId);
    }
    setSelectedApplicants(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedApplicants.size === applicants.length) {
      setSelectedApplicants(new Set());
    } else {
      setSelectedApplicants(new Set(applicants.map((a) => a._id)));
    }
  };

  const handleSendEmails = async () => {
    if (selectedApplicants.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one applicant', variant: 'destructive' });
      return;
    }

    if (!template.subject.trim() || !template.body.trim()) {
      toast({ title: 'Error', description: 'Please fill in subject and body', variant: 'destructive' });
      return;
    }

    setSendingEmails(true);
    try {
      const response = await fetch(`${API_URL}/api/communications/send-bulk-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          job_id: selectedJob,
          applicant_ids: Array.from(selectedApplicants),
          subject: template.subject,
          body: template.body,
          include_notes: includeNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSentResult(data.data);
        setShowTemplateDialog(false);
        toast({
          title: 'Success',
          description: `Emails sent: ${data.data.sentCount}, Failed: ${data.data.failedCount}`,
        });
        // Reset form
        setTemplate({ subject: '', body: '' });
        setSelectedApplicants(new Set());
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send emails',
        variant: 'destructive',
      });
    } finally {
      setSendingEmails(false);
    }
  };

  const selectedJobTitle = jobs.find((j) => j._id === selectedJob)?.title || '';

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Communications
        </h1>
        <p className="text-gray-600 mt-2">Send bulk emails to applicants and track history</p>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Compose & Send</TabsTrigger>
          <TabsTrigger value="history">Sent History</TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          {sentResult && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900">Emails Sent Successfully</h3>
                    <p className="text-sm text-green-800 mt-1">
                      {sentResult.sentCount} email(s) sent successfully
                      {sentResult.failedCount > 0 && `, ${sentResult.failedCount} failed`}
                    </p>
                    {sentResult.failedEmails && sentResult.failedEmails.length > 0 && (
                      <div className="mt-2 text-xs text-green-700">
                        <p className="font-medium">Failed emails:</p>
                        <ul className="list-disc list-inside">{sentResult.failedEmails.map((e: string) => <li key={e}>{e}</li>)}</ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

      <Card>
        <CardHeader>
          <CardTitle>Select Recipients</CardTitle>
          <CardDescription>Choose a job and filter applicants by status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Job Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Job Position</label>
            <Select value={selectedJob} onValueChange={handleJobChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job._id} value={job._id}>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {job.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          {selectedJob && (
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="capitalize">{status}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Applicants List */}
          {selectedJob && selectedStatus && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">
                  Applicants ({applicants.length})
                </label>
                {applicants.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleSelectAll}
                  >
                    {selectedApplicants.size === applicants.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              {loading ? (
                <TableSkeleton rows={8} />
              ) : applicants.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600 mt-2">No applicants found for this status</p>
                </div>
              ) : (
                <div className="space-y-2 border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {applicants.map((applicant) => (
                    <div
                      key={applicant._id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        checked={selectedApplicants.has(applicant._id)}
                        onCheckedChange={() => toggleApplicantSelection(applicant._id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{applicant.applicant_name}</p>
                        <p className="text-xs text-gray-600">{applicant.applicant_email}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{applicant.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {selectedApplicants.size > 0 && (
                <Button
                  className="w-full mt-4"
                  onClick={() => setShowTemplateDialog(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Compose Email ({selectedApplicants.size} selected)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>
              Create an email template to send to {selectedApplicants.size} selected applicant(s) for {selectedJobTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Subject */}
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input
                placeholder="e.g., You are invited for an interview!"
                value={template.subject}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Available variables: {'{{applicant_name}}'}, {'{{job_title}}'}, {'{{company_name}}'}</p>
            </div>

            {/* Body */}
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                placeholder="Dear {{applicant_name}},

We are pleased to inform you that your application for the {{job_title}} position at {{company_name}} has been selected for the next stage.

We would like to invite you for an interview...

Best regards,
Hiring Team"
                value={template.body}
                onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                rows={10}
              />
              <p className="text-xs text-gray-500 mt-1">Public HR comments will be appended to the email automatically if enabled below.</p>
            </div>

            {/* Include Notes Toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={includeNotes}
                onCheckedChange={(checked) => setIncludeNotes(checked as boolean)}
              />
              <label className="text-sm font-medium cursor-pointer">
                Include public HR notes in the email
              </label>
            </div>

            {/* Preview */}
            <div>
              <label className="text-sm font-medium mb-2 block">Preview (first applicant)</label>
              <div className="bg-gray-50 p-4 rounded border text-sm space-y-2 max-h-48 overflow-y-auto">
                <p className="font-semibold">{template.subject || '(no subject)'}</p>
                <div className="border-t pt-2 mt-2 whitespace-pre-wrap text-xs">
                  {template.body
                    .replace(/{{applicant_name}}/g, applicants[0]?.applicant_name || 'Applicant Name')
                    .replace(/{{job_title}}/g, selectedJobTitle || 'Job Title')
                    .replace(/{{company_name}}/g, jobs.find((j) => j._id === selectedJob)?.company_name || 'Company Name')
                    || '(empty message)'}
                </div>
              </div>
            </div>

            {/* Send Button */}
            <div className="flex gap-2 justify-end pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowTemplateDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleSendEmails} 
                disabled={sendingEmails}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingEmails ? 'Sending...' : `Send to ${selectedApplicants.size} Applicant${selectedApplicants.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Sent Emails History
              </CardTitle>
              <CardDescription>View all bulk emails sent from your organization</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSentEmails ? (
                <TableSkeleton rows={8} />
              ) : sentEmails.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded">
                  <Mail className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600 mt-2">No sent emails yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentEmails.map((email) => (
                    <div key={email._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{email.subject}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(email.created_at).toLocaleString()}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Sent: {email.sent_count}
                            </Badge>
                            {email.failed_count > 0 && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Failed: {email.failed_count}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              Recipients: {email.recipient_count}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            <p className="font-medium">Recipients ({email.recipient_emails.length}):</p>
                            <p className="truncate">{email.recipient_emails.join(', ')}</p>
                          </div>
                          {email.failed_emails && email.failed_emails.length > 0 && (
                            <div className="text-xs text-red-500 mt-2">
                              <p className="font-medium">Failed emails:</p>
                              <p className="truncate">{email.failed_emails.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
