'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Eye, Users, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';

interface JobAnalytics {
  job_id: string;
  job_title: string;
  department: string;
  status: string;
  views: number;
  applications: number;
  conversionRate: number;
}

export default function JobAnalyticsPage() {
  const [analytics, setAnalytics] = useState<JobAnalytics[]>([]);
  const [totals, setTotals] = useState({ views: 0, applications: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(dateRange));

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`${API_URL}/api/job-analytics/overview?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data.jobAnalytics || []);
        setTotals(data.data.totals || { views: 0, applications: 0, conversionRate: 0 });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoadingSkeleton title="Loading analytics" rows={8} />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Analytics</h1>
          <p className="text-gray-600 mt-2">Track job performance and conversion rates</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.views.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Across all job postings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.applications.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Candidates submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.conversionRate.toFixed(2)}%</p>
            <p className="text-xs text-gray-600 mt-1">Views to applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {analytics.filter((a) => a.status === 'open').length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Currently accepting applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Performance</CardTitle>
          <CardDescription>Detailed analytics for each job posting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Job Title</th>
                  <th className="text-left py-3 px-4 font-semibold">Department</th>
                  <th className="text-right py-3 px-4 font-semibold">Views</th>
                  <th className="text-right py-3 px-4 font-semibold">Applications</th>
                  <th className="text-right py-3 px-4 font-semibold">Conversion</th>
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((job) => (
                  <tr key={job.job_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{job.job_title}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{job.department}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Eye size={14} className="text-gray-400" />
                        <span className="font-medium">{job.views.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Users size={14} className="text-gray-400" />
                        <span className="font-medium">{job.applications.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp
                          size={14}
                          className={
                            job.conversionRate >= 10
                              ? 'text-green-600'
                              : job.conversionRate >= 5
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }
                        />
                        <span
                          className={`font-medium ${
                            job.conversionRate >= 10
                              ? 'text-green-600'
                              : job.conversionRate >= 5
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {job.conversionRate.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          job.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'closed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {analytics.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analytics data available for the selected period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Jobs</CardTitle>
            <CardDescription>Highest conversion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...analytics]
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 5)
                .map((job, index) => (
                  <div key={job.job_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{job.job_title}</p>
                        <p className="text-sm text-gray-600">{job.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{job.conversionRate.toFixed(2)}%</p>
                      <p className="text-xs text-gray-600">{job.applications} applications</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Jobs</CardTitle>
            <CardDescription>Highest view counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...analytics]
                .sort((a, b) => b.views - a.views)
                .slice(0, 5)
                .map((job, index) => (
                  <div key={job.job_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{job.job_title}</p>
                        <p className="text-sm text-gray-600">{job.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{job.views.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">views</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
