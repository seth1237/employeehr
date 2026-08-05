'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

interface FormField {
  field_id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
}

export default function FormBuilderPage() {
  const params = useParams() as { jobId: string }
  const jobId = String(params.jobId || "")

  const router = useRouter();
  const [jobTitle, setJobTitle] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch job details and existing form if any
    fetchJobAndForm();
  }, [jobId]);

  const fetchJobAndForm = async () => {
    try {
      // Fetch job
      const jobRes = await fetch(`${API_URL}/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const jobData = await jobRes.json();
      if (jobData.success) {
        setJobTitle(jobData.data.title);
        setFormTitle(`${jobData.data.title} Application Form`);
      }

      // Try to fetch existing form
      const formRes = await fetch(`${API_URL}/api/application-forms/job/${jobId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const formData = await formRes.json();
      if (formData.success) {
        setFormTitle(formData.data.title);
        setFormDescription(formData.data.description || '');
        setFields(formData.data.fields || []);
      } else {
        // Add default fields
        setFields([
          { field_id: 'full_name', label: 'Full Name', type: 'text', required: true, order: 0 },
          { field_id: 'email', label: 'Email Address', type: 'email', required: true, order: 1 },
          { field_id: 'phone', label: 'Phone Number', type: 'phone', required: true, order: 2 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
    
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    // Update order
    newFields.forEach((field, i) => {
      field.order = i;
    });
    
    setFields(newFields);
  };

  const saveForm = async () => {
    if (!formTitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Form title is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/application-forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          job_id: jobId,
          title: formTitle,
          description: formDescription,
          fields: fields.map((f, i) => ({ ...f, order: i })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Application form saved successfully',
        });
        router.push('/admin/jobs');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save form',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Application Form Builder</h1>
          <p className="text-gray-600 mt-2">Job: {jobTitle}</p>
        </div>
        <Button onClick={saveForm} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Form'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
            <CardDescription>Configure your application form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Form Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Software Engineer Application"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Instructions for applicants..."
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Form Fields</h3>
                <Button size="sm" onClick={addField}>
                  <Plus size={16} className="mr-1" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <Card key={field.field_id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-1 mt-2">
                          <Button size="sm" variant="ghost" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                            ↑
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1}>
                            ↓
                          </Button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Field label"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={field.type}
                              onValueChange={(value) => updateField(index, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short Text</SelectItem>
                                <SelectItem value="textarea">Long Text (Paragraph)</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="phone">Phone</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="url">Website URL</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="time">Time</SelectItem>
                                <SelectItem value="datetime-local">Date & Time</SelectItem>
                                <SelectItem value="select">Dropdown (Single Choice)</SelectItem>
                                <SelectItem value="radio">Radio Buttons (Single Choice)</SelectItem>
                                <SelectItem value="checkbox">Checkboxes (Multiple Choice)</SelectItem>
                                <SelectItem value="file">File Upload</SelectItem>
                                <SelectItem value="rating">Rating Scale</SelectItem>
                                <SelectItem value="slider">Slider</SelectItem>
                                <SelectItem value="color">Color Picker</SelectItem>
                                <SelectItem value="password">Password</SelectItem>
                                <SelectItem value="range">Number Range</SelectItem>
                                <SelectItem value="address">Address</SelectItem>
                                <SelectItem value="currency">Currency</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={field.placeholder || ''}
                              onChange={(e) => updateField(index, { placeholder: e.target.value })}
                              placeholder="Placeholder..."
                            />
                          </div>
                          
                          {/* Options for select/radio/checkbox */}
                          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                            <div>
                              <Label className="text-xs">Options (one per line)</Label>
                              <Textarea
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                value={field.options?.join('\n') || ''}
                                onChange={(e) => updateField(index, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                                rows={3}
                              />
                            </div>
                          )}

                          {/* Min/Max for rating and slider */}
                          {(field.type === 'rating' || field.type === 'slider' || field.type === 'range') && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Min Value</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={field.options?.[0] || ''}
                                  onChange={(e) => {
                                    const newOptions = [...(field.options || ['', ''])];
                                    newOptions[0] = e.target.value;
                                    updateField(index, { options: newOptions });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Max Value</Label>
                                <Input
                                  type="number"
                                  placeholder="10"
                                  value={field.options?.[1] || ''}
                                  onChange={(e) => {
                                    const newOptions = [...(field.options || ['', ''])];
                                    newOptions[1] = e.target.value;
                                    updateField(index, { options: newOptions });
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* File types for file upload */}
                          {field.type === 'file' && (
                            <div>
                              <Label className="text-xs">Accepted File Types (optional)</Label>
                              <Input
                                placeholder="e.g., .pdf,.doc,.docx"
                                value={field.options?.join(',') || ''}
                                onChange={(e) => updateField(index, { options: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: !!checked })}
                              />
                              <Label className="text-sm">Required</Label>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeField(index)}
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Form Preview</CardTitle>
            <CardDescription>How applicants will see the form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{formTitle || 'Form Title'}</h3>
              {formDescription && <p className="text-sm text-gray-600 mt-1">{formDescription}</p>}
            </div>
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.field_id}>
                  <Label>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea placeholder={field.placeholder} disabled rows={4} />
                  ) : field.type === 'select' ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || 'Select an option...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt, i) => (
                          <SelectItem key={i} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'radio' ? (
                    <div className="space-y-2 mt-2">
                      {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="radio" name={field.field_id} disabled className="w-4 h-4" />
                          <span className="text-sm">{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className="space-y-2 mt-2">
                      {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox disabled />
                          <span className="text-sm">{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'rating' ? (
                    <div className="flex items-center gap-2 mt-2">
                      {Array.from({ length: parseInt(field.options?.[1] || '5') }, (_, i) => (
                        <button key={i} className="text-2xl text-gray-300" disabled>★</button>
                      ))}
                      <span className="text-sm text-gray-500 ml-2">
                        {field.options?.[0] || '0'} to {field.options?.[1] || '5'}
                      </span>
                    </div>
                  ) : field.type === 'slider' ? (
                    <div className="mt-2">
                      <input 
                        type="range" 
                        min={field.options?.[0] || '0'} 
                        max={field.options?.[1] || '100'} 
                        disabled 
                        className="w-full" 
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{field.options?.[0] || '0'}</span>
                        <span>{field.options?.[1] || '100'}</span>
                      </div>
                    </div>
                  ) : field.type === 'file' ? (
                    <div className="mt-2">
                      <Input type="file" disabled accept={field.options?.join(',')} />
                      {field.options && field.options.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">Accepted: {field.options.join(', ')}</p>
                      )}
                    </div>
                  ) : field.type === 'address' ? (
                    <div className="space-y-2 mt-2">
                      <Input placeholder="Street Address" disabled />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="City" disabled />
                        <Input placeholder="State/Province" disabled />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Postal Code" disabled />
                        <Input placeholder="Country" disabled />
                      </div>
                    </div>
                  ) : field.type === 'currency' ? (
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input type="number" placeholder="0.00" disabled className="pl-8" />
                    </div>
                  ) : field.type === 'percentage' ? (
                    <div className="relative mt-2">
                      <Input type="number" placeholder="0" disabled className="pr-8" min="0" max="100" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  ) : field.type === 'color' ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input type="color" disabled className="w-20 h-10" />
                      <Input type="text" placeholder="#000000" disabled />
                    </div>
                  ) : field.type === 'time' ? (
                    <Input type="time" placeholder={field.placeholder} disabled />
                  ) : field.type === 'datetime-local' ? (
                    <Input type="datetime-local" placeholder={field.placeholder} disabled />
                  ) : field.type === 'url' ? (
                    <Input type="url" placeholder={field.placeholder || 'https://example.com'} disabled />
                  ) : field.type === 'password' ? (
                    <Input type="password" placeholder={field.placeholder || '••••••••'} disabled />
                  ) : field.type === 'range' ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input 
                        type="number" 
                        placeholder="Min" 
                        disabled 
                        className="w-24"
                        min={field.options?.[0]}
                      />
                      <span className="text-gray-500">to</span>
                      <Input 
                        type="number" 
                        placeholder="Max" 
                        disabled 
                        className="w-24"
                        max={field.options?.[1]}
                      />
                    </div>
                  ) : (
                    <Input type={field.type} placeholder={field.placeholder} disabled />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
