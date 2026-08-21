'use client'

import { useState, useEffect, useMemo } from 'react'
import { MeetingList } from '@/components/meetings/meeting-list'
import { MeetingInterface } from '@/components/meetings/meeting-interface-webrtc'
import { MeetingReport } from '@/components/meetings/meeting-report'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, RefreshCw, Video, CheckCircle2, Users } from 'lucide-react'
import { meetingsApi, companyApi } from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { Meeting } from '@/lib/types'
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states'

interface Branding {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  name?: string
  logo?: string
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [view, setView] = useState<'list' | 'meeting' | 'report'>('list')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [branding, setBranding] = useState<Branding>({})

  useEffect(() => {
    const user = getUser()
    if (user) {
      setCurrentUserId(user._id || user.userId || '')
    }
    void loadBrandingAndMeetings()
  }, [])

  const loadBrandingAndMeetings = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent)
    try {
      if (silent) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)

      const brandingRes = await companyApi.getBranding()
      if (brandingRes.success) {
        setBranding(brandingRes.data || {})
      }

      const response = await meetingsApi.getAll()
      if (response.success) {
        setMeetings(response.data || [])
      } else {
        setError(response.message || 'Failed to load meetings')
      }
    } catch (err: any) {
      console.error('Error loading page:', err)
      setError(err?.message || 'Failed to load meetings')
    } finally {
      if (silent) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }

  const fetchMeetings = async () => {
    try {
      const response = await meetingsApi.getAll()
      if (response.success) {
        setMeetings(response.data || [])
        setError(null)
      } else {
        setError(response.message || 'Failed to load meetings')
      }
    } catch (err: any) {
      console.error('Error fetching meetings:', err)
      setError(err?.message || 'Failed to load meetings')
    }
  }

  const createMeeting = async (meetingData: any) => {
    const response = await meetingsApi.create(meetingData)
    if (response.success) {
      await fetchMeetings()
      return
    }
    throw new Error(response.message || 'Failed to create meeting')
  }

  const startMeeting = async (meetingId: string) => {
    await meetingsApi.start(meetingId)
    await fetchMeetings()
  }

  const endMeeting = async (meetingId: string, transcript: string) => {
    await meetingsApi.end(meetingId, transcript)
    await fetchMeetings()
  }

  const downloadReport = async (meetingId: string) => {
    try {
      const response = await meetingsApi.getReport(meetingId)
      if (response.success) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meeting-report-${meetingId}.json`
        a.click()
      }
    } catch (err) {
      console.error('Error downloading report:', err)
    }
  }

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    if (meeting.status === 'completed' || meeting.status === 'cancelled') {
      setView('report')
    } else {
      setView('meeting')
    }
  }

  const handleBack = () => {
    setView('list')
    setSelectedMeeting(null)
    void fetchMeetings()
  }

  const stats = useMemo(() => {
    const now = Date.now()
    const upcoming = meetings.filter(
      (m) => m.status !== 'cancelled' && new Date(m.scheduled_at).getTime() >= now,
    ).length
    const live = meetings.filter((m) => m.status === 'in-progress').length
    const completed = meetings.filter((m) => m.status === 'completed').length
    const guests = meetings.reduce(
      (sum, m) =>
        sum +
        (m.attendees || []).filter(
          (a: any) => a.is_guest || String(a.user_id || '').startsWith('guest_'),
        ).length,
      0,
    )
    return { upcoming, live, completed, guests, total: meetings.length }
  }, [meetings])

  if (isLoading) return <PageLoadingSkeleton title="Loading meetings" rows={8} />

  const primaryColor = branding.primaryColor || '#0f766e'
  const secondaryColor = branding.secondaryColor || '#0ea5e9'
  const backgroundColor = branding.backgroundColor || '#f8fafc'
  const textColor = branding.textColor || '#0f172a'
  const primarySoft = hexToRgba(primaryColor, 0.08)
  const primaryBorder = hexToRgba(primaryColor, 0.18)

  const kpis = [
    { label: 'Upcoming', value: stats.upcoming, icon: Calendar },
    { label: 'Live now', value: stats.live, icon: Video },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
    { label: 'Guest joins', value: stats.guests, icon: Users },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor, color: textColor }}>
      {view === 'list' ? (
        <div className="container mx-auto space-y-5 p-6">
          <div
            className="rounded-2xl border p-5"
            style={{
              background: `linear-gradient(135deg, ${primarySoft}, ${hexToRgba(secondaryColor, 0.06)})`,
              borderColor: primaryBorder,
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                {branding.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logo}
                    alt={branding.name || 'Company'}
                    className="h-10 w-10 rounded-lg object-contain bg-white border"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Video className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {branding.name || 'ElevateHub'} · Meetings
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight">Meeting workspace</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Schedule, host, and review meetings with AI summaries — including guest attendees.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadBrandingAndMeetings({ silent: true })}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => {
                const Icon = kpi.icon
                return (
                  <Card key={kpi.label} className="border bg-white/80 shadow-none">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {kpi.label}
                        </CardTitle>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                        {kpi.value}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
            </Card>
          )}

          <MeetingList
            meetings={meetings}
            currentUserId={currentUserId}
            onCreateMeeting={createMeeting}
            onSelectMeeting={handleSelectMeeting}
            onDownloadReport={downloadReport}
            brandingColors={{
              primary: primaryColor,
              secondary: secondaryColor,
              background: backgroundColor,
              text: textColor,
            }}
          />
        </div>
      ) : view === 'meeting' && selectedMeeting ? (
        <div className="fixed inset-0 z-50 flex min-h-screen flex-col" style={{ backgroundColor }}>
          <Button
            onClick={handleBack}
            style={{
              color: '#ffffff',
              backgroundColor: primaryColor,
              marginTop: '1rem',
              marginLeft: '1rem',
            }}
            className="w-fit border-0 hover:opacity-90"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Button>
          <div className="flex-1 overflow-auto">
            <MeetingInterface
              meeting={selectedMeeting}
              currentUserId={currentUserId}
              onStartMeeting={startMeeting}
              onEndMeeting={endMeeting}
            />
          </div>
        </div>
      ) : view === 'report' && selectedMeeting ? (
        <div className="container mx-auto space-y-4 p-6">
          <Button
            onClick={handleBack}
            style={{ color: '#ffffff', backgroundColor: primaryColor }}
            className="border-0 hover:opacity-90"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
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
              primary: primaryColor,
              secondary: secondaryColor,
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
