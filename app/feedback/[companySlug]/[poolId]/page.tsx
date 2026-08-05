'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
  User as UserIcon,
  ArrowRight,
  ChevronRight,
  Star
} from 'lucide-react'
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

interface PoolMember {
  _id: string
  employee_name: string
  role: string
  submission_count: number
}

interface BrandingData {
  name: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: string
  fontFamily?: string
  buttonStyle?: string
}

interface PoolData {
  pool: {
    _id: string
    name: string
    description?: string
  }
  members: PoolMember[]
  survey: {
    _id: string
    name: string
    description?: string
    form_config: {
      questions: Question[]
    }
  }
  branding?: BrandingData
}

export default function PublicFeedbackPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const poolId = params.poolId as string
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [poolData, setPoolData] = useState<PoolData | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [availableMembers, setAvailableMembers] = useState<PoolMember[]>([])
  const [completedCount, setCompletedCount] = useState(0)

  // Dynamic Styles
  const styles = useMemo(() => {
    if (!poolData?.branding) return {}
    const b = poolData.branding
    return {
      '--primary': b.primaryColor || '#2563eb',
      '--radius': b.borderRadius || '0.5rem',
      '--font-family': b.fontFamily || 'inherit',
    } as React.CSSProperties
  }, [poolData])

  useEffect(() => {
    if (poolId) {
      fetchPoolData()
    } else {
      setError('Invalid feedback link')
      setLoading(false)
    }
  }, [poolId, token])

  useEffect(() => {
    if (poolData && currentUser) {
      const others = poolData.members.filter(m => m._id !== currentUser)
      setAvailableMembers(others)
    }
  }, [poolData, currentUser])

  const fetchPoolData = async () => {
    try {
      const url = token
        ? `${API_URL}/api/feedback-surveys/public/${poolId}?token=${token}`
        : `${API_URL}/api/feedback-surveys/public/${poolId}`

      const res = await fetch(url)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to load feedback form')
      }

      const data = await res.json()
      setPoolData(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!poolData || !currentUser) return

    if (!selectedMember) {
      toast.error('Please select a member to provide feedback for')
      return
    }

    const requiredFields = poolData.survey.form_config.questions.filter(q => q.required)
    const missingFields = requiredFields.filter(q => !answers[q.field_id])

    if (missingFields.length > 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }))

      const res = await fetch(`${API_URL}/api/feedback-surveys/public/${poolId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          submitter_id: currentUser,
          member_id: selectedMember,
          answers: formattedAnswers,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit feedback')
      }

      setAnswers({})
      setSelectedMember('')
      setCompletedCount(prev => prev + 1)
      setAvailableMembers(prev => prev.filter(m => m._id !== selectedMember))

      toast.success('Feedback submitted successfully!')

      if (completedCount + 1 >= (poolData.members.length - 1)) {
        setSubmitted(true)
      }
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (question: Question) => {
    const value = answers[question.field_id] || ''

    const updateAnswer = (newValue: any) => {
      setAnswers(prev => ({ ...prev, [question.field_id]: newValue }))
    }

    switch (question.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={question.placeholder}
            className="min-h-[120px] bg-white/50 backdrop-blur-sm focus:bg-white transition-all border-slate-200 focus:border-blue-400 focus:ring-blue-400"
            required={question.required}
          />
        )

      case 'select':
        return (
          <Select value={value} onValueChange={updateAnswer} required={question.required}>
            <SelectTrigger className="bg-white/50 backdrop-blur-sm border-slate-200">
              <SelectValue placeholder={question.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, i) => (
                <SelectItem key={i} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'rating':
        const max = parseInt(question.options?.[1] || '5')
        return (
          <div className="flex items-center gap-3">
            {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
              <motion.button
                key={rating}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => updateAnswer(rating)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm ${value === rating
                    ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
              >
                {rating}
              </motion.button>
            ))}
          </div>
        )

      default:
        return (
          <Input
            type={question.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={question.placeholder}
            className="bg-white/50 backdrop-blur-sm border-slate-200 h-10"
            required={question.required}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading secure survey...</p>
      </div>
    )
  }

  if (error && !poolData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md border-red-100 shadow-xl overflow-hidden">
            <div className="h-2 bg-red-500" />
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Error</h2>
                <p className="text-slate-600 mb-6">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-md border-green-100 shadow-2xl overflow-hidden">
            <div className="h-2 bg-green-500" />
            <CardContent className="pt-10 pb-10 px-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">You're All Set!</h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                Thank you for your valuable feedback. Your responses have been securely submitted and will contribute to the team's professional development.
              </p>
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-400">Feedback for {completedCount} team members successfully processed.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (!poolData) return null

  return (
    <div
      className="min-h-screen bg-slate-50/50 py-12 px-4 selection:bg-blue-100"
      style={styles}
    >
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Branding & Header */}
        <header className="flex flex-col items-center text-center space-y-4 mb-12">
          {poolData.branding?.logo ? (
            <img src={poolData.branding.logo} alt={poolData.branding.name} className="h-16 object-contain" />
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Star className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {poolData.branding?.name || 'Feedback Survey'}
            </h1>
            <p className="text-slate-500 font-medium">360° Professional Assessment</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div
              key="identification"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-slate-100 shadow-xl overflow-hidden backdrop-blur-sm bg-white/80">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Welcome</CardTitle>
                      <CardDescription>Select your name to begin the survey</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 pb-8">
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {poolData.members.map((member) => (
                        <motion.button
                          key={member._id}
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 246, 255, 0.5)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setCurrentUser(member._id)}
                          className="flex items-center p-4 border rounded-2xl border-slate-200 bg-white shadow-sm transition-all text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-4 text-slate-500">
                            {member.employee_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{member.employee_name}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{member.role}</p>
                          </div>
                          <ChevronRight className="ml-auto w-4 h-4 text-slate-300" />
                        </motion.button>
                      ))}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl flex items-start gap-3 border border-slate-100">
                      <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 leading-relaxed">
                        To maintain <strong>complete anonymity</strong>, your identity is only used to determine which team members you need to evaluate. Your individual responses will never be linked to your name.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="survey-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Sticky Progress Bar */}
              <div className="sticky top-6 z-20">
                <Card className="shadow-lg border-slate-200/50 backdrop-blur-md bg-white/90">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Survey Progress</span>
                      <span className="text-sm font-bold text-blue-600">{completedCount} / {poolData.members.length - 1} Completed</span>
                    </div>
                    <Progress
                      value={(completedCount / (poolData.members.length - 1)) * 100}
                      className="h-2 bg-slate-100"
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-100 shadow-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 pb-6 pt-8">
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {selectedMember ? (
                      <div className="flex items-center gap-3">
                        <span className="text-blue-600">Evaluating</span>
                        <span>{availableMembers.find(m => m._id === selectedMember)?.employee_name}</span>
                      </div>
                    ) : 'Start Evaluations'}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {poolData.survey.description || 'Provide honest, constructive feedback for your team members.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 pb-10">
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-10">

                    {/* Member Selection Section */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold text-slate-900 block">Step 1: Select Evaluated Member</Label>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                        {availableMembers.map((member) => (
                          <motion.button
                            key={member._id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => setSelectedMember(member._id)}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-1 ${selectedMember === member._id
                                ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50 shadow-inner'
                                : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                              }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedMember === member._id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              {member.employee_name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{member.employee_name}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-black">{member.role}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedMember && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-8 pt-8 border-t border-slate-100"
                        >
                          <Label className="text-lg font-bold text-slate-900 block">Step 2: Provide Your Feedback</Label>
                          <div className="space-y-8">
                            {poolData.survey.form_config.questions
                              .sort((a, b) => a.order - b.order)
                              .map((question) => (
                                <div key={question.field_id} className="space-y-3 group">
                                  <Label className="text-base font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {question.label}
                                    {question.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  {renderField(question)}
                                </div>
                              ))}
                          </div>

                          <div className="pt-6">
                            <Button
                              type="submit"
                              className="w-full h-14 text-lg font-bold shadow-xl shadow-blue-100 transition-all rounded-2xl group"
                              disabled={submitting}
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  Securing Feedback...
                                </>
                              ) : (
                                <>
                                  Submit Feedback
                                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </CardContent>
              </Card>

              <footer className="text-center py-8">
                <p className="text-sm text-slate-400 font-medium">Powering Professional Excellence • {poolData.branding?.name}</p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
