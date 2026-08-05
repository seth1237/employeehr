"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { getToken } from "@/lib/auth"
import { Lightbulb, ThumbsUp, MessageSquare } from "lucide-react"
import API_URL from "@/lib/apiBase"


interface Suggestion {
  _id: string
  is_anonymous: boolean
  title: string
  description: string
  category: string
  status: string
  upvotes: number
  upvoted_by: string[]
  admin_response?: string
  created_at: string
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "workplace",
    is_anonymous: false,
  })

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setSuggestions(data.data)
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        setSuggestions([data.data, ...suggestions])
        setDialogOpen(false)
        setFormData({
          title: "",
          description: "",
          category: "workplace",
          is_anonymous: false,
        })
      }
    } catch (error) {
      console.error("Error creating suggestion:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (suggestionId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/suggestions/${suggestionId}/upvote`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setSuggestions(
          suggestions.map((s) => (s._id === suggestionId ? data.data : s))
        )
      }
    } catch (error) {
      console.error("Error upvoting suggestion:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      submitted: "bg-blue-100 text-blue-800",
      under_review: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      implemented: "bg-purple-100 text-purple-800",
      rejected: "bg-red-100 text-red-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Suggestions Box</h1>
          <p className="text-muted-foreground mt-1">
            Share your ideas to improve our workplace
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Lightbulb className="h-4 w-4 mr-2" />
              New Suggestion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit a Suggestion</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for your suggestion"
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your suggestion in detail"
                  rows={4}
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workplace">Workplace</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="benefits">Benefits</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="anonymous">Submit Anonymously</Label>
                <Switch
                  id="anonymous"
                  checked={formData.is_anonymous}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_anonymous: checked })
                  }
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {suggestions.length === 0 ? (
          <Card className="p-8 text-center">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No suggestions yet. Be the first to share your ideas!
            </p>
          </Card>
        ) : (
          suggestions.map((suggestion) => (
            <Card key={suggestion._id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{suggestion.title}</h3>
                    <Badge className="capitalize">{suggestion.category}</Badge>
                    <Badge className={getStatusBadge(suggestion.status)}>
                      {suggestion.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">{suggestion.description}</p>
                  {suggestion.is_anonymous && (
                    <p className="text-xs text-muted-foreground italic">Anonymous suggestion</p>
                  )}
                </div>
              </div>

              {suggestion.admin_response && (
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-semibold text-sm">Admin Response:</span>
                  </div>
                  <p className="text-sm">{suggestion.admin_response}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpvote(suggestion._id)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{suggestion.upvotes} upvotes</span>
                </Button>
                <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
