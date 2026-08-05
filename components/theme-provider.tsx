'use client'

import * as React from 'react'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()

  React.useEffect(() => {
    const applyBranding = async () => {
      // Skip branding fetch on auth pages or if not authenticated
      const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/auth'
      if (isAuthPage || !isAuthenticated()) {
        return
      }

      try {
        const res = await api.company.getBranding()
        if (res?.success && res.data) {
          const { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, borderRadius, fontFamily, buttonStyle, logo } = res.data as any
          const root = document.documentElement
          if (primaryColor) {
            root.style.setProperty('--brand-primary', primaryColor)
            root.style.setProperty('--primary', primaryColor)
          }
          if (secondaryColor) {
            root.style.setProperty('--brand-secondary', secondaryColor)
          }
          if (accentColor) {
            root.style.setProperty('--brand-accent', accentColor)
            root.style.setProperty('--accent', accentColor)
          }
          if (backgroundColor) {
            root.style.setProperty('--brand-background', backgroundColor)
            root.style.setProperty('--background', backgroundColor)
            // Apply to actual page background in light mode
            if (!document.documentElement.classList.contains('dark')) {
              root.style.backgroundColor = backgroundColor
            }
          }
          if (textColor) {
            root.style.setProperty('--brand-text', textColor)
            root.style.setProperty('--foreground', textColor)
          }
          if (borderRadius) {
            root.style.setProperty('--brand-radius', borderRadius)
            root.style.setProperty('--radius', borderRadius)
          }
          if (fontFamily) {
            root.style.setProperty('--brand-font', fontFamily)
            // Actually apply the font family to the entire document
            root.style.fontFamily = fontFamily
          }
          if (logo) {
            root.style.setProperty('--company-logo-url', `url('${logo}')`)
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
