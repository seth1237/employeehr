'use client'

import { useState, useEffect } from 'react'
import { MeetingList } from '@/components/meetings/meeting-list'
import { MeetingInterface } from '@/components/meetings/meeting-interface'
import { MeetingReport } from '@/components/meetings/meeting-report'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { meetingsApi } from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { Meeting } from '@/lib/types'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [view, setView] = useState<'list' | 'meeting' | 'report'>('list')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get current user from auth
    const user = getUser()
    if (user) {
      setCurrentUserId(user._id || user.userId || '')
    }

    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    try {
      setIsLoading(true)
      const response = await meetingsApi.getAll()
      if (response.success) {
        setMeetings(response.data)
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
    if (meeting.status === 'completed' || meeting.status === 'cancelled') {
      setView('report')
    } else if (meeting.status === 'in-progress') {
      setView('meeting')
    } else {
      setView('meeting')
    }
  }

  const handleBack = () => {
    setView('list')
    setSelectedMeeting(null)
    fetchMeetings()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meetings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'list' ? (
        <div className="container mx-auto p-6">
          <MeetingList
            meetings={meetings}
            currentUserId={currentUserId}
            onCreateMeeting={createMeeting}
            onSelectMeeting={handleSelectMeeting}
            onDownloadReport={downloadReport}
          />
        </div>
      ) : view === 'meeting' && selectedMeeting ? (
        <div className="relative">
          <Button
            onClick={handleBack}
            className="absolute top-4 left-4 z-10 bg-gray-900 text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Meetings
          </Button>
          <MeetingInterface
            meeting={selectedMeeting}
            currentUserId={currentUserId}
            onStartMeeting={startMeeting}
            onEndMeeting={endMeeting}
          />
        </div>
      ) : view === 'report' && selectedMeeting ? (
        <div className="container mx-auto p-6">
          <Button onClick={handleBack} className="mb-4 bg-gray-900 text-white hover:bg-gray-800">
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
          />
        </div>
      ) : null}
    </div>
  )
}
