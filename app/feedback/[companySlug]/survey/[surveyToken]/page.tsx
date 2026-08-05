'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react'
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

interface SurveyData {
  survey: {
    _id: string
    name: string
    description?: string
    form_config: {
      questions: Question[]
    }
  }
  company: {
    name?: string
    slug?: string
  }
}

export default function PublicSurveyPage() {
  const params = useParams()
  const surveyToken = params.surveyToken as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')

  useEffect(() => {
    if (surveyToken) {
      fetchSurveyData()
    }
  }, [surveyToken])

  const fetchSurveyData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/feedback-surveys/survey/${surveyToken}`)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to load survey')
      }

      const data = await res.json()
      setSurveyData(data.data)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!surveyData) return

    // Validate required fields
    const requiredFields = surveyData.survey.form_config.questions.filter(q => q.required)
    const missingFields = requiredFields.filter(q => !answers[q.field_id])

    if (missingFields.length > 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Format answers array
      const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }))

      const res = await fetch(`${API_URL}/api/feedback-surveys/survey/${surveyToken}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          respondent_name: respondentName,
          respondent_email: respondentEmail,
          answers: formattedAnswers,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit survey')
      }

      toast.success('Survey submitted successfully!')
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: Question) => {
    const value = answers[question.field_id] || ''

    switch (question.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={question.field_id} className="space-y-2">
            <Label htmlFor={question.field_id}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={question.field_id}
              type={question.type}
              placeholder={question.placeholder}
              value={value}
              onChange={(e) => handleInputChange(question.field_id, e.target.value)}
              required={question.required}
            />
          </div>
        )

      case 'textarea':
        return (
          <div key={question.field_id} className="space-y-2">
            <Label htmlFor={question.field_id}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={question.field_id}
              placeholder={question.placeholder}
              value={value}
              onChange={(e) => handleInputChange(question.field_id, e.target.value)}
              required={question.required}
              rows={4}
            />
          </div>
        )

      case 'select':
      case 'dropdown':
        return (
          <div key={question.field_id} className="space-y-2">
            <Label htmlFor={question.field_id}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleInputChange(question.field_id, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={question.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'radio':
        return (
          <div key={question.field_id} className="space-y-2">
            <Label>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${question.field_id}-${option}`}
                    name={question.field_id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleInputChange(question.field_id, e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`${question.field_id}-${option}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'checkbox':
        return (
          <div key={question.field_id} className="space-y-2">
            <Label>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.field_id}-${option}`}
                    checked={Array.isArray(value) && value.includes(option)}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : []
                      const newValues = checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option)
                      handleInputChange(question.field_id, newValues)
                    }}
                  />
                  <Label htmlFor={`${question.field_id}-${option}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'rating':
        return (
          <div key={question.field_id} className="space-y-2">
            <Label>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  variant={value === rating ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleInputChange(question.field_id, rating)}
                >
                  {rating}
                </Button>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your response has been submitted successfully.
            </p>
            {surveyData?.company.name && (
              <p className="text-sm text-muted-foreground">
                {surveyData.company.name} appreciates your feedback.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!surveyData) return null

  const sortedQuestions = [...surveyData.survey.form_config.questions].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              {surveyData.company.name && (
                <p className="text-sm text-muted-foreground">{surveyData.company.name}</p>
              )}
              <CardTitle className="text-3xl">{surveyData.survey.name}</CardTitle>
              {surveyData.survey.description && (
                <CardDescription className="text-base">
                  {surveyData.survey.description}
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Optional respondent information */}
              <div className="space-y-4 pb-6 border-b">
                <h3 className="font-semibold text-lg">Your Information (Optional)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="respondent_name">Name</Label>
                    <Input
                      id="respondent_name"
                      type="text"
                      placeholder="Your name"
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="respondent_email">Email</Label>
                    <Input
                      id="respondent_email"
                      type="email"
                      placeholder="your@email.com"
                      value={respondentEmail}
                      onChange={(e) => setRespondentEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Survey questions */}
              <div className="space-y-6">
                {sortedQuestions.map((question) => renderQuestion(question))}
              </div>

              {/* Submit button */}
              <div className="flex justify-end pt-6">
                <Button type="submit" disabled={submitting} size="lg">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Survey
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
