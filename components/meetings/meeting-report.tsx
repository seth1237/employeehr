'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle,
  AlertCircle,
  Loader,
  MessageSquare,
  Users,
  Target,
  Clock,
  LogIn,
  LogOut,
  Calendar,
  FileText,
} from 'lucide-react'

interface ActionItem {
  description: string
  assigned_to: string
  due_date?: string
  task_id?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

interface Attendee {
  user_id: string
  display_name?: string
  user?: any
  joined_at?: string
  left_at?: string
  duration_minutes?: number
  status: 'invited' | 'joined' | 'left'
  attended?: boolean
}

interface MeetingReportProps {
  title: string
  summary?: string
  keyPoints?: string[]
  actionItems?: ActionItem[]
  transcript?: string
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  attendees?: Attendee[]
  scheduled_start?: string
  scheduled_end?: string
  actual_start_time?: string
  actual_end_time?: string
  meeting_type?: string
  organizer?: any
}

export function MeetingReport({
  title,
  summary,
  keyPoints = [],
  actionItems = [],
  transcript = '',
  processingStatus = 'pending',
  processingError = '',
  sentiment = 'neutral',
  attendees = [],
  scheduled_start,
  scheduled_end,
  actual_start_time,
  actual_end_time,
  meeting_type = 'team',
  organizer,
}: MeetingReportProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'negative':
        return '😟'
      default:
        return '😐'
    }
  }

  // Calculate attendance metrics
  const attendedCount = attendees?.filter((a) => a.attended || a.status === 'left').length ?? 0
  const invitedCount = attendees?.length ?? 0
  const attendanceRate = invitedCount > 0 ? Math.round((attendedCount / invitedCount) * 100) : 0

  // Calculate meeting duration
  const getMeetingDuration = () => {
    if (actual_start_time && actual_end_time) {
      const start = new Date(actual_start_time).getTime()
      const end = new Date(actual_end_time).getTime()
      return Math.round((end - start) / (1000 * 60)) // minutes
    }
    if (scheduled_start && scheduled_end) {
      const start = new Date(scheduled_start).getTime()
      const end = new Date(scheduled_end).getTime()
      return Math.round((end - start) / (1000 * 60))
    }
    return 0
  }

  const meetingDuration = getMeetingDuration()

  // Calculate average attendance duration
  const getAverageDuration = () => {
    const durations = attendees
      ?.filter((a) => a.duration_minutes && a.duration_minutes > 0)
      .map((a) => a.duration_minutes || 0) ?? []
    
    if (durations.length === 0) return 0
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  }

  const avgDuration = getAverageDuration()

  // Format attendance status
  const formatAttendeeStatus = (attendee: Attendee) => {
    if (attendee.status === 'left' || attendee.attended) {
      return 'Attended'
    }
    if (attendee.status === 'joined') {
      return 'Still in Meeting'
    }
    return 'Invited'
  }

  if (processingStatus === 'processing') {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center">
          <Loader
            className="w-8 h-8 animate-spin mb-4"
            style={{ color: 'var(--brand-primary, #2563eb)' }}
          />
          <h3 className="text-lg font-semibold mb-2">Processing Meeting</h3>
          <p className="text-gray-600 text-center">
            Our AI is analyzing the meeting transcript and generating insights.
            This usually takes 1-2 minutes.
          </p>
        </div>
      </Card>
    )
  }

  if (processingStatus === 'failed') {
    return (
      <Card className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <h3 className="font-semibold mb-2">Processing Failed</h3>
              <p className="text-sm">{processingError}</p>
            </div>
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  if (processingStatus !== 'completed') {
    return (
      <Card className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Meeting report is not yet available. Please check back later.
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <div
      className="space-y-6"
      style={{
        fontFamily: 'var(--brand-font, inherit)',
        color: 'var(--brand-text, inherit)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-md bg-no-repeat bg-contain bg-center border"
            style={{
              backgroundImage: "var(--company-logo-url)",
              borderColor: 'var(--brand-primary, rgba(59, 130, 246, 0.35))',
            }}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--brand-primary, #2563eb)' }}>
              {title}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getSentimentIcon(sentiment)}</span>
              <Badge
                variant={
                  sentiment === 'positive'
                    ? 'default'
                    : sentiment === 'negative'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Sentiment
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="points">Key Points</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Executive Summary
            </h3>
            {summary ? (
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            ) : (
              <p className="text-gray-500">No summary available</p>
            )}
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          {/* Meeting Info */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Meeting Date</p>
                  <p className="font-semibold">
                    {actual_start_time
                      ? new Date(actual_start_time).toLocaleString()
                      : scheduled_start
                        ? new Date(scheduled_start).toLocaleString()
                        : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Meeting Duration</p>
                  <p className="font-semibold">{meetingDuration} minutes</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Attendance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {attendedCount}
              </div>
              <p className="text-sm text-gray-600">Attended</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {invitedCount}
              </div>
              <p className="text-sm text-gray-600">Invited</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {attendanceRate}%
              </div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {avgDuration}m
              </div>
              <p className="text-sm text-gray-600">Avg Duration</p>
            </Card>
          </div>

          {/* Attendee List */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Attendee Details
            </h3>
            {attendees && attendees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-semibold">Name</th>
                      <th className="text-left py-2 px-3 font-semibold">Status</th>
                      <th className="text-left py-2 px-3 font-semibold">Joined At</th>
                      <th className="text-left py-2 px-3 font-semibold">Left At</th>
                      <th className="text-left py-2 px-3 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((attendee, idx) => (
                      <tr
                        key={`${attendee.user_id}-${idx}`}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-3 font-medium">
                          {attendee.display_name ||
                            attendee.user?.firstName ||
                            attendee.user?.first_name ||
                            'Unknown'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              formatAttendeeStatus(attendee) === 'Attended'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {formatAttendeeStatus(attendee)}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {attendee.joined_at ? (
                              <>
                                <LogIn className="w-4 h-4 text-green-600" />
                                <span>
                                  {new Date(attendee.joined_at).toLocaleTimeString()}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {attendee.left_at ? (
                              <>
                                <LogOut className="w-4 h-4 text-red-600" />
                                <span>
                                  {new Date(attendee.left_at).toLocaleTimeString()}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">Still present</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          {attendee.duration_minutes
                            ? `${attendee.duration_minutes}m`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No attendee data available</p>
            )}
          </Card>
        </TabsContent>

        {/* Key Points Tab */}
        <TabsContent value="points" className="space-y-3">
          {keyPoints.length > 0 ? (
            <div className="grid gap-3">
              {keyPoints.map((point, idx) => (
                <Card key={idx} className="p-4 flex gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--brand-secondary, #059669)' }}
                  />
                  <p className="text-gray-700">{point}</p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No key points identified</p>
            </Card>
          )}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-3">
          {actionItems.length > 0 ? (
            <div className="grid gap-3">
              {actionItems.map((item, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {item.description}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {item.assigned_to}
                        </Badge>
                        {item.due_date && (
                          <Badge variant="outline">
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </Badge>
                        )}
                        {item.priority && (
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority.charAt(0).toUpperCase() +
                              item.priority.slice(1)}{' '}
                            Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.task_id && (
                      <Badge variant="secondary">Task Created</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No action items identified</p>
            </Card>
          )}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-4">
          <Card className="p-6">
            {transcript ? (
              <div className="max-h-96 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {transcript}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No transcript available
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--brand-primary, #2563eb)' }}>
            {keyPoints.length}
          </div>
          <p className="text-sm text-gray-600">Key Points</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--brand-secondary, #059669)' }}>
            {attendedCount}/{invitedCount}
          </div>
          <p className="text-sm text-gray-600">Attended</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold mb-1 text-purple-600">
            {attendanceRate}%
          </div>
          <p className="text-sm text-gray-600">Attendance Rate</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold mb-1 text-orange-600">
            {meetingDuration}m
          </div>
          <p className="text-sm text-gray-600">Duration</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--brand-accent, #7c3aed)' }}>
            {actionItems.filter((a) => a.task_id).length}
          </div>
          <p className="text-sm text-gray-600">Tasks Created</p>
        </Card>
      </div>
    </div>
  )
}
