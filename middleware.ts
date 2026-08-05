import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const TOKEN_COOKIE = "elevate_auth_token"
const ADMIN_ROLES = new Set(["company_admin", "admin", "hr", "super_admin"])

function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    return typeof payload.role === "string" ? payload.role : null
  } catch {
    return null
  }
}

function getToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(TOKEN_COOKIE)?.value
  if (cookieToken) return cookieToken

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/dashboard")) {
    const adminPath = pathname.replace(/^\/dashboard/, "/admin")
    return NextResponse.redirect(new URL(`${adminPath}${request.nextUrl.search}`, request.url))
  }

  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/employee") ||
    pathname.startsWith("/manager")

  if (!isProtected) {
    return NextResponse.next()
  }

  const token = getToken(request)
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const role = getRoleFromToken(token)
  if (!role) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (pathname.startsWith("/admin") && !ADMIN_ROLES.has(role)) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (pathname.startsWith("/manager") && role !== "manager") {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (pathname.startsWith("/employee") && role !== "employee") {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/employee/:path*", "/manager/:path*", "/dashboard/:path*"],
}
