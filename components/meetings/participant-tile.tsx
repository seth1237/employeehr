'use client'

import { forwardRef } from 'react'
import { Mic, MicOff, Hand } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVATAR_PALETTE = [
  '#1a73e8',
  '#0f766e',
  '#7c3aed',
  '#c2410c',
  '#be185d',
  '#0369a1',
  '#4d7c0f',
  '#b45309',
]

export function getAvatarColor(name: string) {
  const value = String(name || 'User')
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

export function getInitials(name: string) {
  const parts = String(name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

type ParticipantTileProps = {
  name: string
  isLocal?: boolean
  isGuest?: boolean
  isMuted?: boolean
  isCameraOff?: boolean
  isScreenSharing?: boolean
  isHandRaised?: boolean
  isOrganizer?: boolean
  showVideo?: boolean
  className?: string
  children?: React.ReactNode
  pip?: React.ReactNode
}

export const ParticipantTile = forwardRef<HTMLDivElement, ParticipantTileProps>(
  function ParticipantTile(
    {
      name,
      isLocal = false,
      isGuest = false,
      isMuted = false,
      isCameraOff = false,
      isScreenSharing = false,
      isHandRaised = false,
      isOrganizer = false,
      showVideo = true,
      className,
      children,
      pip,
    },
    ref,
  ) {
    const displayName = isLocal ? `${name || 'You'} (You)` : name || 'Participant'
    const avatarColor = getAvatarColor(name || 'Participant')
    const initials = getInitials(name || 'P')

    return (
      <div
        ref={ref}
        className={cn(
          'group relative min-h-0 overflow-hidden rounded-2xl bg-[#202124] shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/5',
          className,
        )}
      >
        {/* Keep media children mounted so remote audio keeps playing when video is off */}
        <div
          className={cn(
            'absolute inset-0',
            showVideo && !isCameraOff ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {children}
        </div>

        {(!showVideo || isCameraOff) && (
          <div
            className="flex h-full min-h-[180px] w-full items-center justify-center"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${avatarColor}55, transparent 55%), #202124`,
            }}
          >
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold text-white shadow-lg sm:h-28 sm:w-28 sm:text-4xl"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          </div>
        )}

        {pip}

        {/* Top status chips */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          {isScreenSharing && (
            <span className="rounded-md bg-black/65 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              Presenting
            </span>
          )}
        </div>

        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
          {isHandRaised && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f9ab00] text-[#202124] shadow-md">
              <Hand className="h-4 w-4" />
            </span>
          )}
          {isMuted && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ea4335] text-white shadow-md">
              <MicOff className="h-4 w-4" />
            </span>
          )}
        </div>

        {/* Google Meet–style name tag */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div className="inline-flex max-w-[85%] items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 text-white backdrop-blur-md">
            {!isMuted ? (
              <Mic className="h-3.5 w-3.5 shrink-0 opacity-80" />
            ) : (
              <MicOff className="h-3.5 w-3.5 shrink-0 text-[#f28b82]" />
            )}
            <span className="truncate text-[13px] font-medium leading-none tracking-tight">
              {displayName}
            </span>
            {isGuest && (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90">
                Guest
              </span>
            )}
            {isOrganizer && !isGuest && (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90">
                Host
              </span>
            )}
          </div>
        </div>
      </div>
    )
  },
)

export function getMeetingGridClass(count: number) {
  if (count <= 1) return 'grid-cols-1 max-w-4xl mx-auto'
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto'
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto'
  if (count === 4) return 'grid-cols-2 max-w-6xl mx-auto'
  if (count <= 6) return 'grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
}
