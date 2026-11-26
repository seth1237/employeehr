export const TECHNICAL_SERVICE_ENGINEER = "technical_service_engineer"
export const TECHNICAL_SERVICE_LEAD = "technical_service_lead"

export const TECHNICAL_SERVICE_ROLES = [
  TECHNICAL_SERVICE_ENGINEER,
  TECHNICAL_SERVICE_LEAD,
] as const

export type TechnicalServiceRole = (typeof TECHNICAL_SERVICE_ROLES)[number]

export function isTechnicalServiceRole(role?: string | null) {
  return role === TECHNICAL_SERVICE_ENGINEER || role === TECHNICAL_SERVICE_LEAD
}

export function isTechnicalServiceLead(role?: string | null) {
  return role === TECHNICAL_SERVICE_LEAD
}

export function technicalServiceRoleLabel(role?: string | null) {
  if (role === TECHNICAL_SERVICE_LEAD) return "Technical Service Lead"
  if (role === TECHNICAL_SERVICE_ENGINEER) return "Service Engineer"
  return role || ""
}
