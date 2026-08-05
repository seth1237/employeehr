'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, BarChart3, Lock } from 'lucide-react';
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
import { getToken, getUser } from '@/lib/auth';
import API_URL from '@/lib/apiBase';
import { finishDataLoad, startDataLoad } from '@/lib/silent-load';

interface Poll {
  _id: string;
  title: string;
  description: string;
  poll_type: string;
  options: string[];
  status: string;
  created_at: string;
  ends_at?: string;
  vote_count?: number;
}

interface VoteRecord {
  _id: string;
  poll_id: string;
  user_id: string;
  selected_option: string;
  voted_at: string;
  poll_title?: string;
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('polls');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    poll_type: 'general',
    options: ['', '', ''],
    end_date: '',
    allow_multiple_votes: false,
    is_anonymous: false,
  });
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  // API base URL handled by lib/apiBase

  useEffect(() => {
    const user = getUser();
    setCurrentUserRole(user?.role || null);
    fetchData();
  }, []);

  const isAuthorizedToCreate = () => {
    return ['admin', 'company_admin', 'hr', 'manager'].includes(currentUserRole || '');
  };

  const fetchData = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading);
    try {
      const [pollsRes, votesRes] = await Promise.all([
        fetch(`${API_URL}/api/polls`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/votes`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const pollsData = await pollsRes.json();
      const votesData = await votesRes.json();

      setPolls(Array.isArray(pollsData) ? pollsData : (pollsData.success ? pollsData.data : []) || []);
      setVotes(Array.isArray(votesData) ? votesData : votesData.data || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch polls',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading);
    }
  };

  const handleCreatePoll = async () => {
    if (
      !formData.title ||
      !formData.description ||
      formData.options.some((opt) => !opt.trim()) ||
      !formData.end_date
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields (including end date)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        poll_type: formData.poll_type,
        options: formData.options.map((text) => ({ text })),
        end_date: formData.end_date,
        allow_multiple_votes: formData.allow_multiple_votes,
        is_anonymous: formData.is_anonymous,
        status: 'active',
      };
      const response = await fetch(`${API_URL}/api/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create poll');

      toast({
        title: 'Success',
        description: 'Poll created successfully',
      });
      setFormData({
        title: '',
        description: '',
        poll_type: 'general',
        options: ['', '', ''],
        end_date: '',
        allow_multiple_votes: false,
        is_anonymous: false,
      });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create poll',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;

    try {
      const response = await fetch(`${API_URL}/api/polls/${pollId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete poll');

      toast({
        title: 'Success',
        description: 'Poll deleted successfully',
      });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete poll',
        variant: 'destructive',
      });
    }
  };

  const filteredPolls = polls.filter((poll) =>
    poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    poll.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPollTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      employee_of_month: 'bg-purple-100 text-purple-800',
      policy_change: 'bg-blue-100 text-blue-800',
      event_date: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800',
      department: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <PageLoadingSkeleton title="Loading polls" rows={8} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Polls Management</h1>
          <p className="text-gray-600 mt-2">Create and manage employee polls and voting</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" disabled={!isAuthorizedToCreate()}>
              <Plus size={20} />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
              <DialogDescription>Add a new poll for your employees</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Poll title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Poll description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formData.poll_type}
                  onValueChange={(value) => setFormData({ ...formData, poll_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="employee_of_month">Employee of Month</SelectItem>
                    <SelectItem value="policy_change">Policy Change</SelectItem>
                    <SelectItem value="event_date">Event Date</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Options</label>
                {formData.options.map((option, index) => (
                  <Input
                    key={index}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...formData.options];
                      newOptions[index] = e.target.value;
                      setFormData({ ...formData, options: newOptions });
                    }}
                    className="mb-2"
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData({ ...formData, options: [...formData.options, ''] })
                  }
                  className="w-full"
                >
                  + Add Option
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.allow_multiple_votes}
                    onChange={(e) => setFormData({ ...formData, allow_multiple_votes: e.target.checked })}
                  />
                  Allow multiple votes
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.is_anonymous}
                    onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                  />
                  Anonymous
                </label>
              </div>
              <Button onClick={handleCreatePoll} className="w-full" disabled={!isAuthorizedToCreate()}>
                {isAuthorizedToCreate() ? 'Create Poll' : 'Insufficient Permissions'}
              </Button>
              {!isAuthorizedToCreate() && (
                <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                  <Lock size={14} />
                  You need admin or manager rights to create polls.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('polls')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'polls'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Polls ({polls.length})
        </button>
        <button
          onClick={() => setActiveTab('votes')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'votes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Votes ({votes.length})
        </button>
      </div>

      {activeTab === 'polls' && (
        <Card>
          <CardHeader>
            <CardTitle>All Polls</CardTitle>
            <CardDescription>Manage polling activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search polls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="space-y-3">
              {filteredPolls.map((poll) => (
                <div key={poll._id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{poll.title}</h3>
                        <Badge className={getPollTypeColor(poll.poll_type)}>
                          {poll.poll_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{poll.description}</p>
                      <div className="space-y-2">
                        {poll.options?.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">• {typeof option === 'string' ? option : option.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePoll(poll._id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t">
                    <span>
                      <BarChart3 size={14} className="inline mr-1" />
                      {poll.vote_count || 0} votes
                    </span>
                    <span>Status: {poll.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'votes' && (
        <Card>
          <CardHeader>
            <CardTitle>Vote Records</CardTitle>
            <CardDescription>All votes cast by employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Poll</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Selected Option</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Voted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {votes.map((vote) => (
                    <tr key={vote._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{vote.poll_title}</td>
                      <td className="px-4 py-3">{vote.selected_option}</td>
                      <td className="px-4 py-3">
                        {new Date(vote.voted_at).toLocaleDateString()}
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
