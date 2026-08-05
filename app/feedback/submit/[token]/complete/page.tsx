'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export default function FeedbackCompletePage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl">Thank You!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        You have successfully completed all 4 feedback submissions.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Your anonymous feedback will help your colleagues grow and develop. The aggregated
                        insights will be used exclusively for learning and development purposes.
                    </p>
                    <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                            You can now close this window. Your responses have been securely saved.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
