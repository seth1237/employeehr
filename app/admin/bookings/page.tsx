'use client';

import React, { useState, useEffect, useRef } from 'react';
import { startDataLoad, finishDataLoad, type SilentLoadOptions } from '@/lib/silent-load';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';
import {
  Check,
  X,
  Clock,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  History,
  Package,
  Building2,
  Share2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

// Types
interface ResourceProduct {
  _id: string;
  company_id: string;
  name: string;
  description: string;
  category: string;
  quantity_total: number;
  quantity_available: number;
  purchase_date: string;
  cost: number;
  status: 'active' | 'inactive' | 'damaged';
  created_at: string;
}

interface Department {
  _id: string;
  company_id: string;
  name: string;
  description: string;
  manager_id: string;
  manager_name?: string;
  created_at: string;
}

interface ProductAllocation {
  _id: string;
  product_id: string;
  employee_id: string;
  department_id: string;
  company_id: string;
  allocation_date: string;
  return_date?: string;
  employee_remark?: string;
  condition_on_return?: 'good' | 'damaged' | 'lost';
  admin_notes?: string;
  product_name?: string;
  employee_name?: string;
  department_name?: string;
  is_returned?: boolean;
}

interface ResourceBooking {
  _id: string;
  employee_id: string;
  resource_type: string;
  status: string;
  booking_date: string;
  employee_name?: string;
  approval_date?: string;
}

export default function ResourceRegistryPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'departments' | 'allocations' | 'history' | 'bookings'>('products');
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [products, setProducts] = useState<ResourceProduct[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allocations, setAllocations] = useState<ProductAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  // Form states
  const [showProductForm, setShowProductForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [selectedAllocation, setSelectedAllocation] = useState<ProductAllocation | null>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData({ silent: initialLoadDone.current });
    initialLoadDone.current = true;
  }, [activeTab]);

  const fetchAllData = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch products
      try {
        const productsRes = await fetch(`${API_URL}/api/resources/products`, { headers });
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.log('Products endpoint not yet available');
      }

      // Fetch departments
      try {
        const deptRes = await fetch(`${API_URL}/api/resources/departments`, { headers });
        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartments(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.log('Departments endpoint not yet available');
      }

      // Fetch allocations
      try {
        const allocRes = await fetch(`${API_URL}/api/resources/allocations`, { headers });
        if (allocRes.ok) {
          const data = await allocRes.json();
          setAllocations(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.log('Allocations endpoint not yet available');
      }

      // Fetch employees for allocation form
      try {
        const empRes = await fetch(`${API_URL}/api/users`, { headers });
        if (empRes.ok) {
          const data = await empRes.json();
          setAllEmployees(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.log('Employees endpoint not yet available');
      }

      // Fetch bookings
      try {
        const bookRes = await fetch(`${API_URL}/api/bookings`, { headers });
        if (bookRes.ok) {
          const data = await bookRes.json();
          setBookings(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.log('Bookings endpoint not yet available');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing);
    }
  };

  // ====== PRODUCTS FUNCTIONS ======
  const handleAddProduct = async () => {
    if (!formData.name || !formData.category || !formData.quantity_total) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/resources/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity_available: formData.quantity_total,
        }),
      });

      if (!response.ok) throw new Error('Failed to add product');

      toast({ title: 'Success', description: 'Product added successfully' });
      setShowProductForm(false);
      setFormData({});
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add product',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`${API_URL}/api/resources/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!response.ok) throw new Error('Failed to delete product');

      toast({ title: 'Success', description: 'Product deleted' });
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  // ====== DEPARTMENTS FUNCTIONS ======
  const handleAddDepartment = async () => {
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Please enter department name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/resources/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to add department');

      toast({ title: 'Success', description: 'Department added successfully' });
      setShowDepartmentForm(false);
      setFormData({});
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add department',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const response = await fetch(`${API_URL}/api/resources/departments/${deptId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!response.ok) throw new Error('Failed to delete department');

      toast({ title: 'Success', description: 'Department deleted' });
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete department',
        variant: 'destructive',
      });
    }
  };

  // ====== ALLOCATIONS FUNCTIONS ======
  const handleAllocateProduct = async () => {
    if (!formData.product_id || !formData.employee_id || !formData.department_id) {
      toast({
        title: 'Error',
        description: 'Please select all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/resources/allocations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          allocation_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to allocate product');

      toast({ title: 'Success', description: 'Product allocated successfully' });
      setShowAllocationForm(false);
      setFormData({});
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to allocate product',
        variant: 'destructive',
      });
    }
  };

  const handleReturnProduct = async () => {
    if (!selectedAllocation || !formData.condition_on_return) {
      toast({
        title: 'Error',
        description: 'Please select condition and add remarks if needed',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/resources/allocations/${selectedAllocation._id}/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          return_date: new Date().toISOString(),
          condition_on_return: formData.condition_on_return,
          employee_remark: formData.employee_remark || '',
        }),
      });

      if (!response.ok) throw new Error('Failed to return product');

      toast({ title: 'Success', description: 'Product returned successfully' });
      setShowReturnForm(false);
      setSelectedAllocation(null);
      setFormData({});
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to return product',
        variant: 'destructive',
      });
    }
  };

  // ====== BOOKING FUNCTIONS ======
  const handleApproveBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to approve booking');

      toast({ title: 'Success', description: 'Booking approved' });
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve booking',
        variant: 'destructive',
      });
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to reject booking');

      toast({ title: 'Success', description: 'Booking rejected' });
      fetchAllData({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject booking',
        variant: 'destructive',
      });
    }
  };

  // ====== FILTER FUNCTIONS ======
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAllocations = allocations.filter((a) => {
    const matchesSearch =
      a.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || (filterStatus === 'active' ? !a.is_returned : a.is_returned);
    return matchesSearch && matchesFilter;
  });

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || b.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <PageLoadingSkeleton title="Loading Resource Registry" rows={8} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Registry</h1>
        <p className="text-gray-600 mt-2">Manage company assets, departments, and product allocations</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        {(['products', 'departments', 'allocations', 'history', 'bookings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearchTerm('');
              setFilterStatus('all');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'products' && <Package className="inline mr-2" size={18} />}
            {tab === 'departments' && <Building2 className="inline mr-2" size={18} />}
            {tab === 'allocations' && <Share2 className="inline mr-2" size={18} />}
            {tab === 'history' && <History className="inline mr-2" size={18} />}
            {tab === 'bookings' && <Clock className="inline mr-2" size={18} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ===== PRODUCTS TAB ===== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setShowProductForm(!showProductForm)} className="gap-2">
              <Plus size={18} />
              Add Product
            </Button>
          </div>

          {showProductForm && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Add New Product/Asset</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Category (e.g., Laptop, Chair, Car, Equipment)"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <input
                  type="number"
                  placeholder="Total Quantity"
                  value={formData.quantity_total || ''}
                  onChange={(e) => setFormData({ ...formData, quantity_total: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <input
                  type="date"
                  value={formData.purchase_date || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddProduct} className="flex-1">
                    Save Product
                  </Button>
                  <Button onClick={() => setShowProductForm(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product._id} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge className="mt-2">{product.category}</Badge>
                    </div>
                    <Badge
                      className={
                        product.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {product.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{product.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Qty:</span>
                      <span className="font-semibold">{product.quantity_total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Available:</span>
                      <span className="font-semibold text-green-600">{product.quantity_available}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cost:</span>
                      <span className="font-semibold">${product.cost.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeleteProduct(product._id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">No products found. Add one to get started!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== DEPARTMENTS TAB ===== */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setShowDepartmentForm(!showDepartmentForm)} className="gap-2">
              <Plus size={18} />
              Add Department
            </Button>
          </div>

          {showDepartmentForm && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Add New Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="text"
                  placeholder="Department Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <select
                  value={formData.manager_id || ''}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ color: 'black', backgroundColor: 'white' }}
                >
                  <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select Department Manager</option>
                  {allEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id} style={{ color: 'black', backgroundColor: 'white' }}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button onClick={handleAddDepartment} className="flex-1">
                    Save Department
                  </Button>
                  <Button onClick={() => setShowDepartmentForm(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Departments List */}
          <div className="grid gap-4">
            {filteredDepartments.map((dept) => (
              <Card key={dept._id} className="hover:shadow-md transition">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{dept.name}</CardTitle>
                      <CardDescription>{dept.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDepartment(dept._id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Manager: {dept.manager_name || 'Not assigned'}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDepartments.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">No departments found. Create one to get started!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== ALLOCATIONS TAB ===== */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search allocations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
              style={{ color: 'black', backgroundColor: 'white' }}
            >
              <option value="all" style={{ color: 'black', backgroundColor: 'white' }}>All Status</option>
              <option value="active" style={{ color: 'black', backgroundColor: 'white' }}>Active</option>
              <option value="returned" style={{ color: 'black', backgroundColor: 'white' }}>Returned</option>
            </select>
            <Button onClick={() => setShowAllocationForm(!showAllocationForm)} className="gap-2">
              <Plus size={18} />
              Allocate Product
            </Button>
          </div>

          {showAllocationForm && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Allocate Product to Employee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  value={formData.product_id || ''}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ color: 'black', backgroundColor: 'white' }}
                >
                  <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select Product</option>
                  {products
                    .filter((p) => p.quantity_available > 0)
                    .map((p) => (
                      <option key={p._id} value={p._id} style={{ color: 'black', backgroundColor: 'white' }}>
                        {p.name} ({p.quantity_available} available)
                      </option>
                    ))}
                </select>
                <select
                  value={formData.department_id || ''}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ color: 'black', backgroundColor: 'white' }}
                >
                  <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id} style={{ color: 'black', backgroundColor: 'white' }}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ color: 'black', backgroundColor: 'white' }}
                >
                  <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select Employee</option>
                  {allEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id} style={{ color: 'black', backgroundColor: 'white' }}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button onClick={handleAllocateProduct} className="flex-1">
                    Allocate
                  </Button>
                  <Button onClick={() => setShowAllocationForm(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Allocations Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Allocated Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAllocations.map((alloc) => (
                      <tr key={alloc._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{alloc.product_name}</td>
                        <td className="px-4 py-3">{alloc.employee_name}</td>
                        <td className="px-4 py-3">{alloc.department_name}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(alloc.allocation_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={alloc.is_returned ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}>
                            {alloc.is_returned ? 'Returned' : 'Active'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {!alloc.is_returned && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAllocation(alloc);
                                setShowReturnForm(true);
                              }}
                            >
                              <Check size={16} className="mr-2" />
                              Return
                            </Button>
                          )}
                          {alloc.is_returned && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedAllocation(alloc);
                              }}
                            >
                              <Eye size={16} />
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Return Product Form */}
          {showReturnForm && selectedAllocation && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle>Return Product: {selectedAllocation.product_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  value={formData.condition_on_return || ''}
                  onChange={(e) => setFormData({ ...formData, condition_on_return: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ color: 'black', backgroundColor: 'white' }}
                >
                  <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select Condition on Return</option>
                  <option value="good" style={{ color: 'black', backgroundColor: 'white' }}>Good Condition</option>
                  <option value="damaged" style={{ color: 'black', backgroundColor: 'white' }}>Damaged</option>
                  <option value="lost" style={{ color: 'black', backgroundColor: 'white' }}>Lost</option>
                </select>
                <textarea
                  placeholder="Employee Remark (optional)"
                  value={formData.employee_remark || ''}
                  onChange={(e) => setFormData({ ...formData, employee_remark: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <div className="flex gap-2">
                  <Button onClick={handleReturnProduct} className="flex-1">
                    Confirm Return
                  </Button>
                  <Button
                    onClick={() => {
                      setShowReturnForm(false);
                      setSelectedAllocation(null);
                      setFormData({});
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredAllocations.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">No allocations found yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search size={20} className="text-gray-400" />
            <Input
              placeholder="Search product history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {allocations
              .filter((a) => a.is_returned)
              .map((alloc) => (
                <Card key={alloc._id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{alloc.product_name}</CardTitle>
                        <CardDescription>Product History Entry</CardDescription>
                      </div>
                      <Badge
                        className={
                          alloc.condition_on_return === 'good'
                            ? 'bg-green-100 text-green-800'
                            : alloc.condition_on_return === 'damaged'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }
                      >
                        {alloc.condition_on_return}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Employee</p>
                        <p className="font-semibold">{alloc.employee_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Department</p>
                        <p className="font-semibold">{alloc.department_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Allocated</p>
                        <p className="font-semibold">{new Date(alloc.allocation_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Returned</p>
                        <p className="font-semibold">
                          {alloc.return_date ? new Date(alloc.return_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {alloc.employee_remark && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-500 mb-2">Employee Remark</p>
                        <p className="text-sm italic">{alloc.employee_remark}</p>
                      </div>
                    )}

                    {alloc.admin_notes && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-500 mb-2">Admin Notes</p>
                        <p className="text-sm">{alloc.admin_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>

          {allocations.filter((a) => a.is_returned).length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">No product history yet. Start allocating products!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== BOOKINGS TAB ===== */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
              style={{ color: 'black', backgroundColor: 'white' }}
            >
              <option value="all" style={{ color: 'black', backgroundColor: 'white' }}>All Status</option>
              <option value="pending" style={{ color: 'black', backgroundColor: 'white' }}>Pending</option>
              <option value="approved" style={{ color: 'black', backgroundColor: 'white' }}>Approved</option>
              <option value="rejected" style={{ color: 'black', backgroundColor: 'white' }}>Rejected</option>
            </select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resource Booking Requests</CardTitle>
              <CardDescription>Total: {filteredBookings.length} bookings</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Resource</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBookings.map((booking) => (
                      <tr key={booking._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{booking.employee_name || 'Unknown'}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-100 text-blue-800">{booking.resource_type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              booking.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {booking.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveBooking(booking._id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check size={16} />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectBooking(booking._id)}
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {filteredBookings.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">No bookings found.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
