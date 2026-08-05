'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  Video,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  PhoneOff,
  Hand,
  Send,
  Smile,
  Users,
  Clock,
  AlertCircle,
  Loader,
  CheckCircle,
  VideoOff,
  MessageSquare,
  Menu,
  X,
  MonitorUp,
  MonitorOff,
} from 'lucide-react'
import { useWebRTC } from '@/hooks/use-webrtc'
import API_URL from '@/lib/apiBase'
import { MeetingReport } from '@/components/meetings/meeting-report'

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
  organizer?: any
  actual_start_time?: string
  actual_end_time?: string
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
  ai_processing_error?: string
  ai_summary?: string
  key_points?: string[]
  action_items?: any[]
  transcript?: string
  meeting_id: string
}

interface MeetingInterfaceProps {
  meeting: Meeting
  currentUserId: string
  currentUserName?: string
  isGuest?: boolean
  onEndMeeting: (meetingId: string, transcript: string) => Promise<void>
  onStartMeeting: (meetingId: string) => Promise<void>
  brandingColors?: any
}

export function MeetingInterface({
  meeting,
  currentUserId,
  currentUserName,
  isGuest = false,
  onEndMeeting,
  onStartMeeting,
  brandingColors,
}: MeetingInterfaceProps) {
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(meeting.meeting_type !== 'audio')
  const [isMeetingActive, setIsMeetingActive] = useState(
    meeting.status === 'in-progress'
  )
  const [recordingActive, setRecordingActive] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcript, setTranscript] = useState<string>('')
  const [showReport, setShowReport] = useState(false)
  const [reportState, setReportState] = useState<{
    summary: string
    keyPoints: string[]
    actionItems: any[]
    transcript: string
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
    processingError: string
    sentiment: 'positive' | 'neutral' | 'negative'
    attendees?: any[]
    scheduled_start?: string
    actual_start_time?: string
    actual_end_time?: string
  }>(() => {
    const status = meeting.ai_processing_status
    if (status === 'failed') {
      return {
        summary: meeting.ai_summary || '',
        keyPoints: meeting.key_points || [],
        actionItems: meeting.action_items || [],
        transcript: meeting.transcript || '',
        processingStatus: 'failed',
        processingError: meeting.ai_processing_error || '',
        sentiment: 'neutral',
        attendees: meeting.attendees || [],
        scheduled_start: meeting.scheduled_at,
        actual_start_time: meeting.actual_start_time,
        actual_end_time: meeting.actual_end_time,
      }
    }

    if (meeting.ai_processed || status === 'completed') {
      return {
        summary: meeting.ai_summary || '',
        keyPoints: meeting.key_points || [],
        actionItems: meeting.action_items || [],
        transcript: meeting.transcript || '',
        processingStatus: 'completed',
        processingError: '',
        sentiment: 'neutral',
        attendees: meeting.attendees || [],
        scheduled_start: meeting.scheduled_at,
        actual_start_time: meeting.actual_start_time,
        actual_end_time: meeting.actual_end_time,
      }
    }

    if (status === 'processing') {
      return {
        summary: meeting.ai_summary || '',
        keyPoints: meeting.key_points || [],
        actionItems: meeting.action_items || [],
        transcript: meeting.transcript || '',
        processingStatus: 'processing',
        processingError: '',
        sentiment: 'neutral',
        attendees: meeting.attendees || [],
        scheduled_start: meeting.scheduled_at,
        actual_start_time: meeting.actual_start_time,
        actual_end_time: meeting.actual_end_time,
      }
    }

    return {
      summary: meeting.ai_summary || '',
      keyPoints: meeting.key_points || [],
      actionItems: meeting.action_items || [],
      transcript: meeting.transcript || '',
      processingStatus: 'pending',
      processingError: '',
      sentiment: 'neutral',
      attendees: meeting.attendees || [],
      scheduled_start: meeting.scheduled_at,
      actual_start_time: meeting.actual_start_time,
      actual_end_time: meeting.actual_end_time,
    }
  })
  const [joinTime, setJoinTime] = useState<Date | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [permissionError, setPermissionError] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userName, setUserName] = useState<string>('')
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [remoteVolume, setRemoteVolume] = useState(1)
  const [allowDelayedAudio, setAllowDelayedAudio] = useState(true)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const speechRecognitionRef = useRef<any>(null)
  const transcriptFinalRef = useRef<string>('')
  const transcriptInterimRef = useRef<string>('')
  const isMeetingActiveRef = useRef<boolean>(isMeetingActive)
  const isOrganizerRef = useRef<boolean>(false)
  const transcriptCaptureEnabledRef = useRef<boolean>(false)

  const isOrganizer = !isGuest && meeting.organizer_id === currentUserId

  useEffect(() => {
    isMeetingActiveRef.current = isMeetingActive
  }, [isMeetingActive])

  useEffect(() => {
    isOrganizerRef.current = isOrganizer
  }, [isOrganizer])

  useEffect(() => {
    setIsMeetingActive(meeting.status === 'in-progress')
  }, [meeting.status])

  // Get current user details
  useEffect(() => {
    if (isGuest && currentUserName) {
      setUserName(currentUserName)
    } else {
      const user = meeting.attendees.find(a => a.user_id === currentUserId)?.user
      if (user) {
        setCurrentUser(user)
        setUserName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User')
      }
    }
  }, [meeting, currentUserId, isGuest, currentUserName])

  const activeStream = useMemo(() => {
    if (!localStream) return null
    if (!isScreenSharing || !screenStream) return localStream

    const combined = new MediaStream()
    screenStream.getVideoTracks().forEach(track => combined.addTrack(track))
    localStream.getAudioTracks().forEach(track => combined.addTrack(track))
    return combined
  }, [localStream, screenStream, isScreenSharing])

  // Initialize WebRTC
  const {
    remoteStreams,
    isConnected,
    participants,
    raisedHands,
    reactions,
    chatMessages,
    toggleRaiseHand,
    sendReaction,
    sendChatMessage,
  } = useWebRTC(
    meeting.meeting_id,
    currentUserId,
    userName,
    activeStream,
    isMeetingActive && permissionStatus === 'granted',
    allowDelayedAudio
  )

  // Request media permissions when meeting becomes active
  useEffect(() => {
    if (isMeetingActive && permissionStatus === 'pending') {
      requestMediaPermissions()
    }
  }, [isMeetingActive])

  // Update stream tracks when audio/video toggles change
  useEffect(() => {
    if (localStream && isMeetingActive) {
      updateStreamTracks()
    }
  }, [isVideoOn, isAudioOn])

  // Attach remote streams to video elements
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      const videoElement = remoteVideoRefs.current.get(socketId)
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream
      }

      const audioElement = remoteAudioRefs.current.get(socketId)
      if (audioElement && audioElement.srcObject !== stream) {
        audioElement.srcObject = stream
      }

      const mediaElements = [videoElement, audioElement].filter(Boolean) as HTMLMediaElement[]
      mediaElements.forEach((element) => {
        element.volume = remoteVolume
        element.muted = !speakerEnabled
        const playPromise = element.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            setTimeout(() => {
              element.play().catch(() => {
                // Browser autoplay guard may still block until next user interaction.
              })
            }, 450)
          })
        }
      })
    })
  }, [remoteStreams, speakerEnabled, remoteVolume])

  useEffect(() => {
    remoteAudioRefs.current.forEach((audioElement) => {
      audioElement.muted = !speakerEnabled
      audioElement.volume = remoteVolume
      if (speakerEnabled) {
        audioElement.play().catch(() => {
          // Browser autoplay guard may still block until next user interaction.
        })
      }
    })
  }, [speakerEnabled, remoteVolume])

  // Track time in meeting for KPI
  useEffect(() => {
    if (isMeetingActive && !joinTime) {
      const now = new Date()
      setJoinTime(now)
      if (!isGuest) {
        trackJoinTime()
      }
    }

    return () => {
      if (joinTime && isMeetingActive && !isGuest) {
        trackLeaveTime()
      }
    }
  }, [isMeetingActive])

  // Poll meeting AI report until it's ready.
  useEffect(() => {
    if (!showReport) return

    let cancelled = false
    const baseUrl = API_URL
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    // Ensure we immediately show "processing" state.
    setReportState((prev) => ({
      ...prev,
      processingStatus: prev.processingStatus === 'completed' ? 'completed' : 'processing',
      processingError: '',
    }))

    if (!token) {
      setReportState((prev) => ({
        ...prev,
        processingStatus: 'failed',
        processingError: 'You must be logged in to view the report.',
      }))
      return
    }

    let attempt = 0
    const maxAttempts = 36 // ~3 minutes @ 5s intervals
    const poll = async () => {
      attempt += 1
      try {
        const res = await fetch(`${baseUrl}/api/meetings/${meeting._id}/report`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await res.json().catch(() => null)

        if (cancelled) return

        if (res.ok && data?.success) {
          setReportState({
            summary: data.data.summary || '',
            keyPoints: data.data.keyPoints || [],
            actionItems: data.data.actionItems || [],
            transcript: data.data.transcript || '',
            processingStatus: 'completed',
            processingError: '',
            sentiment: data.data.sentiment || 'neutral',
          })
          return
        }
      } catch {
        // ignore and retry
      }

      if (cancelled) return

      if (attempt >= maxAttempts) {
        setReportState((prev) => ({
          ...prev,
          processingStatus: 'failed',
          processingError: 'Timed out waiting for AI report generation.',
        }))
        return
      }

      setTimeout(() => {
        if (!cancelled) poll()
      }, 5000)
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [showReport, meeting._id])

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      stopVideoStream()
      try {
        speechRecognitionRef.current?.stop?.()
      } catch {
        // Ignore - stopping recognition is best-effort
      } finally {
        speechRecognitionRef.current = null
        setRecordingActive(false)
      }
    }
  }, [])

  const trackJoinTime = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meeting._id}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.error('Error tracking join time:', error)
    }
  }

  const trackLeaveTime = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meeting._id}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.error('Error tracking leave time:', error)
    }
  }

  const requestMediaPermissions = async () => {
    try {
      setIsConnecting(true)
      setPermissionError('')
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: meeting.meeting_type !== 'audio' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      }

      console.log('Requesting media permissions with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      console.log('Permissions granted! Stream tracks:', stream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        label: t.label
      })))
      
      setLocalStream(stream)
      setPermissionStatus('granted')
      
      // Attach stream to video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Start transcript capture only for the organizer.
      if (isMeetingActive && isOrganizerRef.current) {
        startTranscriptRecognition()
      }
    } catch (error: any) {
      console.error('Error requesting media permissions:', error)
      setPermissionStatus('denied')
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Camera and microphone access denied. Please allow permissions in your browser settings.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setPermissionError('No camera or microphone found. Please check your device.')
      } else {
        setPermissionError(`Failed to access media: ${error.message}`)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const updateStreamTracks = () => {
    if (!localStream) return

    // Update audio tracks
    localStream.getAudioTracks().forEach(track => {
      track.enabled = isAudioOn
    })

    // Update video tracks
    localStream.getVideoTracks().forEach(track => {
      track.enabled = isVideoOn
    })
  }

  const stopVideoStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped ${track.kind} track`)
      })
      setLocalStream(null)
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
  }

  const getCurrentTranscriptText = () => {
    const finalText = transcriptFinalRef.current || ''
    const interimText = transcriptInterimRef.current || ''
    return `${finalText}${interimText ? ` ${interimText}` : ''}`.trim()
  }

  const startTranscriptRecognition = () => {
    if (!isOrganizerRef.current && !isOrganizer) return

    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null

    if (!SpeechRecognitionCtor) {
      console.warn('SpeechRecognition is not supported in this browser.')
      return
    }

    try {
      // Reset buffers before starting a new capture session
      transcriptFinalRef.current = ''
      transcriptInterimRef.current = ''
      setTranscript('')

      // Stop previous instance if any
      try {
        speechRecognitionRef.current?.stop?.()
      } catch {
        // ignore
      }

      const recognition = new SpeechRecognitionCtor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const resultIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0

        let didAppendFinal = false
        for (let i = resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result?.[0]?.transcript ? String(result[0].transcript) : ''
          if (!text) continue

          if (result.isFinal) {
            didAppendFinal = true
            transcriptFinalRef.current = transcriptFinalRef.current
              ? `${transcriptFinalRef.current} ${text.trim()}`
              : text.trim()
            transcriptInterimRef.current = ''
          } else {
            transcriptInterimRef.current = text.trim()
          }
        }

        if (didAppendFinal || transcriptInterimRef.current) {
          setTranscript(getCurrentTranscriptText())
        }
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error || event)
      }

      recognition.onend = () => {
        // Some browsers stop even with `continuous=true`; restart if meeting is still active.
        if (
          transcriptCaptureEnabledRef.current &&
          isMeetingActiveRef.current &&
          isOrganizerRef.current
        ) {
          try {
            recognition.start()
          } catch {
            // ignore double-start errors
          }
        }
      }

      speechRecognitionRef.current = recognition
      transcriptCaptureEnabledRef.current = true
      setRecordingActive(true)
      recognition.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setRecordingActive(false)
    }
  }

  const stopTranscriptRecognition = () => {
    try {
      transcriptCaptureEnabledRef.current = false
      speechRecognitionRef.current?.stop?.()
    } catch {
      // ignore
    } finally {
      speechRecognitionRef.current = null
      transcriptInterimRef.current = ''
      setRecordingActive(false)
      setTranscript(getCurrentTranscriptText())
    }
  }

  const handleStartMeeting = async () => {
    try {
      if (isGuest) return // Guests cannot start meetings
      await onStartMeeting(meeting._id)
      setIsMeetingActive(true)
    } catch (error) {
      console.error('Error starting meeting:', error)
    }
  }

  const handleEndMeeting = async () => {
    try {
      if (isGuest) {
        // Guests just leave
        handleLeaveMeeting()
        return
      }

      stopTranscriptRecognition()
      stopVideoStream()
      if (screenStream) screenStream.getTracks().forEach(t => t.stop())
      setScreenStream(null)
      setIsScreenSharing(false)

      setReportState((prev) => ({
        ...prev,
        processingStatus: 'processing',
        processingError: '',
      }))

      const transcriptToSubmit = getCurrentTranscriptText() || transcript.trim()
      await onEndMeeting(meeting._id, transcriptToSubmit)

      setIsMeetingActive(false)
      setShowReport(true)
    } catch (error) {
      console.error('Error ending meeting:', error)
    }
  }

  const handleLeaveMeeting = () => {
    stopTranscriptRecognition()
    stopVideoStream()
    window.location.href = isGuest ? '/' : '/dashboard'
  }

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn)
  }

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing && screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
      setScreenStream(null)
      setIsScreenSharing(false)
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        setScreenStream(stream)
        setIsScreenSharing(true)
        
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          setScreenStream(null)
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
          }
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error('Error sharing screen:', error)
      }
    }
  }

  const handleToggleRaiseHand = () => {
    const next = !isHandRaised
    setIsHandRaised(next)
    toggleRaiseHand(next)
  }

  const handleSendChat = () => {
    if (!chatMessage.trim()) return
    sendChatMessage(chatMessage)
    setChatMessage('')
  }

  const joinedMemberNames = Array.from(
    new Set(
      [
        ...meeting.attendees
          .filter((attendee) => attendee.attended)
          .map((attendee) => {
            if (attendee.display_name) return attendee.display_name
            if (attendee.user) {
              const fullName = `${attendee.user.firstName || ''} ${attendee.user.lastName || ''}`.trim()
              if (fullName) return fullName
              if (attendee.user.email) return attendee.user.email
            }
            return attendee.user_id
          }),
        ...participants.map((participant) => participant.userName).filter(Boolean),
        isMeetingActive && userName ? userName : '',
      ].filter(Boolean)
    )
  )

  const raisedHandNames = Object.values(raisedHands)
    .filter((entry) => entry.isRaised)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => entry.userName)

  const latestReactions = reactions.slice(-6)

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* Minimized Floating Window */}
      {isMinimized && isMeetingActive && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 rounded-lg shadow-2xl border-2 border-gray-700 w-80">
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {recordingActive && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
              <span className="text-white font-medium text-sm">
                {meeting.title}
              </span>
            </div>
            <Button
              onClick={() => setIsMinimized(false)}
              variant="ghost"
              size="sm"
              className="text-white h-8 w-8 p-0"
            >
              ↑
            </Button>
          </div>
          <div className="px-3 pb-3 flex gap-2">
            <Button
              onClick={toggleAudio}
              variant={isAudioOn ? 'default' : 'destructive'}
              size="sm"
              className="flex-1"
            >
              {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleEndMeeting}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Full Meeting View */}
      {!isMinimized && (
        <>
          {/* Video Area */}
          <div className="flex-1 bg-gradient-to-b from-gray-900 to-black p-4 overflow-hidden">
            {isMeetingActive ? (
              <>
                {permissionStatus === 'pending' && isConnecting && (
                  <div className="flex items-center justify-center h-full">
                    <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
                      <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Requesting Permissions
                      </h3>
                      <p className="text-gray-400">
                        Please allow access to your camera and microphone
                      </p>
                    </Card>
                  </div>
                )}

                {permissionStatus === 'denied' && (
                  <div className="flex items-center justify-center h-full">
                    <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Permission Denied
                      </h3>
                      <p className="text-gray-400 mb-4">{permissionError}</p>
                      <Button onClick={requestMediaPermissions} className="w-full">
                        Try Again
                      </Button>
                    </Card>
                  </div>
                )}

                {permissionStatus === 'granted' && (
                  <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full auto-rows-fr">
                    {latestReactions.length > 0 && (
                      <div className="absolute top-3 right-3 z-20 flex flex-wrap gap-2 max-w-[60%] justify-end">
                        {latestReactions.map((reaction, index) => (
                          <Badge
                            key={`${reaction.userId}-${reaction.timestamp}-${index}`}
                            variant="secondary"
                            className="bg-black/70 text-white border-gray-600"
                          >
                            {reaction.reaction} {reaction.userName}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Local video */}
                    <Card className="relative overflow-hidden bg-gray-900 border-gray-700">
                      {isVideoOn || isScreenSharing ? (
                        <>
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          {isScreenSharing && isVideoOn && localStream && (
                            <div className="absolute bottom-12 right-2 w-32 h-24 rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl z-30 bg-black">
                               <video
                                 autoPlay
                                 playsInline
                                 muted
                                 className="w-full h-full object-cover"
                                 ref={(el) => { if (el) el.srcObject = localStream }}
                               />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gray-800">
                          <div className="text-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-2xl font-bold text-white">
                                {userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <VideoOff className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">{userName} (Video Off)</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-lg">
                        <p className="text-white text-sm font-medium">
                          {userName} (You)
                          {isGuest && <Badge className="ml-2 text-xs" variant="secondary">Guest</Badge>}
                        </p>
                      </div>
                      {!isAudioOn && (
                        <div className="absolute top-2 right-2 bg-red-600 p-2 rounded-full">
                          <MicOff className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {recordingActive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 px-2 py-1 rounded">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <span className="text-white text-xs">CAPT</span>
                        </div>
                      )}
                    </Card>

                    {/* Remote participants */}
                    {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
                      const participant = participants.find(p => p.socketId === socketId)
                      const hasVideo = stream.getVideoTracks().length > 0
                      return (
                        <Card key={socketId} className="relative overflow-hidden bg-gray-900 border-gray-700">
                          {hasVideo ? (
                            <video
                              ref={(el) => {
                                if (el) remoteVideoRefs.current.set(socketId, el)
                              }}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-indigo-600/80 text-white flex items-center justify-center mx-auto mb-2 text-xl font-semibold">
                                  {(participant?.userName || 'P').charAt(0).toUpperCase()}
                                </div>
                                <p className="text-sm text-gray-300">Audio participant</p>
                              </div>
                            </div>
                          )}
                          <audio
                            ref={(el) => {
                              if (el) remoteAudioRefs.current.set(socketId, el)
                            }}
                            autoPlay
                            playsInline
                          />
                          <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-xs">
                            {participant?.userName || 'Participant'}
                          </div>
                          {!speakerEnabled && (
                            <div className="absolute top-2 right-2 bg-gray-900/80 px-2 py-1 rounded text-[10px] text-gray-200">
                              Muted locally
                            </div>
                          )}
                        </Card>
                      )
                    })}

                    {/* Empty slots for invited participants */}
                    {remoteStreams.size === 0 && (
                      <Card className="flex items-center justify-center bg-gray-800 border-gray-700 border-dashed">
                        <div className="text-center text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">Waiting for participants...</p>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {meeting.title}
                  </h3>
                  <p className="text-gray-400 mb-6">{meeting.description}</p>
                  <div className="space-y-2 text-sm text-gray-400 mb-8">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(meeting.scheduled_at).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" />
                      {meeting.attendees.length} attendee(s)
                    </div>
                  </div>
                  {isOrganizer && (
                    <Button
                      onClick={handleStartMeeting}
                      className="w-full text-white"
                      style={{ backgroundColor: brandingColors?.primary || '#059669' }}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Start Meeting
                    </Button>
                  )}
                </Card>
              </div>
            )}
          </div>

          {/* Controls */}
          {isMeetingActive && !isMinimized && permissionStatus === 'granted' && (
            <div className="bg-gray-900 border-t border-gray-700 p-4 space-y-3">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {joinTime && new Date().getTime() - joinTime.getTime() > 0
                        ? `${Math.floor((new Date().getTime() - joinTime.getTime()) / 60000)}m`
                        : '0m'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-white border-white">
                    {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
                  </Badge>
                  {isConnected && (
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      Connected
                    </Badge>
                  )}
                  {raisedHandNames.length > 0 && (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-500">
                      {raisedHandNames.length} hand{raisedHandNames.length > 1 ? 's' : ''} raised
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={toggleAudio}
                    size="lg"
                    variant={isAudioOn ? 'default' : 'destructive'}
                    className="rounded-full w-12 h-12 p-0"
                    title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
                  >
                    {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </Button>

                  <Button
                    onClick={() => setSpeakerEnabled((prev) => !prev)}
                    size="lg"
                    variant={speakerEnabled ? 'default' : 'secondary'}
                    className="rounded-full w-12 h-12 p-0"
                    title={speakerEnabled ? 'Mute speakers' : 'Unmute speakers'}
                  >
                    {speakerEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </Button>

                  <div className="hidden md:flex items-center gap-2 text-xs text-gray-300 px-2 py-1 border border-gray-700 rounded-md">
                    <span>Vol</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={remoteVolume}
                      onChange={(e) => setRemoteVolume(Number(e.target.value))}
                    />
                  </div>

                  {meeting.meeting_type !== 'audio' && (
                    <>
                      <Button
                        onClick={toggleVideo}
                        size="lg"
                        style={isVideoOn ? { backgroundColor: brandingColors?.primary || undefined } : {}}
                        variant={isVideoOn ? 'default' : 'secondary'}
                        className="rounded-full w-12 h-12 p-0"
                      >
                        {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      </Button>
                      <Button
                        onClick={toggleScreenShare}
                        size="lg"
                        style={isScreenSharing ? { backgroundColor: brandingColors?.primary || undefined } : {}}
                        variant={isScreenSharing ? 'default' : 'secondary'}
                        className="rounded-full w-12 h-12 p-0"
                        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                      >
                        {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                      </Button>
                    </>
                  )}

                  <Button
                    onClick={handleToggleRaiseHand}
                    size="lg"
                    variant={isHandRaised ? 'secondary' : 'outline'}
                    className="rounded-full w-12 h-12 p-0"
                    title={isHandRaised ? 'Lower hand' : 'Raise hand'}
                  >
                    <Hand className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={() => sendReaction('👏')}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-12 h-12 p-0"
                    title="Clap"
                  >
                    👏
                  </Button>

                  <Button
                    onClick={() => sendReaction('👍')}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-12 h-12 p-0"
                    title="Thumbs up"
                  >
                    👍
                  </Button>

                  <Button
                    onClick={() => sendReaction('🎉')}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-12 h-12 p-0"
                    title="Celebrate"
                  >
                    🎉
                  </Button>

                  <Button
                    onClick={isGuest ? handleLeaveMeeting : (isOrganizer ? handleEndMeeting : handleLeaveMeeting)}
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-12 h-12 p-0"
                    title={isOrganizer && !isGuest ? 'End meeting' : 'Leave meeting'}
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => setAllowDelayedAudio((prev) => !prev)}
                    variant="outline"
                    size="sm"
                    className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
                    title="Stabilize audio on slower connections"
                  >
                    {allowDelayedAudio ? 'Delayed Audio: On' : 'Delayed Audio: Off'}
                  </Button>

                  <Button
                    onClick={() => setChatOpen((prev) => !prev)}
                    variant="outline"
                    size="sm"
                    className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
                  >
                    <Menu className="w-4 h-4 mr-1" />
                    Chats
                  </Button>

                  <Button
                    onClick={() => setShowTranscript((prev) => !prev)}
                    variant="outline"
                    size="sm"
                    className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
                    title="Live transcript"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Transcript
                  </Button>

                  <Button
                    onClick={() => setIsMinimized(true)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-200 hover:text-white"
                  >
                    ↓
                  </Button>
                </div>
              </div>

              <div className="max-w-7xl mx-auto mt-3 flex flex-wrap gap-2">
                {joinedMemberNames.length > 0 ? (
                  joinedMemberNames.map((name, index) => (
                    <Badge
                      key={`${name}-${index}`}
                      variant="outline"
                      className="text-white border-gray-500"
                    >
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No joined members yet</span>
                )}
              </div>

              {raisedHandNames.length > 0 && (
                <div className="max-w-7xl mx-auto text-xs text-yellow-300">
                  Raised hands: {raisedHandNames.join(', ')}
                </div>
              )}

            </div>
          )}
        </>
      )}

      {isMeetingActive && !isMinimized && chatOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setChatOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full w-full sm:w-[360px] bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Meeting Chats
              </h3>
              <Button
                onClick={() => setChatOpen(false)}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-gray-400">No messages yet. Say hello 👋</p>
              ) : (
                chatMessages.slice(-100).map((message, index) => (
                  <div
                    key={`${message.userId}-${message.timestamp}-${index}`}
                    className="bg-gray-800 border border-gray-700 rounded-md p-2"
                  >
                    <p className="text-xs text-blue-300 font-medium mb-1">{message.userName}</p>
                    <p className="text-sm text-gray-200 break-words">{message.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSendChat()
                    }
                  }}
                  placeholder="Type a message..."
                  className="bg-gray-950 border-gray-700 text-white"
                />
                <Button onClick={handleSendChat} size="sm" className="bg-white text-gray-900 hover:bg-gray-100">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Live Transcript Panel */}
      {showTranscript && isMeetingActive && !isMinimized && (
        <div className="bg-gray-800 border-t border-gray-700 p-4 max-h-56 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Live Transcript
              </h3>
              {isOrganizer && recordingActive && (
                <Badge variant="outline" className="text-white border-gray-600">
                  Capturing
                </Badge>
              )}
            </div>

            <Textarea
              value={transcript}
              onChange={(e) => {
                const value = e.target.value
                transcriptFinalRef.current = value
                transcriptInterimRef.current = ''
                setTranscript(value)
              }}
              disabled={!isOrganizer}
              className="min-h-[110px] bg-gray-900 border-gray-700 text-white resize-none"
              placeholder={
                recordingActive ? 'Listening for speech...' : 'Transcript will appear here'
              }
            />
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Meeting Report</DialogTitle>
              <DialogDescription>
                AI-generated analysis of the meeting
              </DialogDescription>
            </DialogHeader>

            <MeetingReport
              title={meeting.title}
              summary={reportState.summary}
              keyPoints={reportState.keyPoints}
              actionItems={reportState.actionItems}
              transcript={reportState.transcript}
              processingStatus={reportState.processingStatus}
              processingError={reportState.processingError}
              sentiment={reportState.sentiment}
              attendees={reportState.attendees}
              scheduled_start={reportState.scheduled_start}
              actual_start_time={reportState.actual_start_time}
              actual_end_time={reportState.actual_end_time}
              meeting_type={meeting.meeting_type}
              organizer={meeting.organizer}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
