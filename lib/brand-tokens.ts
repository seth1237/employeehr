/** Brand colour scales derived from each tenant's palette. Never hardcode a company hex here. */

export type BrandScale = {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
}

export type BrandTokens = {
  primary: string
  secondary: string
  accent: string
  primaryScale: BrandScale
  secondaryScale: BrandScale
  accentScale: BrandScale
  onPrimary: string
  onSecondary: string
  onAccent: string
  headerBg: string
  headerBorder: string
  selectedBg: string
  selectedFg: string
  attentionBg: string
  attentionFg: string
  highlightBg: string
  highlightFg: string
  pageBg: string
  text: string
}

export const PRODUCT_DEFAULTS = {
  primary: "#296ff0",
  secondary: "#059669",
  accent: "#f59e0b",
  background: "#f6f7f9",
  text: "#1f2937",
}

type Rgb = { r: number; g: number; b: number }

export function parseHex(hex: string): Rgb | null {
  const raw = String(hex || "").trim()
  const normalized = raw.startsWith("#") ? raw.slice(1) : raw
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split("")
    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
    }
  }
  if (normalized.length !== 6 || /[^0-9a-f]/i.test(normalized)) return null
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function toHex({ r, g, b }: Rgb) {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  }
}

export function hexToRgba(hex: string, alpha: number) {
  const rgb = parseHex(hex) || { r: 41, g: 111, b: 240 }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function luminance(hex: string) {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

export function onColor(hex: string) {
  return luminance(hex) > 0.55 ? "#0f172a" : "#ffffff"
}

/** Mix ratios match the requested 50–500 ramps (light tints, then full brand). */
export function makeScale(hex: string): BrandScale {
  const base = parseHex(hex) || parseHex(PRODUCT_DEFAULTS.primary)!
  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 15, g: 23, b: 42 }
  return {
    50: toHex(mix(base, white, 0.92)),
    100: toHex(mix(base, white, 0.78)),
    200: toHex(mix(base, white, 0.52)),
    300: toHex(mix(base, white, 0.28)),
    400: toHex(mix(base, white, 0.12)),
    500: toHex(base),
    600: toHex(mix(base, black, 0.14)),
    700: toHex(mix(base, black, 0.28)),
  }
}

function isNearWhite(hex?: string) {
  const value = String(hex || "").toLowerCase().replace("#", "")
  return !value || value === "fff" || value === "ffffff"
}

export function buildBrandTokens(input: {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
}): BrandTokens {
  const primary = parseHex(input.primaryColor || "") ? input.primaryColor! : PRODUCT_DEFAULTS.primary
  const secondary = parseHex(input.secondaryColor || "") ? input.secondaryColor! : PRODUCT_DEFAULTS.secondary
  const accent = parseHex(input.accentColor || "") ? input.accentColor! : PRODUCT_DEFAULTS.accent
  const primaryScale = makeScale(primary)
  const secondaryScale = makeScale(secondary)
  const accentScale = makeScale(accent)

  return {
    primary,
    secondary,
    accent,
    primaryScale,
    secondaryScale,
    accentScale,
    onPrimary: onColor(primary),
    onSecondary: onColor(secondary),
    onAccent: onColor(accent),
    headerBg: "#ffffff",
    headerBorder: "#e2e8f0",
    selectedBg: primaryScale[50],
    selectedFg: primaryScale[700],
    attentionBg: secondaryScale[50],
    attentionFg: secondaryScale[700],
    highlightBg: accentScale[50],
    highlightFg: accentScale[700],
    pageBg: isNearWhite(input.backgroundColor) ? PRODUCT_DEFAULTS.background : String(input.backgroundColor),
    text: parseHex(input.textColor || "") ? input.textColor! : PRODUCT_DEFAULTS.text,
  }
}

function setScale(root: HTMLElement, prefix: string, scale: BrandScale) {
  ;(Object.keys(scale) as Array<keyof BrandScale>).forEach((step) => {
    root.style.setProperty(`${prefix}-${step}`, scale[step])
  })
}

export function applyBrandTokens(
  root: HTMLElement,
  branding: {
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    backgroundColor?: string
    textColor?: string
    borderRadius?: string
    fontFamily?: string
    logo?: string
  },
) {
  const tokens = buildBrandTokens(branding)

  root.style.setProperty("--brand-primary", tokens.primary)
  root.style.setProperty("--brand-secondary", tokens.secondary)
  root.style.setProperty("--brand-accent", tokens.accent)
  setScale(root, "--brand-primary", tokens.primaryScale)
  setScale(root, "--brand-secondary", tokens.secondaryScale)
  setScale(root, "--brand-accent", tokens.accentScale)

  root.style.setProperty("--primary", tokens.primary)
  root.style.setProperty("--primary-foreground", tokens.onPrimary)
  root.style.setProperty("--eh-btn-fill", tokens.primary)
  root.style.setProperty("--eh-btn-label", tokens.onPrimary)
  root.style.setProperty("--ring", tokens.primaryScale[300])
  root.style.setProperty("--sidebar-primary", tokens.primary)
  root.style.setProperty("--sidebar-primary-foreground", tokens.onPrimary)
  root.style.setProperty("--chart-1", tokens.primary)
  root.style.setProperty("--chart-2", tokens.secondary)
  root.style.setProperty("--chart-5", tokens.accent)

  // Keep shadcn --accent as a neutral hover surface. Brand pink lives on --brand-accent.
  root.style.setProperty("--accent", "#f1f5f9")
  root.style.setProperty("--accent-foreground", "#0f172a")
  root.style.setProperty("--secondary", "#f1f5f9")
  root.style.setProperty("--secondary-foreground", "#334155")
  root.style.setProperty("--muted", "#f1f5f9")
  root.style.setProperty("--muted-foreground", "#64748b")
  root.style.setProperty("--border", "#e2e8f0")
  root.style.setProperty("--input", "#e2e8f0")
  root.style.setProperty("--card", "#ffffff")
  root.style.setProperty("--popover", "#ffffff")
  root.style.setProperty("--sidebar", "#ffffff")
  root.style.setProperty("--sidebar-accent", tokens.primaryScale[50])
  root.style.setProperty("--sidebar-accent-foreground", tokens.selectedFg)
  root.style.setProperty("--sidebar-border", "#e2e8f0")

  root.style.setProperty("--brand-header-bg", tokens.headerBg)
  root.style.setProperty("--brand-header-border", tokens.headerBorder)
  root.style.setProperty("--brand-selected-bg", tokens.selectedBg)
  root.style.setProperty("--brand-selected-fg", tokens.selectedFg)
  root.style.setProperty("--brand-attention-bg", tokens.attentionBg)
  root.style.setProperty("--brand-attention-fg", tokens.attentionFg)
  root.style.setProperty("--brand-highlight-bg", tokens.highlightBg)
  root.style.setProperty("--brand-highlight-fg", tokens.highlightFg)
  root.style.setProperty("--brand-soft", tokens.primaryScale[50])
  root.style.setProperty("--brand-soft-border", tokens.primaryScale[100])

  root.style.setProperty("--background", tokens.pageBg)
  root.style.setProperty("--brand-background", tokens.pageBg)
  root.style.setProperty("--foreground", tokens.text)
  root.style.setProperty("--brand-text", tokens.text)
  if (!root.classList.contains("dark")) {
    root.style.backgroundColor = tokens.pageBg
  }

  if (branding.borderRadius) {
    root.style.setProperty("--brand-radius", branding.borderRadius)
    root.style.setProperty("--radius", branding.borderRadius)
  }
  if (branding.fontFamily) {
    root.style.setProperty("--brand-font", branding.fontFamily)
    root.style.fontFamily = branding.fontFamily
  }
  if (branding.logo) {
    root.style.setProperty("--company-logo-url", `url('${branding.logo}')`)
  }

  return tokens
}
