import mongoose from "mongoose"
import { User } from "../models/User"

const USER_SELECT =
  "firstName lastName email employee_id position department"

export function isGuestUserId(userId: unknown): boolean {
  const id = String(userId || "").trim()
  return id.startsWith("guest_") || id.toLowerCase().startsWith("guest")
}

export function isValidUserObjectId(userId: unknown): boolean {
  const id = String(userId || "").trim()
  if (!id || isGuestUserId(id)) return false
  if (!mongoose.Types.ObjectId.isValid(id)) return false
  // Avoid mongoose casting loose 12-char strings
  return String(new mongoose.Types.ObjectId(id)) === id
}

export async function findUserByIdSafe(
  userId: unknown,
  select: string = USER_SELECT,
) {
  if (!isValidUserObjectId(userId)) return null
  try {
    return await User.findById(String(userId)).select(select).lean()
  } catch {
    return null
  }
}

export async function findUsersByIdsSafe(
  userIds: unknown[],
  select: string = USER_SELECT,
) {
  const ids = Array.from(
    new Set(
      userIds
        .map((id) => String(id || "").trim())
        .filter((id) => isValidUserObjectId(id)),
    ),
  )
  if (ids.length === 0) return []
  try {
    return await User.find({ _id: { $in: ids } }).select(select).lean()
  } catch {
    return []
  }
}

function guestDisplayUser(attendee: any) {
  const displayName = String(attendee?.display_name || "").trim()
  const parts = displayName.split(/\s+/).filter(Boolean)
  const firstName = parts[0] || "Guest"
  const lastName = parts.slice(1).join(" ") || ""
  return {
    firstName,
    lastName,
    email: "",
    employee_id: "",
    position: "Guest",
    department: "",
    is_guest: true,
  }
}

/**
 * Enrich a meeting attendee with user details.
 * Guest IDs (guest_*) never hit User.findById — that was casting to ObjectId and crashing list views.
 */
export async function enrichAttendee(
  attendee: any,
  select: string = USER_SELECT,
) {
  const plain =
    attendee && typeof attendee.toObject === "function"
      ? attendee.toObject()
      : { ...attendee }

  const isGuest = Boolean(plain.is_guest) || isGuestUserId(plain.user_id)
  if (isGuest) {
    return {
      ...plain,
      is_guest: true,
      user: guestDisplayUser(plain),
    }
  }

  const user = await findUserByIdSafe(plain.user_id, select)
  return {
    ...plain,
    is_guest: false,
    user: user || null,
  }
}

export async function enrichAttendees(
  attendees: any[] = [],
  select: string = USER_SELECT,
) {
  return Promise.all(attendees.map((attendee) => enrichAttendee(attendee, select)))
}

export async function enrichMeeting(
  meeting: any,
  options?: { select?: string },
) {
  const select = options?.select || USER_SELECT
  const organizer = await findUserByIdSafe(meeting.organizer_id, select)
  const attendees = await enrichAttendees(meeting.attendees || [], select)
  return {
    ...meeting,
    organizer,
    attendees,
  }
}

export function attendeeDisplayName(attendee: any): string {
  if (attendee?.display_name) return String(attendee.display_name)
  const user = attendee?.user
  if (user) {
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim()
    if (name) return name
  }
  if (isGuestUserId(attendee?.user_id)) return "Guest"
  return "Unknown"
}
