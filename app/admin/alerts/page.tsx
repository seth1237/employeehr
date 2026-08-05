'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from '@/lib/silent-load';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';
import Link from 'next/link';
import { Search, Trash2, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import type { InboxItem } from '@/components/admin/notifications-popover';

export default function AlertsPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'alert' | 'operational'>('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const { toast } = useToast();

  const fetchInbox = useCallback(async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing);
    try {
      const response = await fetch(`${API_URL}/api/alerts/inbox`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      if (data?.success) {
        setItems(data.data?.items || []);
        setUnread(data.data?.unread || 0);
      } else {
        setItems([]);
        toast({
          title: 'Error',
          description: data?.message || 'Failed to fetch notifications',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
      setItems([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch notifications',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing);
    }
  }, [toast]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const markRead = async (item: InboxItem) => {
    if (item.source !== 'alert' || item.is_read) return;
    try {
      await fetch(`${API_URL}/api/alerts/${item.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, is_read: true } : x)),
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // ignore
    }
  };

  const handleDeleteAlert = async (item: InboxItem) => {
    if (item.source !== 'alert') return;
    try {
      const response = await fetch(`${API_URL}/api/alerts/${item.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      toast({
        title: 'Success',
        description: 'Alert deleted',
      });
      fetchInbox({ silent: true });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete alert',
        variant: 'destructive',
      });
    }
  };

  const filtered = items.filter((item) => {
    const hay = `${item.title} ${item.message}`.toLowerCase();
    const matchesSearch = hay.includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || item.source === filterSource;
    const matchesSeverity = filterSeverity === 'all' || item.severity === filterSeverity;
    return matchesSearch && matchesSource && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  if (loading && items.length === 0) {
    return <PageLoadingSkeleton title="Loading notifications" rows={8} />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Personal alerts and operational signals across stock, invoices, and quotes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{unread}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {items.filter((a) => a.severity === 'critical').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {items.filter((a) => a.source === 'operational').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Same feed as the top-nav bell</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Search size={20} className="text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <select
              value={filterSource}
              onChange={(e) =>
                setFilterSource(e.target.value as 'all' | 'alert' | 'operational')
              }
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All sources</option>
              <option value="alert">Personal alerts</option>
              <option value="operational">Operational</option>
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                You&apos;re all caught up.
              </p>
            )}
            {filtered.map((item) => (
              <div
                key={`${item.source}-${item.id}`}
                className={`p-4 border rounded-lg hover:bg-muted/40 ${
                  !item.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {item.severity === 'critical' || item.severity === 'high' ? (
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                      ) : item.is_read ? (
                        <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.message}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center mt-3">
                      <Badge variant="outline" className="capitalize">
                        {item.source}
                      </Badge>
                      <Badge className={getSeverityColor(item.severity)}>
                        {item.severity}
                      </Badge>
                      {!item.is_read && <Badge variant="outline">Unread</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      {item.action_url && (
                        <Button
                          asChild
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => markRead(item)}
                        >
                          <Link href={item.action_url}>
                            {item.action_label || 'Open'}{' '}
                            <ExternalLink className="h-3 w-3 ml-1 inline" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {item.source === 'alert' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAlert(item)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
