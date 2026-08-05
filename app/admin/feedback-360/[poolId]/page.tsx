'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
    ArrowLeft, 
    Users, 
    Link as LinkIcon, 
    Copy, 
    CheckCircle, 
    Clock,
    MessageSquare,
    Loader2
} from 'lucide-react'
import { getToken } from '@/lib/auth'
import API_URL from '@/lib/apiBase'
import { toast } from 'sonner'

interface PoolMember {
    _id: string
    employee_name: string
    employee_email: string
    public_link: string
    member_index: number
    submission_count: number
}

interface FeedbackResponse {
    _id: string
    answers: Array<{
        question_id: string
        answer: any
    }>
    submitted_at: string
}

interface PoolData {
    _id: string
    name: string
    description?: string
    form_config: {
        questions: Array<{
            id: string
            type: string
            question: string
            required: boolean
            options?: string[]
        }>
    }
    status: string
    createdAt: string
}

export default function PoolDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const poolId = params.poolId as string

    const [loading, setLoading] = useState(true)
    const [pool, setPool] = useState<PoolData | null>(null)
    const [members, setMembers] = useState<PoolMember[]>([])
    const [responses, setResponses] = useState<Record<string, FeedbackResponse[]>>({})
    const [publicLinkBase, setPublicLinkBase] = useState('')
    const [copiedLink, setCopiedLink] = useState<string | null>(null)

    useEffect(() => {
        fetchPoolDetails()
        fetchPoolResponses()
    }, [poolId])

    const fetchPoolDetails = async () => {
        try {
            const res = await fetch(`${API_URL}/api/feedback-360/pools/${poolId}`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            })

            if (!res.ok) throw new Error('Failed to fetch pool details')

            const data = await res.json()
            setPool(data.data.pool)
            setMembers(data.data.members)
            setPublicLinkBase(data.data.public_link_base)
        } catch (err: any) {
            toast.error(err.message || 'Failed to load pool details')
        }
    }

    const fetchPoolResponses = async () => {
        try {
            const res = await fetch(`${API_URL}/api/feedback-360/pools/${poolId}/responses`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            })

            if (!res.ok) throw new Error('Failed to fetch responses')

            const data = await res.json()
            setResponses(data.data.responses || {})
        } catch (err: any) {
            toast.error(err.message || 'Failed to load responses')
        } finally {
            setLoading(false)
        }
    }

    const copyLink = (link: string, memberName: string) => {
        navigator.clipboard.writeText(link)
        setCopiedLink(link)
        toast.success(`Link copied for ${memberName}`)
        setTimeout(() => setCopiedLink(null), 2000)
    }

    const getAnswer = (answers: Array<{question_id: string, answer: any}>, questionId: string) => {
        const answer = answers.find(a => a.question_id === questionId)
        return answer?.answer
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    if (!pool) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertDescription>Pool not found</AlertDescription>
                </Alert>
            </div>
        )
    }

    const totalResponses = Object.values(responses).reduce((sum, arr) => sum + arr.length, 0)
    const completionRate = members.length > 0 ? Math.round((totalResponses / members.length) * 100) : 0

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <Button 
                    variant="ghost" 
                    onClick={() => router.push('/admin/feedback-360')}
                    className="mb-4"
                >
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Pools
                </Button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{pool.name}</h1>
                        {pool.description && (
                            <p className="text-gray-600 mt-2">{pool.description}</p>
                        )}
                    </div>
                    <Badge variant={pool.status === 'active' ? 'default' : 'secondary'}>
                        {pool.status}
                    </Badge>
                </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Users className="text-blue-500" size={20} />
                            <span className="text-2xl font-bold">{members.length}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <MessageSquare className="text-green-500" size={20} />
                            <span className="text-2xl font-bold">{totalResponses}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="text-purple-500" size={20} />
                            <span className="text-2xl font-bold">{completionRate}%</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Members & Public Links */}
            <Card>
                <CardHeader>
                    <CardTitle>Pool Members & Feedback Links</CardTitle>
                    <CardDescription>Share these anonymous links with participants</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member._id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">{member.employee_name}</p>
                                    <p className="text-sm text-gray-500">Member {member.member_index}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={member.submission_count > 0 ? 'default' : 'secondary'}>
                                        {member.submission_count > 0 ? 'Submitted' : 'Pending'}
                                    </Badge>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyLink(member.public_link, member.employee_name)}
                                    >
                                        {copiedLink === member.public_link ? (
                                            <>
                                                <CheckCircle size={16} className="mr-2" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} className="mr-2" />
                                                Copy Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Responses */}
            <Card>
                <CardHeader>
                    <CardTitle>Feedback Responses</CardTitle>
                    <CardDescription>View all submitted feedback anonymously</CardDescription>
                </CardHeader>
                <CardContent>
                    {totalResponses === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Clock size={48} className="mx-auto mb-4 text-gray-400" />
                            <p>No responses yet. Share the links above to collect feedback.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(responses).map(([memberKey, memberResponses]) => (
                                <div key={memberKey} className="border rounded-lg p-4">
                                    <h3 className="font-semibold mb-4">{memberKey}</h3>
                                    {memberResponses.map((response, idx) => (
                                        <div key={response._id} className="mb-6 last:mb-0">
                                            <p className="text-sm text-gray-500 mb-3">
                                                Submission {idx + 1} - {new Date(response.submitted_at).toLocaleString()}
                                            </p>
                                            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                                                {pool.form_config.questions.map((question) => {
                                                    const answer = getAnswer(response.answers, question.id)
                                                    return (
                                                        <div key={question.id}>
                                                            <p className="font-medium text-sm mb-1">{question.question}</p>
                                                            <p className="text-gray-700">
                                                                {Array.isArray(answer) ? answer.join(', ') : answer || 'No answer'}
                                                            </p>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
