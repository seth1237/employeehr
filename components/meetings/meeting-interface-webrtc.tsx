'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Users,
  Clock,
  AlertCircle,
  Loader,
  VideoOff,
  MessageSquare,
  X,
  MonitorUp,
  MonitorOff,
  Captions,
  MoreHorizontal,
  Copy,
  Check,
  Info,
} from 'lucide-react'
import { useWebRTC } from '@/hooks/use-webrtc'
import API_URL from '@/lib/apiBase'
import { MeetingReport } from '@/components/meetings/meeting-report'
import {
  ParticipantTile,
  getMeetingGridClass,
} from '@/components/meetings/participant-tile'

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
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [copiedInfo, setCopiedInfo] = useState(false)
  const [elapsedLabel, setElapsedLabel] = useState('0:00')
  const [chatMessage, setChatMessage] = useState('')
  const [nowTick, setNowTick] = useState(() => Date.now())
  
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

  useEffect(() => {
    if (!isMeetingActive || !joinTime) return
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isMeetingActive, joinTime])

  useEffect(() => {
    if (!joinTime) {
      setElapsedLabel('0:00')
      return
    }
    const totalSeconds = Math.max(0, Math.floor((nowTick - joinTime.getTime()) / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    setElapsedLabel(`${minutes}:${String(seconds).padStart(2, '0')}`)
  }, [joinTime, nowTick])

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

  const latestReactions = reactions.slice(-6)

  const handleCopyMeetingInfo = async () => {
    const link = meeting.meeting_link || `${typeof window !== 'undefined' ? window.location.origin : ''}/meeting/${meeting.meeting_id}`
    try {
      await navigator.clipboard.writeText(`${meeting.title}\n${link}`)
      setCopiedInfo(true)
      window.setTimeout(() => setCopiedInfo(false), 1800)
    } catch {
      // ignore clipboard failures
    }
  }

  const tileCount = 1 + remoteStreams.size
  const sidePanelOpen = chatOpen || peopleOpen
  const clockLabel = new Date(nowTick).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const controlBtn =
    'h-12 w-12 rounded-full border-0 p-0 text-white shadow-none transition hover:opacity-90 disabled:opacity-50'
  const controlIdle = 'bg-[#3c4043] hover:bg-[#4a4d51]'
  const controlActive = 'bg-white text-[#202124] hover:bg-gray-100'
  const controlDanger = 'bg-[#ea4335] hover:bg-[#d93025]'

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#202124] text-white">
      {/* Minimized floating window */}
      {isMinimized && isMeetingActive && (
        <div className="fixed bottom-5 right-5 z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#292a2d] shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{meeting.title}</p>
              <p className="text-[11px] text-white/55">{elapsedLabel} in call</p>
            </div>
            <Button
              onClick={() => setIsMinimized(false)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-white hover:bg-white/10"
            >
              ↑
            </Button>
          </div>
          <div className="flex gap-2 px-3 pb-3">
            <Button
              onClick={toggleAudio}
              className={`${controlBtn} flex-1 ${isAudioOn ? controlIdle : controlDanger}`}
            >
              {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button
              onClick={isGuest || !isOrganizer ? handleLeaveMeeting : handleEndMeeting}
              className={`${controlBtn} flex-1 ${controlDanger}`}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!isMinimized && (
        <>
          {/* Top bar */}
          <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#202124]/95 px-4 backdrop-blur">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-medium tracking-tight">{meeting.title}</h1>
                {recordingActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ea4335]/15 px-2 py-0.5 text-[11px] font-medium text-[#f28b82]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ea4335]" />
                    Captions
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-white/50">
                {meeting.meeting_id} · {participants.length + (isMeetingActive ? 1 : 0)} in call
                {isConnected ? ' · Connected' : isMeetingActive ? ' · Connecting…' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyMeetingInfo}
                className="hidden h-9 gap-1.5 rounded-full px-3 text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                {copiedInfo ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedInfo ? 'Copied' : 'Copy link'}
              </Button>
              <span className="hidden text-sm text-white/70 tabular-nums md:inline">{clockLabel}</span>
            </div>
          </header>

          {/* Stage + side panel */}
          <div className="relative flex min-h-0 flex-1">
            <main className="relative flex min-w-0 flex-1 flex-col">
              {/* Floating reactions */}
              {latestReactions.length > 0 && (
                <div className="pointer-events-none absolute right-4 top-4 z-20 flex max-w-[50%] flex-wrap justify-end gap-2">
                  {latestReactions.map((reaction, index) => (
                    <span
                      key={`${reaction.userId}-${reaction.timestamp}-${index}`}
                      className="rounded-full bg-black/55 px-3 py-1.5 text-sm shadow-lg backdrop-blur"
                    >
                      {reaction.reaction}{' '}
                      <span className="text-white/70">{reaction.userName}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4 lg:p-5">
                {!isMeetingActive ? (
                  <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#292a2d] p-8 text-center shadow-2xl">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3c4043]">
                      <Video className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">{meeting.title}</h2>
                    {meeting.description && (
                      <p className="mt-2 text-sm leading-relaxed text-white/60">{meeting.description}</p>
                    )}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-white/55">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {new Date(meeting.scheduled_at).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {meeting.attendees.length} invited
                      </span>
                    </div>
                    {isOrganizer ? (
                      <Button
                        onClick={handleStartMeeting}
                        className="mt-7 h-11 w-full rounded-full border-0 bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Start meeting
                      </Button>
                    ) : (
                      <p className="mt-7 text-sm text-white/50">
                        Waiting for the host to start this meeting…
                      </p>
                    )}
                  </div>
                ) : permissionStatus === 'pending' && isConnecting ? (
                  <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#292a2d] p-8 text-center">
                    <Loader className="mx-auto mb-4 h-10 w-10 animate-spin text-[#8ab4f8]" />
                    <h3 className="text-lg font-semibold">Getting your camera ready</h3>
                    <p className="mt-2 text-sm text-white/55">
                      Allow camera and microphone access to join the call.
                    </p>
                  </div>
                ) : permissionStatus === 'denied' ? (
                  <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#292a2d] p-8 text-center">
                    <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#f28b82]" />
                    <h3 className="text-lg font-semibold">Camera or mic blocked</h3>
                    <p className="mt-2 text-sm text-white/55">{permissionError}</p>
                    <Button
                      onClick={requestMediaPermissions}
                      className="mt-6 h-10 w-full rounded-full bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`grid h-full w-full gap-3 ${getMeetingGridClass(tileCount)}`}
                  >
                    <ParticipantTile
                      name={userName || 'You'}
                      isLocal
                      isGuest={isGuest}
                      isOrganizer={isOrganizer}
                      isMuted={!isAudioOn}
                      isCameraOff={!isVideoOn && !isScreenSharing}
                      isScreenSharing={isScreenSharing}
                      isHandRaised={isHandRaised}
                      showVideo={isVideoOn || isScreenSharing}
                    >
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                      />
                      {isScreenSharing && isVideoOn && localStream ? (
                        <div className="absolute bottom-12 right-3 h-24 w-36 overflow-hidden rounded-xl border border-white/20 bg-black shadow-xl">
                          <video
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                            ref={(el) => {
                              if (el) el.srcObject = localStream
                            }}
                          />
                        </div>
                      ) : null}
                    </ParticipantTile>

                    {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
                      const participant = participants.find((p) => p.socketId === socketId)
                      const hasVideo = stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
                      const remoteName = participant?.userName || 'Participant'
                      const remoteRaised = Boolean(
                        participant?.userId && raisedHands[participant.userId]?.isRaised,
                      )
                      return (
                        <ParticipantTile
                          key={socketId}
                          name={remoteName}
                          isMuted={false}
                          isCameraOff={!hasVideo}
                          isHandRaised={remoteRaised}
                          showVideo={hasVideo}
                        >
                          <video
                            ref={(el) => {
                              if (el) remoteVideoRefs.current.set(socketId, el)
                            }}
                            autoPlay
                            playsInline
                            className="h-full w-full object-cover"
                          />
                          <audio
                            ref={(el) => {
                              if (el) remoteAudioRefs.current.set(socketId, el)
                            }}
                            autoPlay
                            playsInline
                          />
                        </ParticipantTile>
                      )
                    })}

                    {remoteStreams.size === 0 && (
                      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#292a2d]/80 text-center">
                        <Users className="mb-3 h-10 w-10 text-white/35" />
                        <p className="text-sm font-medium text-white/70">Waiting for others to join</p>
                        <p className="mt-1 max-w-xs text-xs text-white/40">
                          Share the meeting link so teammates or guests can enter.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom control bar — Google Meet pattern */}
              {isMeetingActive && permissionStatus === 'granted' && (
                <footer className="relative z-30 shrink-0 border-t border-white/5 bg-[#202124]/95 px-3 py-3 backdrop-blur sm:px-5">
                  <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex min-w-0 items-center gap-3 text-sm text-white/70">
                      <span className="tabular-nums">{elapsedLabel}</span>
                      <span className="hidden truncate sm:inline">{meeting.meeting_id}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                      <Button
                        onClick={toggleAudio}
                        className={`${controlBtn} ${isAudioOn ? controlIdle : controlDanger}`}
                        title={isAudioOn ? 'Turn off microphone' : 'Turn on microphone'}
                      >
                        {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                      </Button>

                      {meeting.meeting_type !== 'audio' && (
                        <Button
                          onClick={toggleVideo}
                          className={`${controlBtn} ${isVideoOn ? controlIdle : controlDanger}`}
                          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                        >
                          {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </Button>
                      )}

                      <Button
                        onClick={() => setSpeakerEnabled((prev) => !prev)}
                        className={`${controlBtn} ${speakerEnabled ? controlIdle : controlDanger}`}
                        title={speakerEnabled ? 'Mute speakers' : 'Unmute speakers'}
                      >
                        {speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </Button>

                      {meeting.meeting_type !== 'audio' && (
                        <Button
                          onClick={toggleScreenShare}
                          className={`${controlBtn} ${isScreenSharing ? controlActive : controlIdle} ${isScreenSharing ? '!text-[#202124]' : ''}`}
                          title={isScreenSharing ? 'Stop presenting' : 'Present now'}
                        >
                          {isScreenSharing ? (
                            <MonitorOff className="h-5 w-5" />
                          ) : (
                            <MonitorUp className="h-5 w-5" />
                          )}
                        </Button>
                      )}

                      <Button
                        onClick={handleToggleRaiseHand}
                        className={`${controlBtn} ${isHandRaised ? controlActive + ' !text-[#202124]' : controlIdle}`}
                        title={isHandRaised ? 'Lower hand' : 'Raise hand'}
                      >
                        <Hand className="h-5 w-5" />
                      </Button>

                      <div className="relative">
                        <Button
                          onClick={() => setMoreOpen((prev) => !prev)}
                          className={`${controlBtn} ${controlIdle}`}
                          title="More options"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                        {moreOpen && (
                          <div className="absolute bottom-14 left-1/2 z-40 w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#292a2d] py-1 shadow-2xl">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                              onClick={() => {
                                sendReaction('👏')
                                setMoreOpen(false)
                              }}
                            >
                              👏 Send clap
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                              onClick={() => {
                                sendReaction('👍')
                                setMoreOpen(false)
                              }}
                            >
                              👍 Thumbs up
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                              onClick={() => {
                                sendReaction('🎉')
                                setMoreOpen(false)
                              }}
                            >
                              🎉 Celebrate
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                              onClick={() => {
                                setAllowDelayedAudio((prev) => !prev)
                                setMoreOpen(false)
                              }}
                            >
                              <Info className="h-4 w-4" />
                              Delayed audio: {allowDelayedAudio ? 'On' : 'Off'}
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                              onClick={() => {
                                setIsMinimized(true)
                                setMoreOpen(false)
                              }}
                            >
                              Minimize call
                            </button>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={
                          isGuest || !isOrganizer ? handleLeaveMeeting : handleEndMeeting
                        }
                        className={`${controlBtn} ${controlDanger} ml-1 sm:ml-2`}
                        title={isOrganizer && !isGuest ? 'End call for everyone' : 'Leave call'}
                      >
                        <PhoneOff className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      <Button
                        onClick={() => {
                          setPeopleOpen((prev) => !prev)
                          setChatOpen(false)
                        }}
                        variant="ghost"
                        className={`h-10 rounded-full px-3 text-white hover:bg-white/10 ${peopleOpen ? 'bg-white/10' : ''}`}
                        title="People"
                      >
                        <Users className="h-4 w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">People</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setChatOpen((prev) => !prev)
                          setPeopleOpen(false)
                        }}
                        variant="ghost"
                        className={`h-10 rounded-full px-3 text-white hover:bg-white/10 ${chatOpen ? 'bg-white/10' : ''}`}
                        title="Chat"
                      >
                        <MessageSquare className="h-4 w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Chat</span>
                      </Button>
                      <Button
                        onClick={() => setShowTranscript((prev) => !prev)}
                        variant="ghost"
                        className={`h-10 rounded-full px-3 text-white hover:bg-white/10 ${showTranscript ? 'bg-white/10' : ''}`}
                        title="Captions"
                      >
                        <Captions className="h-4 w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Captions</span>
                      </Button>
                    </div>
                  </div>
                </footer>
              )}
            </main>

            {/* Side panel: People / Chat */}
            {isMeetingActive && sidePanelOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                  onClick={() => {
                    setChatOpen(false)
                    setPeopleOpen(false)
                  }}
                />
                <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-white/10 bg-[#292a2d] shadow-2xl lg:static lg:z-auto lg:max-w-[340px]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="flex gap-1 rounded-full bg-black/20 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPeopleOpen(true)
                          setChatOpen(false)
                        }}
                        className={`rounded-full px-3 py-1.5 text-sm ${peopleOpen ? 'bg-white/10 text-white' : 'text-white/55'}`}
                      >
                        People
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChatOpen(true)
                          setPeopleOpen(false)
                        }}
                        className={`rounded-full px-3 py-1.5 text-sm ${chatOpen ? 'bg-white/10 text-white' : 'text-white/55'}`}
                      >
                        Chat
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        setChatOpen(false)
                        setPeopleOpen(false)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {peopleOpen && (
                    <div className="flex-1 overflow-y-auto p-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/40">
                        In this call · {joinedMemberNames.length || participants.length + 1}
                      </p>
                      <div className="space-y-1">
                        {/* Local user */}
                        <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{
                              backgroundColor: '#1a73e8',
                            }}
                          >
                            {(userName || 'Y').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {userName || 'You'} <span className="text-white/40">(You)</span>
                            </p>
                            <p className="text-xs text-white/45">
                              {isOrganizer ? 'Host' : isGuest ? 'Guest' : 'Participant'}
                              {!isAudioOn ? ' · Mic off' : ''}
                            </p>
                          </div>
                          {isHandRaised && <Hand className="h-4 w-4 text-[#f9ab00]" />}
                        </div>

                        {participants.map((participant) => (
                          <div
                            key={participant.socketId}
                            className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3c4043] text-sm font-semibold">
                              {(participant.userName || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{participant.userName}</p>
                              <p className="text-xs text-white/45">In call</p>
                            </div>
                            {raisedHands[participant.userId]?.isRaised && (
                              <Hand className="h-4 w-4 text-[#f9ab00]" />
                            )}
                          </div>
                        ))}

                        {meeting.attendees
                          .filter(
                            (a) =>
                              !a.attended &&
                              a.user_id !== currentUserId &&
                              !participants.some((p) => p.userId === a.user_id),
                          )
                          .map((attendee) => {
                            const name =
                              attendee.display_name ||
                              `${attendee.user?.firstName || ''} ${attendee.user?.lastName || ''}`.trim() ||
                              'Invitee'
                            return (
                              <div
                                key={attendee.user_id}
                                className="flex items-center gap-3 rounded-xl px-2 py-2.5 opacity-60"
                              >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3c4043]/70 text-sm font-semibold">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{name}</p>
                                  <p className="text-xs text-white/45">Invited · not joined</p>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {chatOpen && (
                    <>
                      <div className="flex-1 space-y-2 overflow-y-auto p-4">
                        {chatMessages.length === 0 ? (
                          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                            <MessageSquare className="mb-3 h-8 w-8 text-white/30" />
                            <p className="text-sm text-white/55">No messages yet</p>
                            <p className="mt-1 text-xs text-white/35">
                              Messages are only visible during this call.
                            </p>
                          </div>
                        ) : (
                          chatMessages.slice(-100).map((message, index) => {
                            const mine = message.userId === currentUserId
                            return (
                              <div
                                key={`${message.userId}-${message.timestamp}-${index}`}
                                className={`max-w-[90%] rounded-2xl px-3 py-2 ${
                                  mine
                                    ? 'ml-auto bg-[#1a73e8] text-white'
                                    : 'bg-black/25 text-white'
                                }`}
                              >
                                {!mine && (
                                  <p className="mb-0.5 text-[11px] font-medium text-white/60">
                                    {message.userName}
                                  </p>
                                )}
                                <p className="break-words text-sm leading-relaxed">{message.message}</p>
                              </div>
                            )
                          })
                        )}
                      </div>
                      <div className="border-t border-white/10 p-3">
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
                            placeholder="Send a message"
                            className="h-10 border-white/10 bg-black/20 text-white placeholder:text-white/35"
                          />
                          <Button
                            onClick={handleSendChat}
                            className="h-10 w-10 rounded-full bg-[#1a73e8] p-0 hover:bg-[#1765cc]"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </aside>
              </>
            )}
          </div>

          {/* Captions / transcript strip */}
          {showTranscript && isMeetingActive && (
            <div className="max-h-44 shrink-0 overflow-y-auto border-t border-white/10 bg-[#17181a] px-4 py-3">
              <div className="mx-auto max-w-5xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                    Captions
                  </p>
                  {recordingActive && (
                    <span className="text-[11px] text-[#f28b82]">Listening…</span>
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
                  className="min-h-[88px] resize-none border-white/10 bg-transparent text-sm text-white/90 placeholder:text-white/35"
                  placeholder={
                    recordingActive ? 'Live captions will appear here…' : 'No captions yet'
                  }
                />
              </div>
            </div>
          )}
        </>
      )}

      {showReport && (
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Meeting summary</DialogTitle>
              <DialogDescription>
                Review what was discussed and any follow-up actions.
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
