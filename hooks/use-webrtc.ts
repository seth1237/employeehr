import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import API_URL from '@/lib/apiBase'

interface Participant {
  socketId: string
  userId: string
  userName: string
  meetingId: string
  joined_at?: string
  left_at?: string
}

interface RaisedHandEvent {
  userId: string
  userName: string
  isRaised: boolean
  timestamp: number
}

interface MeetingReaction {
  userId: string
  userName: string
  reaction: string
  timestamp: number
}

interface ChatMessage {
  userId: string
  userName: string
  message: string
  timestamp: number
}

interface PeerConnection {
  connection: RTCPeerConnection
  stream?: MediaStream
  participant: Participant
}

export function useWebRTC(
  meetingId: string,
  userId: string,
  userName: string,
  localStream: MediaStream | null,
  enabled: boolean,
  allowDelayedAudio = true
) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map())
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [raisedHands, setRaisedHands] = useState<Record<string, { userName: string; isRaised: boolean; timestamp: number }>>({})
  const [reactions, setReactions] = useState<MeetingReaction[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map())
  const socketRef = useRef<Socket | null>(null)

  // ICE servers configuration (using public STUN servers)
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  }

  // Create peer connection
  const createPeerConnection = useCallback(
    (participant: Participant): RTCPeerConnection => {
      const peerConnection = new RTCPeerConnection(iceServers)

      // Add local stream tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream)
        })
      }

      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote track from', participant.userName)
        const [stream] = event.streams

        if (allowDelayedAudio) {
          try {
            peerConnection.getReceivers().forEach((receiver: any) => {
              if (receiver.track?.kind === 'audio' && 'playoutDelayHint' in receiver) {
                receiver.playoutDelayHint = 0.6
              }
            })
          } catch (error) {
            console.warn('Unable to set playoutDelayHint:', error)
          }
        }

        setRemoteStreams((prev) => {
          const newMap = new Map(prev)
          newMap.set(participant.socketId, stream)
          return newMap
        })
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.log('Sending ICE candidate to', participant.userName)
          socketRef.current.emit('ice-candidate', {
            targetSocketId: participant.socketId,
            candidate: event.candidate,
          })
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(
          `Connection state with ${participant.userName}:`,
          peerConnection.connectionState
        )
        if (
          peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed'
        ) {
          // Remove peer
          peerConnectionsRef.current.delete(participant.socketId)
          setPeers(new Map(peerConnectionsRef.current))
          setRemoteStreams((prev) => {
            const newMap = new Map(prev)
            newMap.delete(participant.socketId)
            return newMap
          })
        }
      }

      return peerConnection
    },
    [localStream]
  )

  // Initialize WebRTC connection
  useEffect(() => {
    if (!enabled || !meetingId || !userId) return

    const socketBaseUrl = API_URL

    const newSocket = io(socketBaseUrl, {
      transports: ['websocket', 'polling'],
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      setIsConnected(true)

      // Join meeting room
      newSocket.emit('join-meeting', {
        meetingId,
        userId,
        userName,
      })
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    // Handle existing participants
    newSocket.on('existing-participants', async (existingParticipants: Participant[]) => {
      console.log('Existing participants:', existingParticipants)
      setParticipants(existingParticipants)

      // Create peer connections and send offers to all existing participants
      for (const participant of existingParticipants) {
        const peerConnection = createPeerConnection(participant)
        const peerData: PeerConnection = { connection: peerConnection, participant }
        peerConnectionsRef.current.set(participant.socketId, peerData)

        try {
          // Create and send offer
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)

          console.log('Sending offer to', participant.userName)
          newSocket.emit('offer', {
            meetingId,
            targetSocketId: participant.socketId,
            offer,
          })
        } catch (error) {
          console.error('Error creating offer:', error)
        }
      }

      setPeers(new Map(peerConnectionsRef.current))
    })

    // Handle new participant joining
    newSocket.on('participant-joined', (participant: Participant) => {
      console.log('New participant joined:', participant.userName)
      // Add join timestamp if not already present
      const participantWithTimestamp = {
        ...participant,
        joined_at: participant.joined_at || new Date().toISOString(),
      }
      setParticipants((prev) => [...prev, participantWithTimestamp])
    })

    // Handle participant leaving
    newSocket.on('participant-left', (participant: Participant) => {
      console.log('Participant left:', participant.userName)
      // Update participant with left timestamp
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === participant.socketId
            ? {
                ...p,
                left_at: participant.left_at || new Date().toISOString(),
              }
            : p
        )
      )
      setRaisedHands((prev) => {
        const next = { ...prev }
        delete next[participant.userId]
        return next
      })

      // Close peer connection
      const peerData = peerConnectionsRef.current.get(participant.socketId)
      if (peerData) {
        peerData.connection.close()
        peerConnectionsRef.current.delete(participant.socketId)
        setPeers(new Map(peerConnectionsRef.current))
      }

      // Remove remote stream
      setRemoteStreams((prev) => {
        const newMap = new Map(prev)
        newMap.delete(participant.socketId)
        return newMap
      })
    })

    // Handle incoming offer
    newSocket.on(
      'offer',
      async ({
        fromSocketId,
        fromUserId,
        fromUserName,
        offer,
      }: {
        fromSocketId: string
        fromUserId: string
        fromUserName: string
        offer: RTCSessionDescriptionInit
      }) => {
        console.log('Received offer from', fromUserName)

        const participant: Participant = {
          socketId: fromSocketId,
          userId: fromUserId,
          userName: fromUserName,
          meetingId,
        }

        const peerConnection = createPeerConnection(participant)
        const peerData: PeerConnection = { connection: peerConnection, participant }
        peerConnectionsRef.current.set(fromSocketId, peerData)

        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)

          console.log('Sending answer to', fromUserName)
          newSocket.emit('answer', {
            targetSocketId: fromSocketId,
            answer,
          })

          setPeers(new Map(peerConnectionsRef.current))
        } catch (error) {
          console.error('Error handling offer:', error)
        }
      }
    )

    // Handle incoming answer
    newSocket.on(
      'answer',
      async ({
        fromSocketId,
        answer,
      }: {
        fromSocketId: string
        answer: RTCSessionDescriptionInit
      }) => {
        console.log('Received answer from', fromSocketId)

        const peerData = peerConnectionsRef.current.get(fromSocketId)
        if (peerData) {
          try {
            await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer))
          } catch (error) {
            console.error('Error handling answer:', error)
          }
        }
      }
    )

    // Handle ICE candidate
    newSocket.on(
      'ice-candidate',
      async ({
        fromSocketId,
        candidate,
      }: {
        fromSocketId: string
        candidate: RTCIceCandidateInit
      }) => {
        console.log('Received ICE candidate from', fromSocketId)

        const peerData = peerConnectionsRef.current.get(fromSocketId)
        if (peerData) {
          try {
            await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (error) {
            console.error('Error adding ICE candidate:', error)
          }
        }
      }
    )

    newSocket.on('raise-hand-updated', (payload: RaisedHandEvent) => {
      setRaisedHands((prev) => ({
        ...prev,
        [payload.userId]: {
          userName: payload.userName,
          isRaised: payload.isRaised,
          timestamp: payload.timestamp,
        },
      }))
    })

    newSocket.on('meeting-reaction', (payload: MeetingReaction) => {
      setReactions((prev) => {
        const next = [...prev, payload]
        return next.slice(-30)
      })
    })

    newSocket.on('meeting-chat', (payload: ChatMessage) => {
      setChatMessages((prev) => {
        const next = [...prev, payload]
        return next.slice(-200)
      })
    })

    return () => {
      // Cleanup
      console.log('Cleaning up WebRTC connections')
      newSocket.emit('leave-meeting')
      newSocket.disconnect()

      // Close all peer connections
      peerConnectionsRef.current.forEach((peerData) => {
        peerData.connection.close()
      })
      peerConnectionsRef.current.clear()
      setPeers(new Map())
      setRemoteStreams(new Map())
    }
  }, [enabled, meetingId, userId, userName, allowDelayedAudio])

  // Update local stream tracks when stream changes
  useEffect(() => {
    if (localStream) {
      peerConnectionsRef.current.forEach((peerData) => {
        const senders = peerData.connection.getSenders()

        localStream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind)
          if (sender) {
            sender.replaceTrack(track)
          } else {
            peerData.connection.addTrack(track, localStream)
          }
        })
      })
    }
  }, [localStream])

  const toggleRaiseHand = (isRaised: boolean) => {
    if (!socketRef.current) return
    socketRef.current.emit('raise-hand', {
      meetingId,
      userId,
      userName,
      isRaised,
      timestamp: Date.now(),
    })
  }

  const sendReaction = (reaction: string) => {
    if (!socketRef.current || !reaction) return
    socketRef.current.emit('meeting-reaction', {
      meetingId,
      userId,
      userName,
      reaction,
      timestamp: Date.now(),
    })
  }

  const sendChatMessage = (message: string) => {
    const trimmed = message.trim()
    if (!socketRef.current || !trimmed) return
    socketRef.current.emit('meeting-chat', {
      meetingId,
      userId,
      userName,
      message: trimmed,
      timestamp: Date.now(),
    })
  }

  return {
    socket,
    peers,
    remoteStreams,
    isConnected,
    participants,
    raisedHands,
    reactions,
    chatMessages,
    toggleRaiseHand,
    sendReaction,
    sendChatMessage,
  }
}
