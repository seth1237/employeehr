'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Check, Loader2, AlertCircle, Mail, ArrowLeft } from 'lucide-react'

interface PoolLink {
    employee_id: string
    employee_name: string
    employee_email: string
    anonymous_link: string
    submission_count: number
}

export default function PoolLinksPage() {
    const params = useParams()
    const router = useRouter()
    const poolId = params.poolId as string

    const [links, setLinks] = useState<PoolLink[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

    useEffect(() => {
        fetchLinks()
    }, [poolId])

    const fetchLinks = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

            const res = await fetch(`${API_URL}/api/feedback-360/pools/${poolId}/generate-links`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) throw new Error('Failed to generate links')

            const data = await res.json()
            setLinks(data.data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (link: string, index: number) => {
        navigator.clipboard.writeText(link)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const sendEmailWithLink = (email: string, link: string, name: string) => {
        const subject = encodeURIComponent('360° Feedback Request')
        const body = encodeURIComponent(
            `Hi ${name},\n\nYou have been selected to participate in a 360-degree feedback session. Please use the link below to provide anonymous feedback for your colleagues:\n\n${link}\n\nThis link is unique to you and should not be shared. You will need to provide feedback for 4 colleagues.\n\nThank you for your participation!`
        )
        window.open(`mailto:${email}?subject=${subject}&body=${body}`)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Anonymous Feedback Links</h1>
                    <p className="text-muted-foreground">
                        Distribute these unique links to pool members
                    </p>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Important:</strong> Each link is unique and should only be sent to the
                    corresponding employee. Links are valid for 90 days and allow exactly 4 feedback
                    submissions.
                </AlertDescription>
            </Alert>

            <div className="grid gap-4">
                {links.map((link, index) => (
                    <Card key={link.employee_id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{link.employee_name}</CardTitle>
                                    <CardDescription>{link.employee_email}</CardDescription>
                                </div>
                                <Badge variant={link.submission_count === 4 ? 'secondary' : 'default'}>
                                    {link.submission_count} / 4 completed
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={link.anonymous_link}
                                    readOnly
                                    className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(link.anonymous_link, index)}
                                >
                                    {copiedIndex === index ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() =>
                                    sendEmailWithLink(link.employee_email, link.anonymous_link, link.employee_name)
                                }
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Send via Email
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
