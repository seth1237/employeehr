'use client';

import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

interface ContractAlert {
  _id: string;
  employee_id: string;
  contract_type: string;
  contract_name: string;
  expiry_date: string;
  status: string;
  days_remaining: number;
  employee_name?: string;
  created_at: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleRenewal = async (contractId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/contracts/${contractId}/renew`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to mark as renewed');

      toast({
        title: 'Success',
        description: 'Contract marked as renewed',
      });
      fetchContracts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contract',
        variant: 'destructive',
      });
    }
  };

  const filteredContracts = contracts.filter(
    (contract) =>
      contract.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string, daysRemaining: number) => {
    if (status === 'renewed') return 'bg-green-100 text-green-800';
    if (daysRemaining <= 7) return 'bg-red-100 text-red-800';
    if (daysRemaining <= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusLabel = (status: string, daysRemaining: number) => {
    if (status === 'renewed') return 'Renewed';
    if (daysRemaining <= 7) return 'Expiring Soon';
    if (daysRemaining <= 30) return 'Expires Soon';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading contracts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contract Management</h1>
        <p className="text-gray-600 mt-2">Track and manage employee contracts and renewals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contracts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon (≤30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {contracts.filter((c) => c.days_remaining <= 30 && c.days_remaining > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical (≤7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {contracts.filter((c) => c.days_remaining <= 7).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Renewed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {contracts.filter((c) => c.status === 'renewed').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
          <CardDescription>Monitor all contracts and their expiration status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <Input
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="space-y-3">
            {filteredContracts.map((contract) => {
              const statusLabel = getStatusLabel(contract.status, contract.days_remaining);
              const statusColor = getStatusColor(contract.status, contract.days_remaining);
              const isExpired = contract.days_remaining < 0;
              const isExpiringSoon = contract.days_remaining <= 7;

              return (
                <div
                  key={contract._id}
                  className={`p-4 border rounded-lg hover:bg-gray-50 ${
                    isExpiringSoon && contract.status !== 'renewed'
                      ? 'border-yellow-300 bg-yellow-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isExpiringSoon && contract.status !== 'renewed' ? (
                          <AlertTriangle size={20} className="text-yellow-600" />
                        ) : contract.status === 'renewed' ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Clock size={20} className="text-blue-600" />
                        )}
                        <div>
                          <h3 className="font-semibold">{contract.contract_name}</h3>
                          <p className="text-sm text-gray-500">{contract.employee_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3 text-sm">
                        <Badge className={statusColor}>{statusLabel}</Badge>
                        <span className="text-gray-600">
                          Type: {contract.contract_type}
                        </span>
                        <span className="text-gray-600">
                          Expires: {new Date(contract.expiry_date).toLocaleDateString()}
                        </span>
                        {!isExpired && contract.status !== 'renewed' && (
                          <span
                            className={`font-medium ${
                              isExpiringSoon ? 'text-red-600' : 'text-gray-600'
                            }`}
                          >
                            {contract.days_remaining} days left
                          </span>
                        )}
                      </div>
                    </div>

                    {contract.status !== 'renewed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRenewal(contract._id)}
                      >
                        Mark Renewed
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
