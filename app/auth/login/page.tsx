"use client"

import type React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { ArrowLeft, Mail, Lock, ShieldCheck } from "lucide-react"
import { api } from "@/lib/api"
import { removeToken, removeUser, setToken, setUser } from "@/lib/auth"
import InvitationForm from "@/components/auth/invitation-form"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")
  const orgId = searchParams.get("org_id")
  const invitedEmail = searchParams.get("email")
  const companyName = searchParams.get("company") || "our organization"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [otpStep, setOtpStep] = useState(false)
  const [challengeId, setChallengeId] = useState("")
  const [otpEmail, setOtpEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // If we have an invite token, show the invitation form
  if (inviteToken && orgId) {
    return (
      <InvitationForm
        inviteToken={inviteToken}
        invitedEmail={invitedEmail || ""}
        companyName={companyName}
        orgId={orgId}
      />
    )
  }

  const completeLogin = (authData: any) => {
    setToken(authData.token)
    setUser({
      _id: authData.user._id,
      email: authData.user.email,
      first_name: authData.user.firstName || authData.user.first_name,
      last_name: authData.user.lastName || authData.user.last_name,
      role: authData.user.role,
      org_id: authData.user.org_id,
    })

    const role = authData.user.role
    if (role === "company_admin" || role === "hr") {
      router.push("/admin")
    } else if (role === "manager") {
      router.push("/manager")
    } else {
      router.push("/employee")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading) {
      return // Prevent multiple submissions
    }
    
    setError("")
    setIsLoading(true)

    try {
      if (!otpStep) {
        removeToken()
        removeUser()

        const response = await api.auth.login({ email, password })

        if (response.success && response.data) {
          const data: any = response.data
          if (data.requiresOtp) {
            setOtpStep(true)
            setChallengeId(data.challengeId)
            setOtpEmail(data.email || email)
            return
          }

          completeLogin(data)
        } else {
          setError(response.message || "Login failed")
        }
      } else {
        const response = await api.auth.verifyLoginOtp({
          email: otpEmail || email,
          otp,
          challengeId,
          loginType: "standard",
        })

        if (response.success && response.data) {
          completeLogin(response.data as any)
        } else {
          setError(response.message || "OTP verification failed")
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!challengeId || !otpStep || isLoading) {
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const response = await api.auth.resendLoginOtp({
        email: otpEmail || email,
        challengeId,
        loginType: "standard",
      })

      if (response.success && response.data) {
        const data: any = response.data
        setChallengeId(data.challengeId)
        setOtpEmail(data.email || otpEmail || email)
        setOtp("")
      } else {
        setError(response.message || "Failed to resend OTP")
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Use your account credentials to continue.</p>
      </div>

      <Card className="border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {!otpStep ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
            </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link href="/auth/forgot-password" className="text-xs text-slate-500 hover:text-slate-900">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Verification code sent
                </div>
                <p className="mt-1">Enter the 6-digit OTP sent to {otpEmail || email}.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">One-Time Password (OTP)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-900"
                disabled={isLoading}
                onClick={() => {
                  setOtpStep(false)
                  setOtp("")
                  setChallengeId("")
                  setOtpEmail("")
                }}
              >
                Use different credentials
              </button>

              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-900"
                disabled={isLoading}
                onClick={handleResendOtp}
              >
                Resend OTP
              </button>
            </>
          )}

          <div className="rounded-lg bg-blue-50 p-2">
            <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? (otpStep ? "Verifying..." : "Signing in...") : (otpStep ? "Verify OTP" : "Sign In")}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      </Card>

      <Card className="border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-slate-900 hover:underline">
            Create one now
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
 
