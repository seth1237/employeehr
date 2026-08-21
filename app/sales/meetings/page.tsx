'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, Clock, RefreshCw, Users, Video } from 'lucide-react'
import { MeetingInterface } from '@/components/meetings/meeting-interface-webrtc'
import { MeetingReport } from '@/components/meetings/meeting-report'
import { Button } from '@/components/ui/button'
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states'
import {
  SalesEmpty,
  SalesHeader,
  SalesKpi,
  SalesPage,
  SalesStatusBadge,
} from '@/components/sales/sales-ui'
import { useSalesBranding } from '@/hooks/use-sales-branding'
import { useToast } from '@/hooks/use-toast'
import { meetingsApi } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

type SalesMeeting = {
  _id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  meeting_type: 'video' | 'audio' | 'in-person'
  meeting_link?: string
  meeting_id: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  organizer_id: string
  organizer?: any
  actual_start_time?: string
  actual_end_time?: string
  attendees: Array<{
    user_id: string
    display_name?: string
    is_guest?: boolean
    status: string
    attended: boolean
    user?: any
  }>
  ai_processed?: boolean
  ai_processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_processing_error?: string
  ai_summary?: string
  key_points?: string[]
  action_items?: any[]
  transcript?: string
}

function organizerLabel(meeting: SalesMeeting) {
  const org = meeting.organizer
  if (!org) return 'Host'
  const name = `${org.firstName || ''} ${org.lastName || ''}`.trim()
  return name || org.email || 'Host'
}

function statusLabel(status: SalesMeeting['status']) {
  if (status === 'in-progress') return 'Live'
  if (status === 'scheduled') return 'Scheduled'
  if (status === 'completed') return 'Completed'
  return 'Cancelled'
}

export default function SalesMeetingsPage() {
  const branding = useSalesBranding()
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<SalesMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedMeeting, setSelectedMeeting] = useState<SalesMeeting | null>(null)
  const [view, setView] = useState<'list' | 'meeting' | 'report'>('list')
  const [tab, setTab] = useState<'join' | 'past'>('join')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await meetingsApi.getAll()
      if (response.success) {
        setMeetings((response.data as SalesMeeting[]) || [])
      } else {
        toast({
          title: 'Could not load meetings',
          description: response.message || 'Try again in a moment.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Could not load meetings',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const user = getUser()
    if (user) setCurrentUserId(user._id || user.userId || '')
    void load()
  }, [load])

  const { joinable, past, liveCount } = useMemo(() => {
    const joinableList = meetings
      .filter((m) => m.status === 'scheduled' || m.status === 'in-progress')
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      )

    const pastList = meetings
      .filter((m) => {
        if (m.status !== 'completed' && m.status !== 'cancelled') return false
        const me = m.attendees?.find((a) => String(a.user_id) === String(currentUserId))
        return Boolean(me?.attended)
      })
      .sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
      )

    return {
      joinable: joinableList,
      past: pastList,
      liveCount: joinableList.filter((m) => m.status === 'in-progress').length,
    }
  }, [meetings, currentUserId])

  const handleJoin = async (meeting: SalesMeeting) => {
    setJoiningId(meeting._id)
    try {
      const joinRes = await meetingsApi.join(meeting._id)
      const fresh = joinRes.success && joinRes.data ? (joinRes.data as SalesMeeting) : meeting
      // Prefer latest full record when available
      const detail = await meetingsApi.getById(meeting._id).catch(() => null)
      const next = (detail?.success && detail.data ? detail.data : fresh) as SalesMeeting
      setSelectedMeeting(next)
      setView('meeting')
      await load()
    } catch (err: any) {
      toast({
        title: 'Could not join',
        description: err?.message || 'The meeting may not be available yet.',
        variant: 'destructive',
      })
    } finally {
      setJoiningId(null)
    }
  }

  const handleOpenPast = (meeting: SalesMeeting) => {
    setSelectedMeeting(meeting)
    setView('report')
  }

  const handleBack = () => {
    setView('list')
    setSelectedMeeting(null)
    void load()
  }

  const startMeeting = async (meetingId: string) => {
    await meetingsApi.start(meetingId)
    await load()
  }

  const endMeeting = async (meetingId: string, transcript: string) => {
    await meetingsApi.end(meetingId, transcript)
    await load()
  }

  if (view === 'meeting' && selectedMeeting) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-slate-950">
        <Button
          onClick={handleBack}
          className="ml-3 mt-3 w-fit border-0 bg-white/10 text-white hover:bg-white/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to meetings
        </Button>
        <div className="min-h-0 flex-1">
          <MeetingInterface
            meeting={selectedMeeting as any}
            currentUserId={currentUserId}
            onStartMeeting={startMeeting}
            onEndMeeting={endMeeting}
            brandingColors={{
              primary: branding.primaryColor,
              secondary: branding.secondaryColor,
            }}
          />
        </div>
      </div>
    )
  }

  if (view === 'report' && selectedMeeting) {
    return (
      <SalesPage>
        <Button
          onClick={handleBack}
          variant="outline"
          className="mb-2 border-slate-200 bg-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to meetings
        </Button>
        <MeetingReport
          title={selectedMeeting.title}
          summary={selectedMeeting.ai_summary}
          keyPoints={selectedMeeting.key_points}
          actionItems={selectedMeeting.action_items}
          transcript={selectedMeeting.transcript}
          processingStatus={selectedMeeting.ai_processing_status}
          attendees={selectedMeeting.attendees}
          scheduled_start={selectedMeeting.scheduled_at}
          actual_start_time={selectedMeeting.actual_start_time}
          actual_end_time={selectedMeeting.actual_end_time}
          meeting_type={selectedMeeting.meeting_type}
          organizer={selectedMeeting.organizer}
          brandingColors={{
            primary: branding.primaryColor,
            secondary: branding.secondaryColor,
          }}
        />
      </SalesPage>
    )
  }

  const list = tab === 'join' ? joinable : past

  return (
    <SalesPage>
      <SalesHeader
        color={branding.primaryColor}
        title="Meetings"
        description="Join meetings you were invited to, and review ones you have already attended."
        actions={
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 bg-white"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SalesKpi
          label="Ready to join"
          value={joinable.length}
          hint={liveCount > 0 ? `${liveCount} live now` : 'Invited upcoming'}
          icon={Video}
          color={branding.primaryColor}
          tone={liveCount > 0 ? 'success' : 'default'}
        />
        <SalesKpi
          label="Attended before"
          value={past.length}
          hint="Completed invitations"
          icon={Calendar}
          color={branding.primaryColor}
        />
        <SalesKpi
          label="Live now"
          value={liveCount}
          hint="In progress"
          icon={Users}
          color={branding.primaryColor}
          tone={liveCount > 0 ? 'success' : 'default'}
        />
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('join')}
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium',
            tab === 'join' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          Join ({joinable.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('past')}
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium',
            tab === 'past' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          Attended ({past.length})
        </button>
      </div>

      {loading ? (
        <PageLoadingSkeleton title="Loading meetings" rows={5} />
      ) : list.length === 0 ? (
        <SalesEmpty
          title={tab === 'join' ? 'No meetings to join' : 'No past meetings yet'}
          description={
            tab === 'join'
              ? 'When someone invites you to a meeting, it will show up here so you can join.'
              : 'Meetings you attend will appear here after they end.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {list.map((meeting) => {
            const canJoin =
              meeting.status === 'scheduled' || meeting.status === 'in-progress'
            return (
              <li
                key={meeting._id}
                className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-slate-900">
                        {meeting.title}
                      </h2>
                      <SalesStatusBadge
                        status={meeting.status}
                        label={statusLabel(meeting.status)}
                      />
                    </div>
                    {meeting.description ? (
                      <p className="line-clamp-2 text-sm text-slate-600">
                        {meeting.description}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(meeting.scheduled_at), 'EEE, MMM d · h:mm a')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {meeting.duration_minutes || 60} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Host: {organizerLabel(meeting)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {canJoin ? (
                      <Button
                        type="button"
                        disabled={joiningId === meeting._id}
                        className="min-h-11 flex-1 border-0 text-white sm:flex-none"
                        style={{ backgroundColor: branding.primaryColor || '#0f766e' }}
                        onClick={() => void handleJoin(meeting)}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        {joiningId === meeting._id
                          ? 'Joining…'
                          : meeting.status === 'in-progress'
                            ? 'Join now'
                            : 'Enter'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 flex-1 border-slate-200 bg-white sm:flex-none"
                        onClick={() => handleOpenPast(meeting)}
                      >
                        View summary
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SalesPage>
  )
}
