'use client';

import React, { useState, useEffect } from 'react';
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from '@/lib/silent-load';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';
import { Search, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

interface Suggestion {
  _id: string;
  title: string;
  description: string;
  category: string;
  is_anonymous: boolean;
  employee_name?: string;
  upvotes: number;
  admin_response?: string;
  status: string;
  created_at: string;
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [responseText, setResponseText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing);
    try {
      const response = await fetch(`${API_URL}/api/suggestions`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      setSuggestions(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch suggestions',
        variant: 'destructive',
      });
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing);
    }
  };

  const handleRespond = async () => {
    if (!selectedSuggestion || !responseText.trim()) return;

    try {
      const response = await fetch(
        `${API_URL}/api/suggestions/${selectedSuggestion._id}/respond`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ admin_response: responseText }),
        }
      );

      if (!response.ok) throw new Error('Failed to respond');

      toast({
        title: 'Success',
        description: 'Response added successfully',
      });
      setResponseText('');
      setSelectedSuggestion(null);
      fetchSuggestions({ silent: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add response',
        variant: 'destructive',
      });
    }
  };

  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    suggestion.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      office: 'bg-blue-100 text-blue-800',
      process: 'bg-green-100 text-green-800',
      policy: 'bg-purple-100 text-purple-800',
      benefits: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading && suggestions.length === 0) {
    return <PageLoadingSkeleton title="Loading suggestions" rows={8} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Suggestions Management</h1>
        <p className="text-gray-600 mt-2">Review and respond to employee suggestions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suggestions</CardTitle>
          <CardDescription>Total: {filteredSuggestions.length} suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <Input
              placeholder="Search suggestions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="space-y-3">
            {filteredSuggestions.map((suggestion) => (
              <div key={suggestion._id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{suggestion.title}</h3>
                      <Badge className={getCategoryColor(suggestion.category)}>
                        {suggestion.category}
                      </Badge>
                      {suggestion.is_anonymous && (
                        <Badge variant="outline">Anonymous</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>By: {suggestion.is_anonymous ? 'Anonymous' : suggestion.employee_name || 'Unknown'}</span>
                      <span>👍 {suggestion.upvotes} upvotes</span>
                      <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                    </div>

                    {suggestion.admin_response && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-900">Admin Response:</p>
                        <p className="text-sm text-green-800 mt-1">{suggestion.admin_response}</p>
                      </div>
                    )}
                  </div>

                  {!suggestion.admin_response && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSuggestion(suggestion);
                            setResponseText('');
                          }}
                        >
                          <Send size={16} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Respond to Suggestion</DialogTitle>
                          <DialogDescription>{suggestion.title}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <textarea
                            placeholder="Write your response..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md min-h-32"
                          />
                          <Button onClick={handleRespond} className="w-full">
                            <Check size={16} className="mr-2" />
                            Send Response
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
