'use client'

import { useState, useEffect } from 'react'
import { MeetingList } from '@/components/meetings/meeting-list'
import { MeetingInterface } from '@/components/meetings/meeting-interface-webrtc'
import { MeetingReport } from '@/components/meetings/meeting-report'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { meetingsApi, companyApi } from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { Meeting } from '@/lib/types'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [view, setView] = useState<'list' | 'meeting' | 'report'>('list')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branding, setBranding] = useState<{
    primaryColor?: string
    secondaryColor?: string
    backgroundColor?: string
    textColor?: string
  }>({})

  useEffect(() => {
    const user = getUser()
    if (user) {
      setCurrentUserId(user._id || user.userId || '')
    }
    void loadPage()
  }, [])

  const loadPage = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const brandingRes = await companyApi.getBranding().catch(() => null)
      if (brandingRes?.success) {
        setBranding(brandingRes.data || {})
      }
      await fetchMeetings()
    } catch (err: any) {
      setError(err?.message || 'Failed to load meetings')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMeetings = async () => {
    const response = await meetingsApi.getAll()
    if (response.success) {
      setMeetings(response.data || [])
      setError(null)
    } else {
      setError(response.message || 'Failed to load meetings')
    }
  }

  const createMeeting = async (meetingData: any) => {
    const response = await meetingsApi.create(meetingData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create meeting')
    }
    await fetchMeetings()
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

  const primaryColor = branding.primaryColor || '#0f766e'
  const secondaryColor = branding.secondaryColor || '#0ea5e9'
  const backgroundColor = branding.backgroundColor || '#f8fafc'
  const textColor = branding.textColor || '#0f172a'

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
            style={{ borderColor: primaryColor }}
          />
          <p className="text-muted-foreground">Loading meetings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor, color: textColor }}>
      {view === 'list' ? (
        <div className="container mx-auto space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
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
            className="ml-4 mt-4 w-fit border-0 text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
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
            className="border-0 text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
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
