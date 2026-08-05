'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MeetingInterface } from '@/components/meetings/meeting-interface-webrtc'
import { getToken, getUser } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader, Video, Clock, Users, Calendar, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface Meeting {
  _id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  meeting_type: 'video' | 'audio' | 'in-person'
  meeting_link?: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  organizer_id: string
  attendees: Array<{
    user_id: string
    display_name?: string
    is_guest?: boolean
    status: 'invited' | 'accepted' | 'declined' | 'tentative'
    attended: boolean
    user?: any
  }>
  ai_processed: boolean
  ai_processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_summary?: string
  key_points?: string[]
  action_items?: any[]
  transcript?: string
  require_password?: boolean
  organizer?: any
}

interface GuestInfo {
  firstName: string
  lastName: string
  password: string
}

export default function MeetingPage() {
  const params = useParams() as { meetingId: string }
  const meetingId = String(params.meetingId || "")

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: '',
    lastName: '',
    password: '',
  })
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [passwordError, setPasswordError] = useState(false)
  const [timeUntilMeeting, setTimeUntilMeeting] = useState<string>('')
  const [canJoinMeeting, setCanJoinMeeting] = useState(false)
  const [meetingHistory, setMeetingHistory] = useState<Meeting[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndFetchMeeting()
  }, [meetingId])

  useEffect(() => {
    // Fetch meeting history after user is authenticated
    if (currentUserId || isGuest) {
      fetchMeetingHistory()
    }
  }, [currentUserId, isGuest])

  useEffect(() => {
    if (!meeting || showGuestForm) return
    if (meeting.status === 'completed' || meeting.status === 'cancelled') return

    const interval = setInterval(() => {
      if (isGuest) {
        fetchMeetingPublic(guestInfo.password || undefined)
        return
      }

      const token = localStorage.getItem('token')
      if (token) {
        fetchMeetingAuthenticated(token)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [meeting?._id, meeting?.status, showGuestForm, isGuest, guestInfo.password])

  // Countdown timer for scheduled meetings
  useEffect(() => {
    if (!meeting || meeting.status === 'in-progress' || meeting.status === 'completed') {
      setCanJoinMeeting(true)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const meetingTime = new Date(meeting.scheduled_at).getTime()
      const difference = meetingTime - now

      if (difference <= 0) {
        setTimeUntilMeeting('Meeting is starting...')
        setCanJoinMeeting(true)
      } else if (difference <= 5 * 60 * 1000) {
        // Allow joining 5 minutes before
        setCanJoinMeeting(true)
        const minutes = Math.floor(difference / 60000)
        const seconds = Math.floor((difference % 60000) / 1000)
        setTimeUntilMeeting(`Starting in ${minutes}m ${seconds}s`)
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

        if (days > 0) {
          setTimeUntilMeeting(`Meeting starts in ${days}d ${hours}h ${minutes}m`)
        } else if (hours > 0) {
          setTimeUntilMeeting(`Meeting starts in ${hours}h ${minutes}m`)
        } else {
          setTimeUntilMeeting(`Meeting starts in ${minutes}m`)
        }
        setCanJoinMeeting(false)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [meeting])

  const checkAuthAndFetchMeeting = async () => {
    const token = getToken()
    const user = getUser()

    if (token && user) {
      // User is logged in - fetch with auth
      setIsGuest(false)
      const userId = user._id || user.userId || ''
      setCurrentUserId(userId)
      const userName = `${(user as any).first_name || (user as any).firstName || ''} ${(user as any).last_name || (user as any).lastName || ''}`.trim() || 'User'
      setCurrentUserName(userName)
      fetchMeetingAuthenticated(token)
    } else {
      // Guest user - show form
      setIsGuest(true)
      setShowGuestForm(true)
      fetchMeetingPublic()
    }
  }

  const fetchMeetingAuthenticated = async (token: string, pwd?: string) => {
    try {
      setLoading(true)
      setError(null)

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hrapi.codewithseth.co.ke'
      let url = `${baseUrl}/api/meetings/by-meeting-id/${meetingId}`
      if (pwd) {
        url += `?password=${encodeURIComponent(pwd)}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.message?.includes('password')) {
          setPasswordError(true)
          throw new Error('Password required')
        }
        throw new Error(data.message || 'Failed to load meeting')
      }

      setMeeting(data.data)
      setPasswordError(false)
    } catch (err: any) {
      console.error('Error fetching meeting:', err)
      if (err.message !== 'Password required') {
        setError(err.message || 'Failed to load meeting')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchMeetingPublic = async (pwd?: string) => {
    try {
      setLoading(true)
      setError(null)
      setPasswordError(false)

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hrapi.codewithseth.co.ke'
      let url = `${baseUrl}/api/meetings/by-meeting-id/${meetingId}`
      if (pwd) {
        url += `?password=${encodeURIComponent(pwd)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.require_password) {
          setPasswordError(true)
          setMeeting(null)
          setLoading(false)
          return
        }
        throw new Error(data.message || 'Failed to load meeting')
      }

      setMeeting(data.data)
      setPasswordError(false)
      
      // If password was provided and meeting loaded, hide the form
      if (pwd) {
        setShowGuestForm(false)
      }
    } catch (err: any) {
      console.error('Error fetching meeting:', err)
      setError(err.message || 'Failed to load meeting')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!guestInfo.firstName.trim() || !guestInfo.lastName.trim()) {
      alert('Please enter your first and last name')
      return
    }

    if (meeting?.require_password && !guestInfo.password.trim()) {
      alert('Please enter the meeting password')
      return
    }

    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const guestName = `${guestInfo.firstName.trim()} ${guestInfo.lastName.trim()}`
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hrapi.codewithseth.co.ke'

      const response = await fetch(
        `${baseUrl}/api/meetings/by-meeting-id/${meetingId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: guestInfo.firstName,
            lastName: guestInfo.lastName,
            password: meeting?.require_password ? guestInfo.password : undefined,
            guest_id: guestId,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.require_password) {
          setPasswordError(true)
          return
        }
        throw new Error(data.message || 'Failed to join meeting')
      }

      setCurrentUserId(data?.data?.guest_user_id || guestId)
      setCurrentUserName(guestName)
      if (data?.data?.meeting) {
        setMeeting(data.data.meeting)
      }
      setPasswordError(false)
      setShowGuestForm(false)
    } catch (joinError: any) {
      console.error('Error joining as guest:', joinError)
      setError(joinError.message || 'Failed to join meeting')
    }
  }

  const handleStartMeeting = async (meetingId: string) => {
    if (isGuest) {
      // Guests cannot start meetings, only join
      return
    }

    try {
      const token = getToken()
      if (!token) {
        throw new Error('Authentication required to start a meeting')
      }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hrapi.codewithseth.co.ke'
      const response = await fetch(
        `${baseUrl}/api/meetings/${meetingId}/start`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to start meeting')
      }

      const data = await response.json()
      setMeeting(data.data)
    } catch (error) {
      console.error('Error starting meeting:', error)
      throw error
    }
  }

  const fetchMeetingHistory = async () => {
    try {
      setLoadingHistory(true)
      const token = getToken()
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hrapi.codewithseth.co.ke'
      
      // Get all meetings and filter for completed ones related to the current user
      const response = await fetch(`${baseUrl}/api/meetings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) throw new Error('Failed to fetch meeting history')
      
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        // Filter to show only completed meetings (excluding current meeting)
        const completed = data.data.filter(
          (m: Meeting) => 
            (m.status === 'completed' || m.status === 'cancelled') && 
            m._id !== meetingId
        )
        // Sort by scheduled_at date, newest first
        setMeetingHistory(completed.sort((a: Meeting, b: Meeting) => 
          new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        ).slice(0, 5)) // Limit to 5 most recent
      }
    } catch (error) {
      console.error('Error fetching meeting history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleEndMeeting = async (meetingId: string, transcript: string) => {
    if (isGuest) {
      // Guests cannot end meetings
      return
    }

    try {
      const token = getToken()
      if (!token) {
        throw new Error('Authentication required to end a meeting')
      }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hrapi.codewithseth.co.ke'
      const response = await fetch(
        `${baseUrl}/api/meetings/${meetingId}/end`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ transcript }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to end meeting')
      }

      const data = await response.json()
      setMeeting(data.data)
    } catch (error) {
      console.error('Error ending meeting:', error)
      throw error
    }
  }

  if (loading && !meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading meeting...</p>
        </div>
      </div>
    )
  }

  // Guest Join Form - Mobile Optimized
  if (showGuestForm && isGuest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <Card className="w-full max-w-2xl p-6 sm:p-8 bg-gray-900 border-gray-700 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Join Meeting</h2>
            {meeting && (
              <div className="space-y-2 text-sm sm:text-base text-gray-400">
                <p className="text-lg sm:text-xl font-semibold text-white break-words">{meeting.title}</p>
                {meeting.description && (
                  <p className="text-gray-400 line-clamp-2">{meeting.description}</p>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="break-words">{new Date(meeting.scheduled_at).toLocaleString()}</span>
                  </div>
                  {meeting.organizer && (
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Host: {meeting.organizer.firstName} {meeting.organizer.lastName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleGuestJoin} className="space-y-4">
            {meeting?.require_password && (
              <div>
                <Label htmlFor="password" className="text-white text-sm sm:text-base">
                  Meeting Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter meeting password"
                  value={guestInfo.password}
                  onChange={(e) =>
                    setGuestInfo({ ...guestInfo, password: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white mt-1 h-11 sm:h-10 text-base"
                  required={meeting?.require_password}
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">Invalid password. Please try again.</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="firstName" className="text-white text-sm sm:text-base">
                First Name *
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                value={guestInfo.firstName}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, firstName: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white mt-1 h-11 sm:h-10 text-base"
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName" className="text-white text-sm sm:text-base">
                Last Name *
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                value={guestInfo.lastName}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, lastName: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white mt-1 h-11 sm:h-10 text-base"
                required
              />
            </div>

            {meeting && timeUntilMeeting && !canJoinMeeting && (
              <Alert className="bg-yellow-900/20 border-yellow-700">
                <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <AlertDescription className="text-yellow-200 text-sm">
                  {timeUntilMeeting}
                </AlertDescription>
              </Alert>
            )}

            {meeting && timeUntilMeeting && canJoinMeeting && meeting.status !== 'in-progress' && (
              <Alert className="bg-green-900/20 border-green-700">
                <Clock className="h-4 w-4 text-green-500 flex-shrink-0" />
                <AlertDescription className="text-green-200 text-sm">
                  {timeUntilMeeting}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 text-base"
              disabled={!canJoinMeeting && meeting?.status !== 'in-progress'}
            >
              {canJoinMeeting || meeting?.status === 'in-progress' ? 'Join Meeting' : 'Waiting for Meeting'}
            </Button>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="link"
                className="text-gray-400 hover:text-white text-sm sm:text-base"
                onClick={() => router.push('/auth/login')}
              >
                Sign in to your account instead
              </Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  // Countdown page for guests waiting for meeting to start - Mobile Optimized
  if (isGuest && meeting && !canJoinMeeting && meeting.status !== 'in-progress') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <Card className="w-full max-w-2xl p-6 sm:p-8 bg-gray-900 border-gray-700 shadow-2xl text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Welcome, {currentUserName}!
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-300 mb-6">
            You're registered for: <strong className="text-white break-words">{meeting.title}</strong>
          </p>

          <div className="bg-gray-800 rounded-lg p-5 sm:p-6 mb-6">
            <p className="text-3xl sm:text-4xl font-bold text-blue-400 mb-2 break-words">
              {timeUntilMeeting}
            </p>
            <p className="text-sm sm:text-base text-gray-400">
              Scheduled for {new Date(meeting.scheduled_at).toLocaleString()}
            </p>
          </div>

          {meeting.description && (
            <div className="text-left bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">About this meeting:</h3>
              <p className="text-gray-300 text-sm sm:text-base line-clamp-3">{meeting.description}</p>
            </div>
          )}

          <Alert className="bg-blue-900/20 border-blue-700">
            <AlertDescription className="text-blue-200 text-sm sm:text-base">
              You can join the meeting 5 minutes before the scheduled time. This page will update automatically.
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black p-4">
        <Card className="w-full max-w-md p-8 bg-gray-900 border-gray-700">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Meeting not found'}</p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Meeting Interface - Full Screen on Mobile */}
      <div className="lg:max-w-7xl lg:mx-auto">
        <MeetingInterface
          meeting={meeting}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isGuest={isGuest}
          onStartMeeting={handleStartMeeting}
          onEndMeeting={handleEndMeeting}
        />
      </div>

      {/* Meeting History Section - Mobile Friendly */}
      {!isGuest && meeting && meetingHistory.length > 0 && (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:max-w-7xl lg:mx-auto">
          <div className="mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              Meeting History
            </h3>
            <p className="text-gray-400 text-sm sm:text-base">Your recent completed meetings</p>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meetingHistory.map((historyMeeting) => (
                <Card
                  key={historyMeeting._id}
                  className="bg-gray-800 border-gray-700 hover:border-blue-500 transition cursor-pointer group overflow-hidden"
                  onClick={() => router.push(`/meeting/${historyMeeting._id}`)}
                >
                  <div className="p-4 sm:p-5">
                    {/* Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold line-clamp-2 break-words text-sm sm:text-base group-hover:text-blue-400 transition">
                          {historyMeeting.title}
                        </h4>
                      </div>
                      <Badge className="bg-green-600 text-white flex-shrink-0 text-xs">
                        {historyMeeting.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </Badge>
                    </div>

                    {/* Meeting Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs sm:text-sm">
                      <div className="bg-gray-900 rounded p-2">
                        <p className="text-gray-500 text-xs">Date</p>
                        <p className="text-gray-200 font-medium">
                          {new Date(historyMeeting.scheduled_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-gray-900 rounded p-2">
                        <p className="text-gray-500 text-xs">Time</p>
                        <p className="text-gray-200 font-medium">
                          {new Date(historyMeeting.scheduled_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="bg-gray-900 rounded p-2 col-span-2">
                        <p className="text-gray-500 text-xs">Duration</p>
                        <p className="text-gray-200 font-medium">
                          {historyMeeting.duration_minutes} minutes
                        </p>
                      </div>
                    </div>

                    {/* AI Summary if available */}
                    {historyMeeting.ai_summary && (
                      <div className="mb-3 p-3 bg-blue-900/20 rounded border border-blue-800/30">
                        <p className="text-blue-300 text-xs truncate">
                          <strong>Summary:</strong> {historyMeeting.ai_summary.substring(0, 80)}...
                        </p>
                      </div>
                    )}

                    {/* Attendees Count */}
                    <div className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {historyMeeting.attendees.filter((a) => a.attended).length}/
                        {historyMeeting.attendees.length} attended
                      </span>
                    </div>

                    {/* AI Processing Status */}
                    {historyMeeting.ai_processing_status && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400 flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            historyMeeting.ai_processing_status === 'completed'
                              ? 'bg-green-500'
                              : historyMeeting.ai_processing_status === 'processing'
                              ? 'bg-yellow-500 animate-pulse'
                              : 'bg-gray-500'
                          }`}></span>
                          {historyMeeting.ai_processing_status === 'completed'
                            ? 'Report ready'
                            : historyMeeting.ai_processing_status === 'processing'
                            ? 'Generating report...'
                            : 'Pending'}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {meetingHistory.length === 0 && !loadingHistory && (
            <Card className="bg-gray-800 border-gray-700 p-8 text-center">
              <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
              <p className="text-gray-400">No completed meetings yet</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
