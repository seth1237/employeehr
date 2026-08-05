'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import {
    Loader2,
    ArrowLeft,
    Eye,
    MessageSquare,
    User,
    Calendar,
    CheckCircle2,
    Clock
} from 'lucide-react'
import { getToken } from '@/lib/auth'
import API_URL from '@/lib/apiBase'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Response {
    _id: string
    submitter_name: string
    member_name: string
    submitter_role?: string
    member_role?: string
    submitted_at?: string
    createdAt: string
    answers: Array<{
        question_id: string
        answer: any
    }>
}

interface SurveyInfo {
    name: string
    description?: string
    form_config: {
        questions: Array<{
            field_id: string
            label: string
            type: string
        }>
    }
}

export default function SurveyResponsesPage() {
    const params = useParams()
    const router = useRouter()
    const surveyId = params.surveyId as string

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{
        survey: SurveyInfo
        feedbackResponses: Response[]
    } | null>(null)
    const [selectedResponse, setSelectedResponse] = useState<Response | null>(null)

    useEffect(() => {
        if (surveyId) {
            fetchResponses()
        }
    }, [surveyId])

    const fetchResponses = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/responses`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            })

            if (!res.ok) throw new Error('Failed to fetch responses')

            const json = await res.json()
            setData(json.data)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getQuestionLabel = (id: string) => {
        return data?.survey.form_config.questions.find(q => q.field_id === id)?.label || id
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{data.survey.name}</h1>
                    <p className="text-muted-foreground">Submission details and gathered feedback</p>
                </div>
            </div>

            <div className="grid gap-6">
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-500" />
                            Responses ({data.feedbackResponses.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/30">
                                    <TableHead>Submitter</TableHead>
                                    <TableHead>Member Evaluated</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.feedbackResponses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No submissions found yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.feedbackResponses.map((response) => (
                                        <TableRow key={response._id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{response.submitter_name}</span>
                                                    <span className="text-xs text-slate-500">{response.submitter_role}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-blue-700">{response.member_name}</span>
                                                    <span className="text-xs text-slate-500">{response.member_role}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    <span>{format(new Date(response.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedResponse(response)}
                                                            className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Details
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                                                Feedback Details
                                                            </DialogTitle>
                                                            <DialogDescription>
                                                                Response from <strong>{response.submitter_name}</strong> for <strong>{response.member_name}</strong>
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        <div className="mt-6 space-y-6">
                                                            {response.answers.map((ans, idx) => (
                                                                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                                                                        {getQuestionLabel(ans.question_id)}
                                                                    </p>
                                                                    <div className="text-slate-900 font-medium">
                                                                        {typeof ans.answer === 'object'
                                                                            ? JSON.stringify(ans.answer)
                                                                            : <p className="whitespace-pre-wrap">{String(ans.answer)}</p>
                                                                        }
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
