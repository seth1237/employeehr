const DEFAULT_OWNER_EMAILS = ["bellarinseth@gmail.com"]

export function getPlatformOwnerEmails(): string[] {
  const fromEnv = String(process.env.PLATFORM_OWNER_EMAILS || process.env.PLATFORM_OWNER_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (fromEnv.length > 0) return fromEnv
  return DEFAULT_OWNER_EMAILS.map((email) => email.toLowerCase())
}

export function isPlatformOwner(email?: string, role?: string): boolean {
  if (!email) return false
  if (role === "super_admin") return true
  return getPlatformOwnerEmails().includes(email.toLowerCase())
}
