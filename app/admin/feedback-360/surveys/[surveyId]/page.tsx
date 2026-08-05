'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Users, Trash2, Eye, Loader2, AlertCircle, Plus, Copy, Link, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getToken } from '@/lib/auth'
import API_URL from '@/lib/apiBase'
import { toast } from 'sonner'

interface Question {
  field_id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
  order: number
}

interface Pool {
  _id: string
  name: string
  description?: string
  total_members: number
  total_responses: number
  public_link: string
  status: string
  created_at: string
}

interface Survey {
  _id: string
  name: string
  description?: string
  form_config: {
    questions: Question[]
  }
  public_token?: string
  created_at: string
  updated_at: string
}

export default function SurveyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [loading, setLoading] = useState(true)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [pools, setPools] = useState<Pool[]>([])
  const [error, setError] = useState<string | null>(null)
  const [publicLink, setPublicLink] = useState<string>('')
  const [generatingLink, setGeneratingLink] = useState(false)

  useEffect(() => {
    fetchSurveyDetails()
  }, [surveyId])

  const fetchSurveyDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch survey details')

      const data = await response.json()
      setSurvey(data.data.survey)
      setPools(data.data.pools || [])
      
      // Set public link if token exists
      if (data.data.survey.public_token) {
        const company = await fetch(`${API_URL}/api/organization`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }).then(res => res.json()).catch(() => ({ data: { slug: 'company' } }))
        
        const companySlug = company.data?.slug || 'company'
        setPublicLink(`${window.location.origin}/feedback/${companySlug}/survey/${data.data.survey.public_token}`)
      }
    } catch (err: any) {
      setError(err.message)
      toast.error('Failed to load survey details')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('Are you sure you want to delete this pool? All responses will be deleted.'))
      return

    try {
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/pools/${poolId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })

      if (!response.ok) throw new Error('Failed to delete pool')

      toast.success('Pool deleted successfully')
      fetchSurveyDetails()
    } catch (err: any) {
      toast.error('Failed to delete pool')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Link copied to clipboard')
  }

  const generatePublicLink = async () => {
    setGeneratingLink(true)
    try {
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/generate-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })

      if (!response.ok) throw new Error('Failed to generate public link')

      const data = await response.json()
      setPublicLink(data.data.public_url)
      toast.success('Public link generated successfully')
      fetchSurveyDetails() // Refresh to get the token
    } catch (err: any) {
      toast.error('Failed to generate public link')
    } finally {
      setGeneratingLink(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Survey not found'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/admin/feedback-360/surveys')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Surveys
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/feedback-360/surveys')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{survey.name}</h1>
            {survey.description && (
              <p className="text-muted-foreground mt-1">{survey.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Survey
          </Button>
          <Button onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}/pools/create`)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Pool
          </Button>
        </div>
      </div>

      {/* Public Survey Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Public Survey Link</CardTitle>
              <CardDescription>
                Share this link to allow anyone to fill out the survey directly
              </CardDescription>
            </div>
            {!survey.public_token && (
              <Button onClick={generatePublicLink} disabled={generatingLink}>
                {generatingLink ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Generate Public Link
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        {survey.public_token && (
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Public URL:</p>
                <code className="text-xs bg-muted px-3 py-2 rounded block truncate">
                  {publicLink || `${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/feedback/${survey.public_token}`}
                </code>
              </div>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(publicLink || `${window.location.origin}/feedback/company/survey/${survey.public_token}`)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(publicLink || `${window.location.origin}/feedback/company/survey/${survey.public_token}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Survey Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Questions</CardTitle>
          <CardDescription>
            {survey.form_config.questions.length} question(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {survey.form_config.questions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => (
              <div key={question.field_id} className="border-l-4 border-primary pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {index + 1}. {question.label}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{question.type}</Badge>
                      {question.required && <Badge variant="outline">Required</Badge>}
                    </div>
                    {question.placeholder && (
                      <p className="text-sm text-muted-foreground">
                        Placeholder: {question.placeholder}
                      </p>
                    )}
                    {question.options && question.options.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Options: {question.options.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Pools */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feedback Pools</CardTitle>
              <CardDescription>
                {pools.length} pool(s) created for this survey
              </CardDescription>
            </div>
            <Button onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}/pools/create`)}>
              <Plus className="mr-2 h-4 w-4" />
              New Pool
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pools created yet</p>
              <Button
                className="mt-4"
                onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}/pools/create`)}
              >
                Create Your First Pool
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pools.map((pool) => (
                <Card key={pool._id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{pool.name}</h3>
                        {pool.description && (
                          <p className="text-sm text-muted-foreground">{pool.description}</p>
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{pool.total_members} members</span>
                          <span>{pool.total_responses} responses</span>
                          <Badge variant={pool.status === 'active' ? 'default' : 'secondary'}>
                            {pool.status}
                          </Badge>
                        </div>
                        {pool.public_link && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Public Link:</p>
                              <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                                {pool.public_link}
                              </code>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(pool.public_link)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}/pools/${pool._id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}/pools/${pool._id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Responses
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeletePool(pool._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
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
