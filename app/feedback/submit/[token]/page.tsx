'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react'

interface PoolMember {
    employee_id: string
    employee_name: string
    employee_email: string
}

interface FormQuestion {
    id: string
    type: 'likert' | 'multiple_choice' | 'single_choice' | 'text' | 'rating'
    question: string
    required: boolean
    options?: string[]
    scale?: { min: number; max: number; labels?: { min: string; max: string } }
}

interface PoolData {
    pool: {
        id: string
        name: string
        description?: string
        form_config: {
            questions: FormQuestion[]
        }
    }
    session: {
        submission_count: number
        max_submissions: number
        remaining: number
    }
}

export default function FeedbackSubmissionPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [poolData, setPoolData] = useState<PoolData | null>(null)
    const [poolMembers, setPoolMembers] = useState<PoolMember[]>([])
    const [selectedMember, setSelectedMember] = useState<PoolMember | null>(null)
    const [formResponses, setFormResponses] = useState<{ [questionId: string]: any }>({})
    const [submitting, setSubmitting] = useState(false)
    const [submittedMembers, setSubmittedMembers] = useState<Set<string>>(new Set())
    const [currentSubmissionCount, setCurrentSubmissionCount] = useState(0)

    useEffect(() => {
        validateToken()
    }, [token])

    const validateToken = async () => {
        try {
            setLoading(true)
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

            // Validate token
            const validateRes = await fetch(`${API_URL}/api/feedback-360/public/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })

            if (!validateRes.ok) {
                const errorData = await validateRes.json()
                throw new Error(errorData.message || 'Invalid or expired feedback link')
            }

            const validateData = await validateRes.json()
            setPoolData(validateData.data)
            setCurrentSubmissionCount(validateData.data.session.submission_count)

            // Get pool members
            const membersRes = await fetch(`${API_URL}/api/feedback-360/public/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })

            if (!membersRes.ok) {
                throw new Error('Failed to load pool members')
            }

            const membersData = await membersRes.json()
            setPoolMembers(membersData.data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitFeedback = async () => {
        if (!selectedMember || !poolData) return

        // Validate all required questions are answered
        const unansweredRequired = poolData.pool.form_config.questions
            .filter((q) => q.required && !formResponses[q.id])
            .map((q) => q.question)

        if (unansweredRequired.length > 0) {
            setError(`Please answer all required questions: ${unansweredRequired.join(', ')}`)
            return
        }

        try {
            setSubmitting(true)
            setError(null)
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

            const res = await fetch(`${API_URL}/api/feedback-360/public/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    reviewed_employee_id: selectedMember.employee_id,
                    response_payload: formResponses,
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Failed to submit feedback')
            }

            const data = await res.json()

            // Update state
            setSubmittedMembers((prev) => new Set(prev).add(selectedMember.employee_id))
            setCurrentSubmissionCount(data.data.submission_count)
            setSelectedMember(null)
            setFormResponses({})

            // Show success message
            if (data.data.completed) {
                // All submissions complete
                setTimeout(() => {
                    router.push(`/feedback/submit/${token}/complete`)
                }, 2000)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const renderQuestion = (question: FormQuestion) => {
        const value = formResponses[question.id]

        switch (question.type) {
            case 'likert':
            case 'rating':
                const scale = question.scale || { min: 1, max: 5 }
                return (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{scale.labels?.min || scale.min}</span>
                            <span>{scale.labels?.max || scale.max}</span>
                        </div>
                        <div className="flex gap-2 justify-center">
                            {Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i).map(
                                (num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant={value === num ? 'default' : 'outline'}
                                        className="w-12 h-12"
                                        onClick={() => setFormResponses({ ...formResponses, [question.id]: num })}
                                    >
                                        {num}
                                    </Button>
                                )
                            )}
                        </div>
                    </div>
                )

            case 'single_choice':
                return (
                    <div className="space-y-2">
                        {question.options?.map((option) => (
                            <Button
                                key={option}
                                type="button"
                                variant={value === option ? 'default' : 'outline'}
                                className="w-full justify-start"
                                onClick={() => setFormResponses({ ...formResponses, [question.id]: option })}
                            >
                                {option}
                            </Button>
                        ))}
                    </div>
                )

            case 'multiple_choice':
                const selectedOptions = value || []
                return (
                    <div className="space-y-2">
                        {question.options?.map((option) => (
                            <Button
                                key={option}
                                type="button"
                                variant={selectedOptions.includes(option) ? 'default' : 'outline'}
                                className="w-full justify-start"
                                onClick={() => {
                                    const newOptions = selectedOptions.includes(option)
                                        ? selectedOptions.filter((o: string) => o !== option)
                                        : [...selectedOptions, option]
                                    setFormResponses({ ...formResponses, [question.id]: newOptions })
                                }}
                            >
                                {option}
                            </Button>
                        ))}
                    </div>
                )

            case 'text':
                return (
                    <textarea
                        className="w-full min-h-[100px] p-3 border rounded-md"
                        placeholder="Enter your feedback..."
                        value={value || ''}
                        onChange={(e) =>
                            setFormResponses({ ...formResponses, [question.id]: e.target.value })
                        }
                    />
                )

            default:
                return null
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading feedback form...</p>
                </div>
            </div>
        )
    }

    if (error && !poolData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <CardTitle>Error</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!poolData) return null

    const isComplete = currentSubmissionCount >= 4
    const progressPercentage = (currentSubmissionCount / 4) * 100

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{poolData.pool.name}</CardTitle>
                        {poolData.pool.description && (
                            <CardDescription>{poolData.pool.description}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Progress</span>
                                <span className="text-muted-foreground">
                                    {currentSubmissionCount} of 4 completed
                                </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                        </div>

                        {isComplete && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Thank you! You have completed all 4 feedback submissions.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {!isComplete && (
                    <>
                        {/* Select Colleague */}
                        {!selectedMember && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Select a Colleague to Review
                                    </CardTitle>
                                    <CardDescription>
                                        Choose one of your team members to provide feedback for
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3">
                                        {poolMembers
                                            .filter((member) => !submittedMembers.has(member.employee_id))
                                            .map((member) => (
                                                <Button
                                                    key={member.employee_id}
                                                    variant="outline"
                                                    className="w-full justify-start h-auto p-4"
                                                    onClick={() => setSelectedMember(member)}
                                                >
                                                    <div className="text-left">
                                                        <div className="font-medium">{member.employee_name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {member.employee_email}
                                                        </div>
                                                    </div>
                                                </Button>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Feedback Form */}
                        {selectedMember && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Feedback for {selectedMember.employee_name}</CardTitle>
                                    <CardDescription>
                                        Please answer all questions honestly and constructively
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    {poolData.pool.form_config.questions.map((question, index) => (
                                        <div key={question.id} className="space-y-3">
                                            <label className="font-medium">
                                                {index + 1}. {question.question}
                                                {question.required && <span className="text-destructive ml-1">*</span>}
                                            </label>
                                            {renderQuestion(question)}
                                        </div>
                                    ))}

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedMember(null)
                                                setFormResponses({})
                                                setError(null)
                                            }}
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSubmitFeedback} disabled={submitting} className="flex-1">
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                'Submit Feedback'
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
