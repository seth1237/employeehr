export const LOGGED_ACTIVITY_TYPES = [
  { id: "cme", label: "CME" },
  { id: "sme_session", label: "SME session" },
  { id: "in_office", label: "In office" },
  { id: "in_office_repair", label: "In-office repair" },
  { id: "other", label: "Other" },
] as const

export type LoggedActivityType = (typeof LOGGED_ACTIVITY_TYPES)[number]["id"]

export function loggedActivityLabel(row?: {
  type?: string | null
  title?: string | null
  job?: string | null
}) {
  const type = String(row?.type || "").toLowerCase()
  if (type === "other") {
    return String(row?.title || row?.job || "").trim() || "Other"
  }
  const match = LOGGED_ACTIVITY_TYPES.find((item) => item.id === type)
  return match?.label || String(row?.title || row?.job || "").trim() || "Activity"
}

function isLoggedActivity(type: string, kind: string) {
  if (kind === "logged" || kind === "other_activity") return true
  return LOGGED_ACTIVITY_TYPES.some((item) => item.id === type)
}

export function cleanActivityLabel(row?: {
  type?: string | null
  serviceType?: string | null
  kind?: string | null
  title?: string | null
  job?: string | null
}) {
  const type = String(row?.type || "").toLowerCase()
  const kind = String(row?.kind || "").toLowerCase()
  const title = String(row?.serviceType || row?.title || row?.job || "").toLowerCase()
  const blob = `${type} ${kind} ${title}`

  if (isLoggedActivity(type, kind)) return loggedActivityLabel(row)
  if (kind === "request" || type === "request" || kind === "ticket") return "Fault report"
  if (type === "installation" || kind === "installation" || /install/.test(blob)) {
    return "Machine installation"
  }
  if (
    type === "corrective" ||
    kind === "breakdown" ||
    /repair|breakdown|fault|corrective/.test(blob)
  ) {
    return "Machine repair"
  }
  if (type === "calibration" || kind === "calibration" || /calibrat/.test(blob)) {
    return "Calibration"
  }
  return "Machine service"
}
