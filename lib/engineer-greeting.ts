const SESSION_KEY = "engineer_home_line_v1"
const LONG_AWAY_HOURS = 8

function hourNow() {
  return new Date().getHours()
}

function timeBucket(hour: number) {
  if (hour < 5) return "night"
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  if (hour < 21) return "evening"
  return "night"
}

function pick(list: string[]) {
  return list[Math.floor(Math.random() * list.length)] || list[0]
}

export function engineerFirstName(user?: { first_name?: string; firstName?: string } | null) {
  const name = String(user?.first_name || user?.firstName || "").trim()
  return name.split(" ")[0] || ""
}

export function pickEngineerGreeting(input: {
  firstName?: string
  pendingCount?: number
}) {
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (cached) return cached
  }

  const name = input.firstName || "there"
  const pending = Number(input.pendingCount || 0)
  const bucket = timeBucket(hourNow())

  const lines = [
    bucket === "morning" ? `Good morning, ${name}` : "",
    bucket === "morning" ? `Rise and shine, ${name}` : "",
    bucket === "afternoon" ? `Hope your day’s going well, ${name}` : "",
    bucket === "afternoon" ? `Keep the streak going, ${name}` : "",
    bucket === "evening" ? `Good evening, ${name}` : "",
    bucket === "evening" ? `Nice wrap-up energy, ${name}` : "",
    bucket === "night" ? `Still at it, ${name}?` : "",
    `Hey ${name}`,
    `You’ve got this, ${name}`,
    pending === 0 ? `Hey ${name}, you have nothing pending today!` : "",
    pending === 1 ? `Just one left, ${name}` : "",
    pending > 3 ? `Let’s knock a few out, ${name}` : "",
    `On it, ${name}`,
    `Quiet hustle today`,
  ].filter(Boolean)

  const line = pick(lines)
  if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, line)
  return line
}

export function shouldOfferPwaInstall() {
  if (typeof window === "undefined") return false
  const sessionKey = "engineer_pwa_banner_v1"
  const cached = sessionStorage.getItem(sessionKey)
  if (cached === "show") return true
  if (cached === "hide") return false

  const last = Number(localStorage.getItem("engineer_pwa_last_prompt") || 0)
  const aged = !last || Date.now() - last > LONG_AWAY_HOURS * 60 * 60 * 1000
  const show = aged && Math.random() < 0.28
  sessionStorage.setItem(sessionKey, show ? "show" : "hide")
  if (show) localStorage.setItem("engineer_pwa_last_prompt", String(Date.now()))
  return show
}
