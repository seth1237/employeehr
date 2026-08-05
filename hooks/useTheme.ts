import { useEffect, useCallback } from 'react'

export interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  borderRadius: string
  fontFamily: string
  buttonStyle: string
  glassEnabled: boolean
  glassOpacity: number
  glassBlur: number
  glassTint: string
  buttonShadow: string
  hoverAnimation: string
  buttonGradient: boolean
  glowEffect: string
  transparency: number
  rippleEffect: boolean
  animationSpeed: string
  cardStyle: string
  sidebarStyle: string
  borderStyle: string
  cornerStyle: string
  pageBackground: string
  iconStyle: string
  buttonSize: string
  buttonPadding: string
  navigationAnimation: string
  themePreset: string
}

export const useTheme = () => {
  const applyCssVars = useCallback((config: Partial<ThemeConfig>) => {
    const root = document.documentElement

    // Core Colors
    if (config.primaryColor) {
      root.style.setProperty('--brand-primary', config.primaryColor)
      root.style.setProperty('--primary', config.primaryColor)
    }
    if (config.secondaryColor) {
      root.style.setProperty('--brand-secondary', config.secondaryColor)
    }
    if (config.accentColor) {
      root.style.setProperty('--brand-accent', config.accentColor)
      root.style.setProperty('--accent', config.accentColor)
    }
    if (config.backgroundColor) {
      root.style.setProperty('--brand-background', config.backgroundColor)
      root.style.setProperty('--background', config.backgroundColor)
      root.style.backgroundColor = config.backgroundColor
    }
    if (config.textColor) {
      root.style.setProperty('--brand-text', config.textColor)
      root.style.setProperty('--foreground', config.textColor)
    }

    // Typography
    if (config.borderRadius) {
      root.style.setProperty('--brand-radius', config.borderRadius)
      root.style.setProperty('--radius', config.borderRadius)
    }
    if (config.fontFamily) {
      root.style.setProperty('--brand-font', config.fontFamily)
      root.style.fontFamily = config.fontFamily
    }

    // Glass Morphism
    if (config.glassEnabled !== undefined) {
      root.style.setProperty('--glass-enabled', config.glassEnabled ? '1' : '0')
    }
    if (config.glassOpacity !== undefined) {
      root.style.setProperty('--glass-opacity', `${config.glassOpacity}%`)
    }
    if (config.glassBlur !== undefined) {
      root.style.setProperty('--glass-blur', `${config.glassBlur}px`)
    }
    if (config.glassTint) {
      root.style.setProperty('--glass-tint', config.glassTint)
    }

    // Shadows & Effects
    if (config.buttonShadow) {
      root.style.setProperty('--button-shadow', config.buttonShadow)
    }
    if (config.glowEffect) {
      root.style.setProperty('--glow-effect', config.glowEffect)
    }

    // Animations
    if (config.hoverAnimation) {
      root.style.setProperty('--hover-animation', config.hoverAnimation)
    }
    if (config.animationSpeed) {
      const speeds = { fast: '0.15s', normal: '0.3s', slow: '0.5s' }
      root.style.setProperty('--animation-duration', speeds[config.animationSpeed as keyof typeof speeds] || '0.3s')
    }
    if (config.navigationAnimation) {
      root.style.setProperty('--nav-animation', config.navigationAnimation)
    }

    // Components
    if (config.cardStyle) {
      root.style.setProperty('--card-style', config.cardStyle)
    }
    if (config.sidebarStyle) {
      root.style.setProperty('--sidebar-style', config.sidebarStyle)
    }
    if (config.borderStyle) {
      root.style.setProperty('--border-style', config.borderStyle)
    }
    if (config.cornerStyle) {
      root.style.setProperty('--corner-style', config.cornerStyle)
    }
    if (config.pageBackground) {
      root.style.setProperty('--page-background', config.pageBackground)
    }

    // UI Elements
    if (config.buttonSize) {
      root.style.setProperty('--button-size', config.buttonSize)
    }
    if (config.buttonPadding) {
      root.style.setProperty('--button-padding', config.buttonPadding)
    }
    if (config.iconStyle) {
      root.style.setProperty('--icon-style', config.iconStyle)
    }

    // Transparency & Effects
    if (config.transparency !== undefined) {
      root.style.setProperty('--transparency', `${config.transparency}%`)
    }
    if (config.rippleEffect !== undefined) {
      root.style.setProperty('--ripple-enabled', config.rippleEffect ? '1' : '0')
    }
    if (config.buttonGradient !== undefined) {
      root.style.setProperty('--gradient-enabled', config.buttonGradient ? '1' : '0')
    }

    // Theme Preset
    if (config.themePreset) {
      root.style.setProperty('--theme-preset', config.themePreset)
      applyThemePreset(config.themePreset, config)
    }
  }, [])

  const applyThemePreset = useCallback((preset: string, config: Partial<ThemeConfig>) => {
    const presets: Record<string, Partial<ThemeConfig>> = {
      corporate: {
        primaryColor: '#1e40af',
        secondaryColor: '#0369a1',
        accentColor: '#ea580c',
        glassEnabled: true,
        glassOpacity: 12,
        buttonShadow: 'medium',
        cardStyle: 'glass',
        sidebarStyle: 'glass',
      },
      healthcare: {
        primaryColor: '#0891b2',
        secondaryColor: '#0369a1',
        accentColor: '#dc2626',
        glassEnabled: true,
        glassOpacity: 10,
        buttonShadow: 'small',
        cardStyle: 'elevated',
        sidebarStyle: 'solid',
      },
      finance: {
        primaryColor: '#1e3a8a',
        secondaryColor: '#064e3b',
        accentColor: '#92400e',
        glassEnabled: false,
        buttonShadow: 'floating',
        cardStyle: 'outlined',
        sidebarStyle: 'solid',
      },
      'dark-glass': {
        primaryColor: '#3b82f6',
        secondaryColor: '#8b5cf6',
        accentColor: '#ec4899',
        backgroundColor: '#0f172a',
        textColor: '#f1f5f9',
        glassEnabled: true,
        glassOpacity: 20,
        glassBlur: 24,
        cardStyle: 'glass',
        sidebarStyle: 'glass',
      },
      ocean: {
        primaryColor: '#0369a1',
        secondaryColor: '#0c4a6e',
        accentColor: '#0ea5e9',
        glassEnabled: true,
        cardStyle: 'glass',
      },
      emerald: {
        primaryColor: '#059669',
        secondaryColor: '#065f46',
        accentColor: '#10b981',
        glassEnabled: true,
      },
      'royal-blue': {
        primaryColor: '#4f46e5',
        secondaryColor: '#312e81',
        accentColor: '#6366f1',
        glassEnabled: true,
      },
      minimal: {
        primaryColor: '#1f2937',
        secondaryColor: '#6b7280',
        accentColor: '#3b82f6',
        glassEnabled: false,
        buttonShadow: 'none',
        cardStyle: 'flat',
        sidebarStyle: 'solid',
      },
      apple: {
        primaryColor: '#0071e3',
        secondaryColor: '#34c759',
        accentColor: '#ff9500',
        glassEnabled: true,
        glassOpacity: 15,
        glassBlur: 20,
        cardStyle: 'glass',
        sidebarStyle: 'glass',
        borderRadius: '0.75rem',
      },
      stripe: {
        primaryColor: '#0a0e27',
        secondaryColor: '#3d4ef5',
        accentColor: '#24c9a8',
        glassEnabled: false,
        buttonShadow: 'medium',
        cardStyle: 'outlined',
      },
      vercel: {
        primaryColor: '#000000',
        secondaryColor: '#1a1a1a',
        accentColor: '#0070f3',
        glassEnabled: true,
        glassOpacity: 8,
        cardStyle: 'glass',
      },
      linear: {
        primaryColor: '#0d0d0d',
        secondaryColor: '#525252',
        accentColor: '#5e5ce6',
        glassEnabled: true,
        glassOpacity: 12,
        buttonShadow: 'none',
        cardStyle: 'glass',
      },
    }

    const presetConfig = presets[preset] || presets.corporate
    applyCssVars({ ...presetConfig, ...config })
  }, [applyCssVars])

  return { applyCssVars, applyThemePreset }
}
