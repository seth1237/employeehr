'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getToken } from '@/lib/auth'
import API_URL from '@/lib/apiBase'
import { toast } from 'sonner'

interface FormField {
  field_id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
  order: number
}

export default function EditSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSurvey()
  }, [surveyId])

  const fetchSurvey = async () => {
    try {
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch survey')

      const data = await response.json()
      const survey = data.data.survey

      setName(survey.name)
      setDescription(survey.description || '')
      setFields(survey.form_config.questions || [])
    } catch (err: any) {
      setError(err.message)
      toast.error('Failed to load survey')
    } finally {
      setLoading(false)
    }
  }

  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}`,
      label: 'New Question',
      type: 'text',
      required: false,
      order: fields.length,
    }
    setFields([...fields, newField])
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return
    
    const newFields = [...fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    
    newFields.forEach((field, i) => {
      field.order = i
    })
    
    setFields(newFields)
  }

  const saveSurvey = async () => {
    if (!name.trim()) {
      setError('Survey name is required')
      return
    }

    if (fields.length === 0) {
      setError('Add at least one question to the survey')
      return
    }

    setSaving(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name,
          description,
          form_config: {
            questions: fields.map((f, i) => ({ ...f, order: i })),
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Survey updated successfully')
        router.push(`/admin/feedback-360/surveys/${surveyId}`)
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update survey')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}`)}
            className="mb-2"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Feedback Survey</h1>
          <p className="text-gray-600 mt-2">Update your feedback form questions</p>
        </div>
        <Button onClick={saveSurvey} disabled={saving}>
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
          <CardDescription>Basic information about your feedback survey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Survey Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Performance Survey Q1 2026"
            />
          </div>
          <div>
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context about this survey..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Survey Questions</CardTitle>
              <CardDescription>Add questions to collect feedback</CardDescription>
            </div>
            <Button size="sm" onClick={addField}>
              <Plus size={16} className="mr-1" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.field_id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 mt-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => moveField(index, 'up')} 
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => moveField(index, 'down')} 
                          disabled={index === fields.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Question text"
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
                              <SelectItem value="textarea">Long Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                              <SelectItem value="radio">Radio Buttons</SelectItem>
                              <SelectItem value="checkbox">Checkboxes</SelectItem>
                              <SelectItem value="rating">Rating Scale</SelectItem>
                              <SelectItem value="slider">Slider</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Placeholder..."
                          />
                        </div>
                        
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

                        {(field.type === 'rating' || field.type === 'slider') && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Min Value</Label>
                              <Input
                                type="number"
                                placeholder="1"
                                value={field.options?.[0] || ''}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || ['', ''])]
                                  newOptions[0] = e.target.value
                                  updateField(index, { options: newOptions })
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Max Value</Label>
                              <Input
                                type="number"
                                placeholder="5"
                                value={field.options?.[1] || ''}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || ['', ''])]
                                  newOptions[1] = e.target.value
                                  updateField(index, { options: newOptions })
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(index, { required: !!checked })}
                          />
                          <Label className="text-sm">Required</Label>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
