'use client';

import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Edit2, Trash2, FileUp, AlertCircle, Clock, CheckCircle,
  Calendar, User, Briefcase, DollarSign, Eye, MoreVertical, Download,
  ExternalLink, X, Upload, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { finishDataLoad, startDataLoad } from '@/lib/silent-load';

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

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    contract_type: 'permanent',
    start_date: '',
    end_date: '',
    probation_period_months: 0,
    salary: 0,
    renewal_terms: '',
    assigned_manager: '',
  });

  const [documentForm, setDocumentForm] = useState({
    name: '',
    link: '',
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading);
    try {
      const response = await fetch(`${API_URL}/api/contracts`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      setContracts(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch contracts',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading);
    }
  };

  const handleCreateContract = async () => {
    try {
      const response = await fetch(`${API_URL}/api/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Contract created successfully',
        });
        setIsCreateDialogOpen(false);
        setFormData({
          employee_id: '',
          contract_type: 'permanent',
          start_date: '',
          end_date: '',
          probation_period_months: 0,
          salary: 0,
          renewal_terms: '',
          assigned_manager: '',
        });
        fetchContracts(true);
      } else {
        throw new Error('Failed to create contract');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create contract',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateContract = async () => {
    if (!selectedContract) return;

    try {
      const response = await fetch(`${API_URL}/api/contracts/${selectedContract._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Contract updated successfully',
        });
        setIsEditDialogOpen(false);
        fetchContracts(true);
      } else {
        throw new Error('Failed to update contract');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contract',
        variant: 'destructive',
      });
    }
  };

  const handleRenewContract = async (contractId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/contracts/${contractId}/renew`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Contract renewed successfully',
        });
        fetchContracts(true);
      } else {
        throw new Error('Failed to renew contract');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to renew contract',
        variant: 'destructive',
      });
    }
  };

  const handleTerminateContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to terminate this contract?')) return;

    try {
      const response = await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Contract terminated',
        });
        fetchContracts(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate contract',
        variant: 'destructive',
      });
    }
  };

  const handleAddDocument = async () => {
    if (!selectedContract || !documentForm.name || !documentForm.link) return;

    try {
      const response = await fetch(`${API_URL}/api/contracts/${selectedContract._id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(documentForm),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document added successfully',
        });
        setDocumentForm({ name: '', link: '' });
        fetchContracts(true);
      } else {
        throw new Error('Failed to add document');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocument = async (contractId: string, docName: string) => {
    try {
      const response = await fetch(`${API_URL}/api/contracts/${contractId}/documents/${docName}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document removed',
        });
        fetchContracts(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove document',
        variant: 'destructive',
      });
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      contract.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || contract.contract_type === filterType;
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const contractsExpiringIn30 = contracts.filter(c => {
    const endDate = new Date(c.end_date);
    const today = new Date();
    const daysLeft = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 30 && daysLeft >= 0;
  });

  const probationEnding = contracts.filter(c => {
    const probationEnd = new Date(c.probation_end_date);
    const today = new Date();
    const daysLeft = Math.floor((probationEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 30 && daysLeft >= 0;
  });

  const contractsByType = {
    permanent: contracts.filter(c => c.contract_type === 'permanent').length,
    fixed_term: contracts.filter(c => c.contract_type === 'fixed_term').length,
    intern: contracts.filter(c => c.contract_type === 'intern').length,
    consultant: contracts.filter(c => c.contract_type === 'consultant').length,
  };

  if (loading) return <PageLoadingSkeleton title="Loading contracts" rows={8} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Contract Management</h1>
        <p className="text-muted-foreground">
          Manage employee contracts with alerts and document tracking
        </p>
      </div>

      {/* Dashboard Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
            <p className="text-xs text-muted-foreground">Active contracts</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{contractsExpiringIn30.length}</div>
            <p className="text-xs text-orange-600">Next 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Probation Ending</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{probationEnding.length}</div>
            <p className="text-xs text-blue-600">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Permanent:</span>
                <span className="font-semibold">{contractsByType.permanent}</span>
              </div>
              <div className="flex justify-between">
                <span>Fixed-term:</span>
                <span className="font-semibold">{contractsByType.fixed_term}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {contractsExpiringIn30.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Contracts Expiring in 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contractsExpiringIn30.slice(0, 5).map(contract => (
                <div key={contract._id} className="flex items-center justify-between p-2 bg-white rounded">
                  <div>
                    <p className="font-medium">{contract.employee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(contract.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleRenewContract(contract._id)}>
                    Renew
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Probation Ending Alert */}
      {probationEnding.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Calendar className="h-5 w-5" />
              Probation Ending Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {probationEnding.slice(0, 5).map(contract => (
                <div key={contract._id} className="flex items-center justify-between p-2 bg-white rounded">
                  <div>
                    <p className="font-medium">{contract.employee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Probation ends: {new Date(contract.probation_end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">Confirm Status</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="fixed_term">Fixed-term</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Contract</DialogTitle>
                    <DialogDescription>
                      Add a new employment contract with probation and renewal terms
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee_id">Employee ID *</Label>
                      <Input
                        id="employee_id"
                        value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        placeholder="EMP001"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contract_type">Contract Type *</Label>
                        <Select
                          value={formData.contract_type}
                          onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="permanent">Permanent</SelectItem>
                            <SelectItem value="fixed_term">Fixed-term</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                            <SelectItem value="consultant">Consultant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="probation_period_months">Probation Period (months)</Label>
                        <Input
                          id="probation_period_months"
                          type="number"
                          value={formData.probation_period_months}
                          onChange={(e) => setFormData({ ...formData, probation_period_months: parseInt(e.target.value) })}
                          placeholder="3"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date (if applicable)</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary (Admin Only)</Label>
                      <Input
                        id="salary"
                        type="number"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="renewal_terms">Renewal Terms</Label>
                      <Textarea
                        id="renewal_terms"
                        value={formData.renewal_terms}
                        onChange={(e) => setFormData({ ...formData, renewal_terms: e.target.value })}
                        placeholder="Specify renewal conditions, salary review percentage, etc."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assigned_manager">Assigned Manager</Label>
                      <Input
                        id="assigned_manager"
                        value={formData.assigned_manager}
                        onChange={(e) => setFormData({ ...formData, assigned_manager: e.target.value })}
                        placeholder="Manager name or ID"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateContract}>Create Contract</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredContracts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No contracts found</p>
            ) : (
              filteredContracts.map((contract) => (
                <Card key={contract._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{contract.employee_name}</h3>
                          <Badge variant="outline">{contract.employee_id}</Badge>
                          <Badge variant={
                            contract.status === 'active' ? 'default' :
                            contract.status === 'expiring' ? 'destructive' : 'secondary'
                          }>
                            {contract.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{contract.contract_type.replace('_', '-')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Start Date</p>
                            <p className="font-medium">{new Date(contract.start_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">End Date</p>
                            <p className="font-medium">{contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Ongoing'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Probation</p>
                            <p className="font-medium">{contract.probation_period_months} months</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Salary:</span>
                            <span className="font-medium">${contract.salary.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Manager:</span>
                            <span className="font-medium">{contract.assigned_manager || 'Unassigned'}</span>
                          </div>
                        </div>
                        {contract.documents && contract.documents.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <FileUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              {contract.documents.length} document(s) uploaded
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedContract(contract);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
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
                            <DropdownMenuItem onClick={() => {
                              setSelectedContract(contract);
                              setFormData({
                                employee_id: contract.employee_id,
                                contract_type: contract.contract_type,
                                start_date: contract.start_date,
                                end_date: contract.end_date,
                                probation_period_months: contract.probation_period_months,
                                salary: contract.salary,
                                renewal_terms: contract.renewal_terms,
                                assigned_manager: contract.assigned_manager,
                              });
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Contract
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedContract(contract);
                              setIsDocumentsDialogOpen(true);
                            }}>
                              <FileUp className="h-4 w-4 mr-2" />
                              Manage Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRenewContract(contract._id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Renew Contract
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleTerminateContract(contract._id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Terminate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Contract Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContract?.employee_name}</DialogTitle>
            <DialogDescription>
              Contract Details & Documents
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contract Type</p>
                      <p className="font-medium capitalize">{selectedContract.contract_type.replace('_', '-')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={
                        selectedContract.status === 'active' ? 'default' :
                        selectedContract.status === 'expiring' ? 'destructive' : 'secondary'
                      }>
                        {selectedContract.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{new Date(selectedContract.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{selectedContract.end_date ? new Date(selectedContract.end_date).toLocaleDateString() : 'Ongoing'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Probation Period</p>
                    <p className="font-medium">{selectedContract.probation_period_months} months (ends {new Date(selectedContract.probation_end_date).toLocaleDateString()})</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Salary</p>
                    <p className="font-medium">${selectedContract.salary.toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Renewal Terms</p>
                    <p className="font-medium whitespace-pre-wrap">{selectedContract.renewal_terms || 'No renewal terms specified'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Manager</p>
                    <p className="font-medium">{selectedContract.assigned_manager || 'Unassigned'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                {selectedContract.documents && selectedContract.documents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedContract.documents.map((doc, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded by {doc.uploaded_by} on {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={doc.link} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open
                              </Button>
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(selectedContract._id, doc.name)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No documents uploaded yet</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Contract Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
            <DialogDescription>
              Update contract details and terms
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="fixed_term">Fixed-term</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Probation Period (months)</Label>
              <Input
                type="number"
                value={formData.probation_period_months}
                onChange={(e) => setFormData({ ...formData, probation_period_months: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Salary</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal Terms</Label>
              <Textarea
                value={formData.renewal_terms}
                onChange={(e) => setFormData({ ...formData, renewal_terms: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Manager</Label>
              <Input
                value={formData.assigned_manager}
                onChange={(e) => setFormData({ ...formData, assigned_manager: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContract}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Management Dialog */}
      <Dialog open={isDocumentsDialogOpen} onOpenChange={setIsDocumentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Contract Documents</DialogTitle>
            <DialogDescription>
              Upload document links (National ID, Passport, Degree, etc.)
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                {selectedContract.documents && selectedContract.documents.map((doc, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          {doc.link}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDocument(selectedContract._id, doc.name)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Add New Document</h4>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="doc-name">Document Name (e.g., National ID, Passport, Degree)</Label>
                    <Input
                      id="doc-name"
                      placeholder="National ID"
                      value={documentForm.name}
                      onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-link">Document Link (URL)</Label>
                    <Input
                      id="doc-link"
                      placeholder="https://drive.google.com/file/d/..."
                      value={documentForm.link}
                      onChange={(e) => setDocumentForm({ ...documentForm, link: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleAddDocument} disabled={!documentForm.name || !documentForm.link}>
              <Upload className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
