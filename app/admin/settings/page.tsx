'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

interface Settings {
  organization_name: string;
  organization_email: string;
  organization_phone: string;
  website: string;
  alert_threshold: number;
  pdp_reminder_days: number;
  contract_expiry_alert_days: number;
  booking_approval_required: boolean;
  suggestion_anonymous_allowed: boolean;
  poll_voting_enabled: boolean;
  timezone: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    organization_name: '',
    organization_email: '',
    organization_phone: '',
    website: '',
    alert_threshold: 5,
    pdp_reminder_days: 7,
    contract_expiry_alert_days: 30,
    booking_approval_required: true,
    suggestion_anonymous_allowed: true,
    poll_voting_enabled: true,
    timezone: 'UTC',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/settings`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoadingSkeleton title="Loading settings" rows={8} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-gray-600 mt-2">Configure organization and system preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
            <CardDescription>Basic organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <Input
                value={settings.organization_name}
                onChange={(e) =>
                  setSettings({ ...settings, organization_name: e.target.value })
                }
                placeholder="Your Organization"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={settings.organization_email}
                onChange={(e) =>
                  setSettings({ ...settings, organization_email: e.target.value })
                }
                placeholder="contact@organization.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={settings.organization_phone}
                onChange={(e) =>
                  setSettings({ ...settings, organization_phone: e.target.value })
                }
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Website</label>
              <Input
                value={settings.website}
                onChange={(e) =>
                  setSettings({ ...settings, website: e.target.value })
                }
                placeholder="https://organization.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>System preferences and defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST (Eastern Standard Time)</option>
                <option value="CST">CST (Central Standard Time)</option>
                <option value="MST">MST (Mountain Standard Time)</option>
                <option value="PST">PST (Pacific Standard Time)</option>
                <option value="IST">IST (Indian Standard Time)</option>
                <option value="CET">CET (Central European Time)</option>
                <option value="GMT">GMT (Greenwich Mean Time)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Alert Threshold (days)</label>
              <Input
                type="number"
                value={settings.alert_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, alert_threshold: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of days to trigger alerts
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">PDP Reminder Days</label>
              <Input
                type="number"
                value={settings.pdp_reminder_days}
                onChange={(e) =>
                  setSettings({ ...settings, pdp_reminder_days: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Remind employees before PDP completion deadline
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Settings</CardTitle>
            <CardDescription>Configure alert thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Contract Expiry Alert (days)</label>
              <Input
                type="number"
                value={settings.contract_expiry_alert_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contract_expiry_alert_days: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert when contract expires in X days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Configuration</CardTitle>
            <CardDescription>Enable or disable features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="text-sm font-medium">Booking Approval Required</p>
                <p className="text-xs text-gray-600">
                  Require admin approval for resource bookings
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.booking_approval_required}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    booking_approval_required: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="text-sm font-medium">Anonymous Suggestions</p>
                <p className="text-xs text-gray-600">
                  Allow anonymous suggestion submission
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.suggestion_anonymous_allowed}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    suggestion_anonymous_allowed: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="text-sm font-medium">Enable Polls</p>
                <p className="text-xs text-gray-600">
                  Enable employee voting and polls
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.poll_voting_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    poll_voting_enabled: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Settings are organization-wide</p>
          <p className="text-sm text-blue-800 mt-1">
            Changes to these settings will affect all users in your organization
          </p>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2"
      >
        <Save size={20} />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
