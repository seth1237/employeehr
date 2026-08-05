'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar, Eye, Download, Clock, CheckCircle, AlertCircle,
  FileText, ExternalLink, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

interface Contract {
  _id: string;
  employee_id: string;
  employee_name: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  probation_period_months: number;
  probation_end_date: string;
  salary: number;
  renewal_terms: string;
  status: string;
  assigned_manager: string;
  documents: Array<{
    name: string;
    link: string;
    uploaded_by: string;
    uploaded_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export default function EmployeeContractsPage() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployeeContract();
  }, []);

  const fetchEmployeeContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/contracts/my`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      setContract(data.data || null);
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch contract',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const daysLeft = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const calculateProbationDaysRemaining = (probationEndDate: string) => {
    const end = new Date(probationEndDate);
    const today = new Date();
    const daysLeft = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your contract...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Contract</h1>
          <p className="text-muted-foreground">View your employment contract details</p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No contract assigned yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact your HR administrator to set up your employment contract.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = contract.end_date ? calculateDaysRemaining(contract.end_date) : null;
  const probationDaysRemaining = calculateProbationDaysRemaining(contract.probation_end_date);
  const isProbationActive = probationDaysRemaining > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Contract</h1>
        <p className="text-muted-foreground">
          View and download your employment contract details
        </p>
      </div>

      {/* Contract Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contract Type</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {contract.contract_type.replace('_', '-')}
            </div>
            <Badge variant="outline" className="mt-2">
              {contract.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contract Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {contract.end_date ? (
                daysRemaining! >= 0 ? (
                  daysRemaining! <= 30 ? (
                    <span className="text-orange-600">Expiring Soon</span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )
                ) : (
                  <span className="text-red-600">Expired</span>
                )
              ) : (
                <span className="text-green-600">Active</span>
              )}
            </p>
            {daysRemaining !== null && daysRemaining >= 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {daysRemaining} days remaining
              </p>
            )}
          </CardContent>
        </Card>

        {isProbationActive && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Probation Period</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {probationDaysRemaining} days
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Ends {new Date(contract.probation_end_date).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Expiring Soon Alert */}
      {daysRemaining !== null && daysRemaining <= 30 && daysRemaining >= 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Contract Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent className="text-orange-900">
            <p>
              Your contract will expire on {new Date(contract.end_date!).toLocaleDateString()}.
              Please contact your HR administrator or line manager about renewal options.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Contract Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Contract Type</p>
                  <p className="text-lg font-semibold capitalize">
                    {contract.contract_type.replace('_', '-')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={
                    contract.status === 'active' ? 'default' :
                    contract.status === 'expiring' ? 'destructive' : 'secondary'
                  }>
                    {contract.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-semibold">
                      {new Date(contract.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {contract.end_date ? 'End Date' : 'Status'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-semibold">
                      {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Ongoing Contract'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Probation Period</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Duration</p>
                    <p className="text-lg font-semibold">
                      {contract.probation_period_months} month{contract.probation_period_months !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ends On</p>
                    <p className="text-lg font-semibold">
                      {new Date(contract.probation_end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isProbationActive && (
                  <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    You are currently in probation period
                  </p>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Reporting Manager</h3>
                <p className="text-lg font-semibold">
                  {contract.assigned_manager || 'To be assigned'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="terms" className="space-y-6 pt-6">
              <div>
                <h3 className="font-semibold mb-3">Renewal Terms</h3>
                {contract.renewal_terms ? (
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {contract.renewal_terms}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No renewal terms specified</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Salary information is confidential and visible only to you and HR administrators.
                  For salary-related inquiries, please contact your HR department directly.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 pt-6">
              <div>
                <h3 className="font-semibold mb-4">Contract Documents</h3>
                {contract.documents && contract.documents.length > 0 ? (
                  <div className="space-y-3">
                    {contract.documents.map((doc, idx) => (
                      <Card key={idx} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded by {doc.uploaded_by} • {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{doc.name}</DialogTitle>
                              </DialogHeader>
                              <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                                <a
                                  href={doc.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-5 w-5" />
                                  Open Document in New Tab
                                </a>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto opacity-30 mb-2" />
                    <p>No documents have been uploaded yet</p>
                    <p className="text-sm mt-1">Contact your HR administrator if you need copies of your documents</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <Lock className="h-4 w-4" />
            Privacy & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p>✓ You can view all contract details</p>
          <p>✓ You can view and download all documents</p>
          <p>✗ You cannot edit contract terms</p>
          <p>✗ You cannot delete or modify documents</p>
          <p>✗ Salary information is only visible to HR administrators</p>
        </CardContent>
      </Card>
    </div>
  );
}
