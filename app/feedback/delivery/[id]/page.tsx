"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Star, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import API_URL from "@/lib/apiBase"
import Confetti from "react-confetti"

const AREAS_OF_IMPROVEMENT = [
  "Delivery Speed",
  "Product Quality",
  "Customer Service",
  "Packaging",
  "Communication",
  "Pricing",
]

export default function DeliveryFeedbackPage() {
  const params = useParams()
  const invoiceId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState("")

  const [deliveryData, setDeliveryData] = useState<any>(null)
  
  const [productRating, setProductRating] = useState<number>(0)
  const [serviceRating, setServiceRating] = useState<number>(0)
  const [areasOfImprovement, setAreasOfImprovement] = useState<string[]>([])
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [comments, setComments] = useState("")

  useEffect(() => {
    fetchDeliveryDetails()
  }, [invoiceId])

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  async function fetchDeliveryDetails() {
    try {
      const res = await fetch(`${API_URL}/api/stock/public/delivery-feedback/${invoiceId}`)
      const data = await res.json()
      if (data.success) {
        setDeliveryData(data.data)
      } else if (data.data?.alreadySubmitted) {
        setSubmitted(true)
      } else {
        setError(data.message || "Failed to load delivery details")
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const toggleArea = (option: string) => {
    setAreasOfImprovement((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    )
  }

  const handleSubmit = async () => {
    if (!productRating || !serviceRating || wouldRecommend === null) {
      setError("Please provide ratings and let us know if you would recommend us.")
      return
    }
    
    setSubmitting(true)
    setError("")
    
    try {
      const res = await fetch(`${API_URL}/api/stock/public/delivery-feedback/${invoiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productRating,
          serviceRating,
          areasOfImprovement,
          wouldRecommend,
          comments
        })
      })
      
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
        setShowConfetti(true)
      } else {
        setError(data.message || "Failed to submit feedback")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 relative overflow-hidden">
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        <Card className="w-full max-w-md text-center py-8 z-10 shadow-lg border-green-100">
          <CardContent className="flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4 animate-in zoom-in duration-500" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">Your feedback has been successfully submitted. We appreciate your time.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !deliveryData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-red-500">
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Delivery Feedback</CardTitle>
          <CardDescription>
            {deliveryData?.clientName ? `For ${deliveryData.clientName}` : "Rate your recent delivery"}
            {deliveryData?.invoiceNumber && ` • Inv: ${deliveryData.invoiceNumber}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {error && <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">{error}</div>}

          {/* Product Rating */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block text-center">
              How would you rate the product?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={`prod-${star}`}
                  type="button"
                  onClick={() => setProductRating(star)}
                  className="focus:outline-none transition-transform active:scale-95"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= productRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Service Rating */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block text-center">
              How was the delivery & service?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={`serv-${star}`}
                  type="button"
                  onClick={() => setServiceRating(star)}
                  className="focus:outline-none transition-transform active:scale-95"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= serviceRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Would Recommend */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-semibold text-gray-700 block text-center">
              Would you recommend us to someone?
            </label>
            <div className="flex justify-center gap-4">
              <Button
                variant={wouldRecommend === true ? "default" : "outline"}
                className={`w-24 ${wouldRecommend === true ? "bg-green-600 hover:bg-green-700" : ""}`}
                onClick={() => setWouldRecommend(true)}
              >
                Yes
              </Button>
              <Button
                variant={wouldRecommend === false ? "default" : "outline"}
                className={`w-24 ${wouldRecommend === false ? "bg-red-600 hover:bg-red-700" : ""}`}
                onClick={() => setWouldRecommend(false)}
              >
                No
              </Button>
            </div>
          </div>

          {/* Areas of Improvement Chips */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-medium text-gray-600 block text-center">
              Areas of improvement (Optional)
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              {AREAS_OF_IMPROVEMENT.map((option) => (
                <Badge
                  key={option}
                  variant={areasOfImprovement.includes(option) ? "default" : "outline"}
                  className="cursor-pointer py-1.5 px-3 rounded-full text-sm font-normal"
                  onClick={() => toggleArea(option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-gray-600">
              Any other comments? (Optional)
            </label>
            <Textarea
              placeholder="Tell us more about your experience..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <Button 
            className="w-full h-12 text-lg font-semibold mt-2" 
            onClick={handleSubmit} 
            disabled={submitting || !productRating || !serviceRating || wouldRecommend === null}
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
