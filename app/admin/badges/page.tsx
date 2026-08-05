'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Award } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { finishDataLoad, startDataLoad } from '@/lib/silent-load';

interface Badge {
  _id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
}

interface UserBadge {
  _id: string;
  user_id: string;
  badge_id: Badge;
  awarded_by: string;
  awarded_at: string;
  user_name?: string;
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('awards');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🏆',
    category: 'achievement',
    points: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading);
    try {
      const [badgesRes, userBadgesRes] = await Promise.all([
        fetch(`${API_URL}/api/badges`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/badges/awards/all`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const badgesData = await badgesRes.json();
      const userBadgesData = await userBadgesRes.json();

      setBadges(Array.isArray(badgesData) ? badgesData : badgesData.data || []);
      setUserBadges(Array.isArray(userBadgesData) ? userBadgesData : userBadgesData.data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch badges',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading);
    }
  };

  const handleCreateBadge = async () => {
    if (!formData.name || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/badges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create badge');

      toast({
        title: 'Success',
        description: 'Badge created successfully',
      });
      setFormData({
        name: '',
        description: '',
        icon: '🏆',
        category: 'achievement',
        points: 0,
      });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create badge',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm('Are you sure you want to delete this badge?')) return;

    try {
      const response = await fetch(`${API_URL}/api/badges/${badgeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete badge');

      toast({
        title: 'Success',
        description: 'Badge deleted successfully',
      });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete badge',
        variant: 'destructive',
      });
    }
  };

  const filteredBadges = badges.filter((badge) =>
    badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    badge.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <PageLoadingSkeleton title="Loading badges" rows={8} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Badges Management</h1>
          <p className="text-gray-600 mt-2">Manage badges and employee awards</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={20} />
              Create Badge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Badge</DialogTitle>
              <DialogDescription>Add a new badge to your system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g., Top Performer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Badge description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Icon</label>
                <Input
                  placeholder="Emoji icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Points</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button onClick={handleCreateBadge} className="w-full">
                Create Badge
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'badges'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Badge Types ({badges.length})
        </button>
        <button
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'awards'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Awarded Badges ({userBadges.length})
        </button>
      </div>

      {activeTab === 'badges' && (
        <Card>
          <CardHeader>
            <CardTitle>Badge Types</CardTitle>
            <CardDescription>Manage badge definitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search badges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBadges.map((badge) => (
                <div key={badge._id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{badge.icon}</span>
                      <div>
                        <h3 className="font-semibold">{badge.name}</h3>
                        <Badge variant="outline">{badge.category}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteBadge(badge._id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
                  <div className="text-sm text-gray-500">
                    <Award size={14} className="inline mr-1" />
                    {badge.points} points
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'awards' && (
        <Card>
          <CardHeader>
            <CardTitle>Awarded Badges</CardTitle>
            <CardDescription>View all badge awards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Badge</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Awarded By</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userBadges.map((award) => (
                    <tr key={award._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{award.user_name || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{award.badge_id?.icon}</span>
                          <span>{award.badge_id?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{award.badge_id?.category}</Badge>
                      </td>
                      <td className="px-4 py-3">{award.awarded_by || 'System'}</td>
                      <td className="px-4 py-3">
                        {new Date(award.awarded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
