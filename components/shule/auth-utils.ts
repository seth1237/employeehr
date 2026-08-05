"use client"

import { getToken as getAppToken, getUser as getAppUser, logout as appLogout, setToken as setAppToken, setUser as setAppUser } from "@/lib/auth"

export type Org = { slug: string; name: string }

export type User = {
  _id?: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  org_id?: string
}

const ROLE_MAP: Record<string, string> = {
  company_admin: "manager",
  hr: "manager",
  manager: "facilitator",
  employee: "student",
}

function mapSchoolRole(role: string) {
  return ROLE_MAP[role] || role
}

export function listOrgs(): Org[] {
  return []
}

export function createOrg(org: Org) {
  return org
}

export function listUsers(): User[] {
  return []
}

export function createUser(user: any) {
  return user
}

export function findUser(_org: string, _email: string) {
  return null
}

export function verifyLogin(_org: string, _email: string, _password: string) {
  return null
}

export function setSession(token: string, user: User) {
  setAppToken(token)
  setAppUser({
    _id: user._id || user.email,
    email: user.email,
    first_name: user.firstName || "",
    last_name: user.lastName || "",
    role: mapSchoolRole(user.role) as any,
    org_id: user.org_id || "",
  })
}

export function getSession(): User | null {
  const user = getAppUser()
  if (!user) return null

  return {
    _id: user._id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: mapSchoolRole(user.role),
    org_id: user.org_id,
  }
}

export function getToken(): string | null {
  return getAppToken()
}

export function logout() {
  appLogout()
}
