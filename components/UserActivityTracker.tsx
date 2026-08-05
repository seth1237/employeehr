'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getToken, logout } from '@/lib/auth'
import API_URL from '@/lib/apiBase'

/**
 * UserActivityTracker
 * Silently tracks user interaction heartbeats and page navigation in the background.
 * This component is invisible and does not affect the UI.
 */
export function UserActivityTracker() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string>('')
  const lastPulseTime = useRef<number>(0)
  const PULSE_COOLDOWN = 30 * 1000 // 30 seconds cooldown for pulses

  const trackAction = async (action: 'pulse' | 'view', resource?: string) => {
    const token = getToken()
    if (!token) return

    // Avoid redundant tracking of the same view
    if (action === 'view' && resource === lastTrackedPath.current) return
    if (action === 'view') lastTrackedPath.current = resource || ''

    // Throttle pulse actions
    if (action === 'pulse') {
      const now = Date.now()
      if (now - lastPulseTime.current < PULSE_COOLDOWN) return
      lastPulseTime.current = now
    }

    try {
      const baseUrl = API_URL

      await fetch(`${baseUrl}/api/activity/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          resource: resource || pathname,
          details: action === 'view' ? `Section access: ${pathname}` : 'Active session heartbeat'
        })
      })
    } catch (error) {
      // Fail silently - user should never see or feel the tracker
    }
  }

  const inactivityTimeout = useRef<number | null>(null)

  const resetInactivityTimer = () => {
    if (inactivityTimeout.current) {
      window.clearTimeout(inactivityTimeout.current)
    }

    if (!getToken()) {
      return
    }

    inactivityTimeout.current = window.setTimeout(() => {
      logout()
    }, 5 * 60 * 1000)
  }

  // Heartbeat, Visibility Tracking and Auto Logout
  useEffect(() => {
    if (!getToken()) return

    // Pulse every 2 minutes for higher resolution in the Interaction Logs
    const interval = window.setInterval(() => {
      trackAction('pulse')
    }, 2 * 60 * 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackAction('pulse')
        resetInactivityTimer()
      }
    }

    const handleUserActivity = () => {
      resetInactivityTimer()
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleUserActivity))
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Initial engagement pulse
    trackAction('pulse')
    resetInactivityTimer()

    return () => {
      clearInterval(interval)
      if (inactivityTimeout.current) {
        window.clearTimeout(inactivityTimeout.current)
      }
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleUserActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname]) // Re-bind pulse to current pathname context

  // Navigation Tracking
  useEffect(() => {
    trackAction('view', pathname)
  }, [pathname])

  return null // Completely invisible to the user
}
