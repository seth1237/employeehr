'use client'

import { useEffect } from 'react'
import { cleanupTokens } from '@/lib/tokenCleanup'

/**
 * AppInitializer
 * Runs critical initialization tasks on app load
 */
export function AppInitializer() {
  useEffect(() => {
    // Run token cleanup on app initialization
    cleanupTokens()
  }, [])

  return null // This component doesn't render anything
}
