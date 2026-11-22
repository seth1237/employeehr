'use client'

import * as React from 'react'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { applyBrandTokens } from '@/lib/brand-tokens'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()

  React.useEffect(() => {
    try {
      const cached = sessionStorage.getItem("elevate_branding")
      if (cached) applyBrandTokens(document.documentElement, JSON.parse(cached))
    } catch {
      // ignore
    }

    const applyBranding = async () => {
      // Skip branding fetch on auth pages or if not authenticated
      const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/auth'
      if (isAuthPage || !isAuthenticated()) {
        return
      }

      try {
        const res = await api.company.getBranding()
        if (res?.success && res.data) {
          const data = res.data as any
          applyBrandTokens(document.documentElement, data)
          const brandingSnapshot = {
            name: data.name,
            logo: data.logo,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            accentColor: data.accentColor,
            backgroundColor: data.backgroundColor,
            textColor: data.textColor,
            borderRadius: data.borderRadius,
            fontFamily: data.fontFamily,
          }
          try {
            sessionStorage.setItem('elevate_branding', JSON.stringify(brandingSnapshot))
          } catch {
            // ignore quota / private mode
          }
        }
      } catch (e) {
        // Silently fail - branding is optional
        console.debug('Branding not loaded:', e)
      }
    }
    applyBranding()
  }, [pathname])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
