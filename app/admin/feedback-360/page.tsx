'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, FileText, Users, Trash2, Eye, Loader2, AlertCircle, Edit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth'
import API_URL from '@/lib/apiBase'
import { finishDataLoad, startDataLoad } from '@/lib/silent-load'
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states'
import { toast } from 'sonner'

interface Survey {
    _id: string
    name: string
    description?: string
    status: string
    pool_count: number
    response_count: number
    createdAt: string
}

export default function Feedback360Page() {
    const router = useRouter()
    const [surveys, setSurveys] = useState<Survey[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchSurveys()
    }, [])

    const fetchSurveys = async (opts?: { silent?: boolean } | boolean) => {
        const silent = startDataLoad(opts, setLoading)
        try {
            const res = await fetch(`${API_URL}/api/feedback-surveys`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            })

            if (!res.ok) throw new Error('Failed to fetch surveys')

            const data = await res.json()
            setSurveys(data.data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            finishDataLoad(silent, setLoading)
        }
    }

    const handleDeleteSurvey = async (surveyId: string) => {
        if (!confirm('Are you sure you want to delete this survey? All associated pools and responses will be deleted.'))
            return

        try {
            const res = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message)
            }

            toast.success('Survey deleted successfully')
            setSurveys((prev) => prev.filter((s) => s._id !== surveyId))
            fetchSurveys(true)
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    if (loading) return <PageLoadingSkeleton title="Loading surveys" rows={8} />

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">360° Feedback Surveys</h1>
                    <p className="text-muted-foreground">
                        Create surveys and manage feedback pools
                    </p>
                </div>
                <Button onClick={() => router.push('/admin/feedback-360/surveys/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Survey
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4">
                {surveys.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground text-center">
                                No surveys yet. Create your first survey to get started.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    surveys.map((survey) => (
                        <Card key={survey._id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{survey.name}</CardTitle>
                                        {survey.description && (
                                            <CardDescription className="mt-1">{survey.description}</CardDescription>
                                        )}
                                    </div>
                                    <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                                        {survey.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Pools</p>
                                            <p className="font-medium">{survey.pool_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Total Responses</p>
                                            <p className="font-medium">{survey.response_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Created</p>
                                            <p className="font-medium">
                                                {new Date(survey.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/admin/feedback-360/surveys/${survey._id}`)}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Details
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/admin/feedback-360/surveys/${survey._id}/edit`)}
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/admin/feedback-360/surveys/${survey._id}/pools/create`)}
                                        >
                                            <Users className="mr-2 h-4 w-4" />
                                            Create Pool
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive"
                                            onClick={() => handleDeleteSurvey(survey._id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
