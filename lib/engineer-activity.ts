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
