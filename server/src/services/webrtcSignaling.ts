import { Server as SocketIOServer } from "socket.io"
import type { Server as HTTPServer } from "http"

interface Participant {
  socketId: string
  userId: string
  userName: string
  meetingId: string
}

export class WebRTCSignalingService {
  private io: SocketIOServer
  private participants: Map<string, Participant> = new Map()
  private meetingRooms: Map<string, Set<string>> = new Map()

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "https://employeehr.vercel.app",
          "https://hr.codewithseth.co.ke",
          "https://backend.codewithseth.co.ke",
        ],
        credentials: true,
      },
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`)

      // Join meeting
      socket.on("join-meeting", ({ meetingId, userId, userName }) => {
        console.log(`${userName} (${userId}) joining meeting ${meetingId}`)

        // Add participant
        const participant: Participant = {
          socketId: socket.id,
          userId,
          userName,
          meetingId,
        }
        this.participants.set(socket.id, participant)

        // Add to meeting room
        if (!this.meetingRooms.has(meetingId)) {
          this.meetingRooms.set(meetingId, new Set())
        }
        this.meetingRooms.get(meetingId)!.add(socket.id)

        // Join socket.io room
        socket.join(meetingId)

        // Notify other participants
        const roomParticipants = Array.from(this.meetingRooms.get(meetingId)!)
          .filter((id) => id !== socket.id)
          .map((id) => this.participants.get(id))
          .filter(Boolean)

        // Send existing participants to new joiner
        socket.emit("existing-participants", roomParticipants)

        // Notify existing participants about new joiner
        socket.to(meetingId).emit("participant-joined", participant)

        console.log(`Meeting ${meetingId} now has ${roomParticipants.length + 1} participants`)
      })

      // WebRTC offer
      socket.on("offer", ({ meetingId, targetSocketId, offer }) => {
        console.log(`Forwarding offer from ${socket.id} to ${targetSocketId}`)
        this.io.to(targetSocketId).emit("offer", {
          fromSocketId: socket.id,
          fromUserId: this.participants.get(socket.id)?.userId,
          fromUserName: this.participants.get(socket.id)?.userName,
          offer,
        })
      })

      // WebRTC answer
      socket.on("answer", ({ targetSocketId, answer }) => {
        console.log(`Forwarding answer from ${socket.id} to ${targetSocketId}`)
        this.io.to(targetSocketId).emit("answer", {
          fromSocketId: socket.id,
          answer,
        })
      })

      // ICE candidate
      socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
        console.log(`Forwarding ICE candidate from ${socket.id} to ${targetSocketId}`)
        this.io.to(targetSocketId).emit("ice-candidate", {
          fromSocketId: socket.id,
          candidate,
        })
      })

      // Raise hand interaction
      socket.on("raise-hand", ({ meetingId, userId, userName, isRaised, timestamp }) => {
        const participant = this.participants.get(socket.id)
        if (!participant || participant.meetingId !== meetingId) return

        this.io.to(meetingId).emit("raise-hand-updated", {
          userId,
          userName,
          isRaised: Boolean(isRaised),
          timestamp: timestamp || Date.now(),
        })
      })

      // Reactions interaction
      socket.on("meeting-reaction", ({ meetingId, userId, userName, reaction, timestamp }) => {
        const participant = this.participants.get(socket.id)
        if (!participant || participant.meetingId !== meetingId || !reaction) return

        this.io.to(meetingId).emit("meeting-reaction", {
          userId,
          userName,
          reaction,
          timestamp: timestamp || Date.now(),
        })
      })

      // Chat interaction
      socket.on("meeting-chat", ({ meetingId, userId, userName, message, timestamp }) => {
        const participant = this.participants.get(socket.id)
        if (!participant || participant.meetingId !== meetingId || !message) return

        this.io.to(meetingId).emit("meeting-chat", {
          userId,
          userName,
          message,
          timestamp: timestamp || Date.now(),
        })
      })

      // Leave meeting
      socket.on("leave-meeting", () => {
        this.handleDisconnect(socket.id)
      })

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`)
        this.handleDisconnect(socket.id)
      })
    })
  }

  private handleDisconnect(socketId: string) {
    const participant = this.participants.get(socketId)
    if (participant) {
      const { meetingId } = participant

      // Remove from meeting room
      const room = this.meetingRooms.get(meetingId)
      if (room) {
        room.delete(socketId)
        if (room.size === 0) {
          this.meetingRooms.delete(meetingId)
        } else {
          // Notify other participants
          this.io.to(meetingId).emit("participant-left", participant)
        }
      }

      // Remove participant
      this.participants.delete(socketId)
      console.log(`${participant.userName} left meeting ${meetingId}`)
    }
  }

  public getMeetingParticipantCount(meetingId: string): number {
    return this.meetingRooms.get(meetingId)?.size || 0
  }
}
