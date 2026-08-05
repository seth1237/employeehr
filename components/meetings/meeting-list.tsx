'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  BarChart3,
  Download,
  Lock,
  Copy,
  Check,
  Play,
  Square,
  ExternalLink,
  Share2,
  Zap,
  Shield,
  Headphones,
  MapPin,
} from 'lucide-react'
import { format } from 'date-fns'
import { usersApi } from '@/lib/api'

interface Meeting {
  _id: string
  title: string
  description?: string
  scheduled_at: string
  actual_start_time?: string
  actual_end_time?: string
  duration_minutes: number
  meeting_type: 'video' | 'audio' | 'in-person'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  organizer_id: string
  attendees: Array<{
    user_id: string
    status: 'invited' | 'accepted' | 'declined'
    attended: boolean
    user?: any
  }>
  ai_processed: boolean
  ai_processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_summary?: string
  key_points?: string[]
}

interface MeetingListProps {
  meetings: Meeting[]
  currentUserId: string
  onCreateMeeting: (data: any) => Promise<void>
  onSelectMeeting: (meeting: Meeting) => void
  onDownloadReport: (meetingId: string) => Promise<void>
  brandingColors?: {
    primary?: string
    secondary?: string
    background?: string
    text?: string
  }
}

export function MeetingList({
  meetings,
  currentUserId,
  onCreateMeeting,
  onSelectMeeting,
  onDownloadReport,
  brandingColors,
}: MeetingListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    meeting_type: 'video' as const,
    require_password: false,
    password: '',
    attendees: [] as string[],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [copiedLink, setCopiedLink] = useState(false)

  // Fetch available users when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      fetchUsers()
    }
  }, [isCreateDialogOpen])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await usersApi.getAll()
      if (response.success && response.data) {
        // Filter out current user
        const users = response.data.filter((u: any) => u._id !== currentUserId)
        setAvailableUsers(users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const toggleAttendee = (userId: string) => {
    setSelectedAttendees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onCreateMeeting({
        ...formData,
        attendees: selectedAttendees,
      })
      setFormData({
        title: '',
        description: '',
        scheduled_at: '',
        duration_minutes: 60,
        meeting_type: 'video',
        require_password: false,
        password: '',
        attendees: [],
      })
      setSelectedAttendees([])
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating meeting:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />
      case 'audio':
        return <Headphones className="w-4 h-4" />
      case 'in-person':
        return <MapPin className="w-4 h-4" />
      default:
        return <Video className="w-4 h-4" />
    }
  }

  const getMeetingTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'audio':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'in-person':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>
      case 'in-progress':
        return <Badge className="bg-blue-600">In Progress</Badge>
      case 'scheduled':
        return <Badge className="bg-yellow-600">Scheduled</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProcessingStatus = (meeting: Meeting) => {
    if (!meeting.ai_processed) {
      return null
    }

    switch (meeting.ai_processing_status) {
      case 'processing':
        return (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Loader className="w-3 h-3 animate-spin" />
            Processing
          </div>
        )
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            Report Ready
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="w-3 h-3" />
            Processing Failed
          </div>
        )
      default:
        return null
    }
  }

  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) > new Date() && m.status !== 'cancelled'
  )

  const completedMeetings = meetings.filter((m) => m.status === 'completed')
  const meetingHistory = [...completedMeetings].sort((a, b) => {
    const aTime = new Date(a.actual_end_time || a.scheduled_at).getTime()
    const bTime = new Date(b.actual_end_time || b.scheduled_at).getTime()
    return bTime - aTime
  })

  return (
    <div className="space-y-6">
      {/* Create Meeting Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-2xl font-bold">Meetings</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Upcoming Meetings */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Meetings
        </h3>

        {upcomingMeetings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No upcoming meetings</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingMeetings.map((meeting) => (
              <Card key={meeting._id} className="p-5 hover:shadow-lg transition border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div className="flex-1">
                    {/* Title and Status */}
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getMeetingTypeIcon(meeting.meeting_type)}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{meeting.title}</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge className={`${getMeetingTypeColor(meeting.meeting_type)} border`}>
                              {meeting.meeting_type.charAt(0).toUpperCase() + meeting.meeting_type.slice(1)}
                            </Badge>
                            {getStatusBadge(meeting.status)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {meeting.description && (
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {meeting.description}
                      </p>
                    )}

                    {/* Meeting Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Date & Time</p>
                          <p className="text-sm font-semibold">
                            {format(new Date(meeting.scheduled_at), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Duration</p>
                          <p className="text-sm font-semibold">{meeting.duration_minutes || 60} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Attendees</p>
                          <p className="text-sm font-semibold">{meeting.attendees.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Meeting Link and Security */}
                    {(meeting as any).meeting_link && (
                      <div className="space-y-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-indigo-600" />
                            <p className="text-sm font-semibold text-gray-900">Meeting Link</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-indigo-200">
                          <input
                            type="text"
                            value={(meeting as any).meeting_link}
                            readOnly
                            className="flex-1 text-sm font-mono text-gray-700 bg-transparent outline-none truncate"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-indigo-100"
                            onClick={() => {
                              navigator.clipboard.writeText((meeting as any).meeting_link)
                              setCopiedLink(true)
                              setTimeout(() => setCopiedLink(false), 2000)
                            }}
                          >
                            {copiedLink ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-indigo-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-indigo-100"
                            onClick={() => window.open((meeting as any).meeting_link, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 text-indigo-600" />
                          </Button>
                        </div>
                        
                        {(meeting as any).require_password && (meeting as any).password && (
                          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <Shield className="w-5 h-5 text-yellow-700" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-yellow-900 mb-1">Password Protected</p>
                              <code className="text-sm font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-900">
                                {(meeting as any).password}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="w-full lg:w-auto flex flex-col gap-2">
                    <Button
                      onClick={() => onSelectMeeting(meeting)}
                      className="w-full lg:w-auto gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {meeting.status === 'in-progress' ? 'Join Now' : 'View Details'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Meetings with Reports */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Meeting History
        </h3>

        {meetingHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No completed meetings</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {meetingHistory.map((meeting) => (
              <Card key={meeting._id} className="p-5 hover:shadow-lg transition border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div className="flex-1">
                    {/* Title and Status */}
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{meeting.title}</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {getProcessingStatus(meeting)}
                            <Badge className="bg-green-600">Completed</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Summary */}
                    {meeting.ai_summary && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                        <p className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          AI Summary
                        </p>
                        <p className="text-sm text-blue-800 line-clamp-2">
                          {meeting.ai_summary}
                        </p>
                      </div>
                    )}

                    {/* Meeting Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Scheduled</p>
                        <p className="text-sm font-semibold">
                          {format(new Date(meeting.scheduled_at), 'MMM dd')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Started</p>
                        <p className="text-sm font-semibold">
                          {meeting.actual_start_time
                            ? format(new Date(meeting.actual_start_time), 'HH:mm')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Ended</p>
                        <p className="text-sm font-semibold">
                          {meeting.actual_end_time
                            ? format(new Date(meeting.actual_end_time), 'HH:mm')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Attendance</p>
                        <p className="text-sm font-semibold">
                          {meeting.attendees.filter((a) => a.attended).length}/{meeting.attendees.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <Button
                      onClick={() => onSelectMeeting(meeting)}
                      className="w-full sm:w-auto gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Report
                    </Button>
                    {meeting.ai_processing_status === 'completed' && (
                      <Button
                        onClick={() => onDownloadReport(meeting._id)}
                        variant="outline"
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Plus className="w-5 h-5 text-muted-foreground" />
              Schedule New Meeting
            </DialogTitle>
            <DialogDescription>
              Create a professional meeting and invite your team members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMeeting} className="space-y-6 mt-4">
            {/* Meeting Details Section */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/40">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Meeting Details
              </h3>

              <div>
                <label className="block text-sm font-semibold mb-2">Meeting Title *</label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Q1 Planning Session"
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add agenda, notes, or context for this meeting"
                  rows={3}
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Date & Time *</label>
                  <Input
                    required
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_at: e.target.value })
                    }
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Duration (minutes)</label>
                  <Input
                    type="number"
                    min="15"
                    max="480"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value),
                      })
                    }
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Meeting Type *</label>
                  <select
                    value={formData.meeting_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        meeting_type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-blue-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="video">Video</option>
                    <option value="audio">Audio Only</option>
                    <option value="in-person">In Person</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/40">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Security Settings
              </h3>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="require-password" className="cursor-pointer font-medium">
                    Require Password
                  </Label>
                </div>
                <Switch
                  id="require-password"
                  checked={formData.require_password}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, require_password: checked, password: checked ? formData.password : '' })
                  }
                />
              </div>
              
              {formData.require_password && (
                <div>
                  <Input
                    type="text"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Create a strong password"
                    required={formData.require_password}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    * Password will be included in the invitation email.
                  </p>
                </div>
              )}
            </div>

            {/* Attendees Section */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/40">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Invite Attendees
              </h3>
              
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedAttendees.length}</span> team member(s) selected
              </div>

              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-white rounded-lg">
                  <Loader className="w-4 h-4 animate-spin" />
                  Loading team members...
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-background border rounded-lg">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">No team members available</p>
                  ) : (
                    availableUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-blue-50 transition"
                      >
                        <Checkbox
                          id={`attendee-${user._id}`}
                          checked={selectedAttendees.includes(user._id)}
                          onCheckedChange={() => toggleAttendee(user._id)}
                        />
                        <label 
                          htmlFor={`attendee-${user._id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div className="font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Attendees will receive an email invitation with access links.
              </p>
            </div>

            {/* AI Processing Alert */}
            <Alert className="bg-primary/5 text-primary border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
              <AlertDescription className="font-medium text-sm">
                This meeting will be automatically transcribed and summarized using AI.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Meeting
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
