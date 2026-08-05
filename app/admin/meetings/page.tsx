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
import { PageLoadingSkeleton } from '@/components/admin/ui/page-states'

interface Branding {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [view, setView] = useState<'list' | 'meeting' | 'report'>('list')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [branding, setBranding] = useState<Branding>({})

  useEffect(() => {
    // Get current user from auth
    const user = getUser()
    if (user) {
      setCurrentUserId(user._id || user.userId || '')
    }

    // Load branding and meetings
    loadBrandingAndMeetings()
  }, [])

  const loadBrandingAndMeetings = async () => {
    try {
      setIsLoading(true)
      // Fetch branding
      const brandingRes = await companyApi.getBranding()
      if (brandingRes.success) {
        setBranding(brandingRes.data || {})
      }
      // Fetch meetings
      await fetchMeetings()
    } catch (error) {
      console.error('Error loading page:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMeetings = async () => {
    try {
      setIsLoading(true)
      const response = await meetingsApi.getAll()
      if (response.success) {
        setMeetings(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createMeeting = async (meetingData: any) => {
    try {
      const response = await meetingsApi.create(meetingData)
      if (response.success) {
        await fetchMeetings()
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
      throw error
    }
  }

  const startMeeting = async (meetingId: string) => {
    try {
      await meetingsApi.start(meetingId)
      await fetchMeetings()
    } catch (error) {
      console.error('Error starting meeting:', error)
      throw error
    }
  }

  const endMeeting = async (meetingId: string, transcript: string) => {
    try {
      await meetingsApi.end(meetingId, transcript)
      await fetchMeetings()
    } catch (error) {
      console.error('Error ending meeting:', error)
      throw error
    }
  }

  const downloadReport = async (meetingId: string) => {
    try {
      const response = await meetingsApi.getReport(meetingId)
      if (response.success) {
        // Create downloadable HTML file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meeting-report-${meetingId}.json`
        a.click()
      }
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    // Show report for completed or cancelled meetings
    if (meeting.status === 'completed' || meeting.status === 'cancelled') {
      setView('report')
    } else if (meeting.status === 'in_progress') {
      setView('meeting')
    } else {
      // Default to meeting view for scheduled meetings
      setView('meeting')
    }
  }

  const handleBack = () => {
    setView('list')
    setSelectedMeeting(null)
    fetchMeetings()
  }

  if (isLoading) return <PageLoadingSkeleton title="Loading meetings" rows={8} />

  const primaryColor = branding.primaryColor || '#2563eb'
  const secondaryColor = branding.secondaryColor || '#059669'
  const backgroundColor = branding.backgroundColor || '#f9fafb'
  const textColor = branding.textColor || '#1f2937'

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor }}
    >
      {view === 'list' ? (
        <div className="container mx-auto p-6">
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
        <div
          className="inset-0 fixed z-50 min-h-screen flex flex-col"
          style={{ backgroundColor }}
        >
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
            <ArrowLeft className="w-4 h-4 mr-2" />
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
        <div className="container mx-auto p-6">
          <Button
            onClick={handleBack}
            style={{
              color: '#ffffff',
              backgroundColor: primaryColor,
            }}
            className="mb-4 border-0 hover:opacity-90"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
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
          />
        </div>
      ) : null}
    </div>
  )
}
