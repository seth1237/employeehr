"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Star, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import API_URL from "@/lib/apiBase"
import { getAuthHeader } from "@/lib/auth"

export default function DeliveryFeedbackAdminPage() {
  const [loading, setLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState<any[]>([])

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/crm/delivery-feedback`, {
        headers: getAuthHeader()
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.success) {
        setFeedbacks(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch delivery feedbacks:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Delivery Feedback</h1>
        <p className="text-muted-foreground mt-2">
          View post-delivery ratings and feedback submitted by clients.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Responses</CardTitle>
          <CardDescription>
            Feedback links are automatically sent to clients via SMS when an invoice is marked as delivered by Dispatch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>No feedback responses received yet.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client & Invoice</TableHead>
                    <TableHead>Product Rating</TableHead>
                    <TableHead>Service Rating</TableHead>
                    <TableHead>Would Recommend</TableHead>
                    <TableHead>Areas of Improvement</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(item.submittedAt), "PPp")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.clientName}</div>
                        <div className="text-xs text-muted-foreground">
                          Inv: {item.invoiceNumber}
                        </div>
                      </TableCell>
                      <TableCell>{renderStars(item.productRating)}</TableCell>
                      <TableCell>{renderStars(item.serviceRating)}</TableCell>
                      <TableCell>
                        {item.wouldRecommend === true && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yes</Badge>}
                        {item.wouldRecommend === false && <Badge variant="destructive">No</Badge>}
                        {item.wouldRecommend === undefined && <span className="text-muted-foreground italic text-xs">Unanswered</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.areasOfImprovement?.map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] whitespace-nowrap">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.comments}>
                        {item.comments || <span className="text-muted-foreground italic">None</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
