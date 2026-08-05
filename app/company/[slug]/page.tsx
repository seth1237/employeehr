"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Lock, AlertCircle, ShieldCheck } from "lucide-react"
import { setToken, setUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"

interface Company {
  name: string
  slug: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
}

export default function CompanyLoginPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [challengeId, setChallengeId] = useState("")

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  })

  // Validate company exists
  useEffect(() => {
    const validateCompany = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/validate-company/${slug}`)
        const data = await response.json()

        if (data.success && data.data) {
          setCompany(data.data.company)
        } else {
          setError("Company not found or inactive")
        }
      } catch (err) {
        setError("Failed to load company information")
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      validateCompany()
    }
  }, [slug])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }))
    setLoginError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError("")

    try {
      let data: any

      if (!otpStep) {
        const response = await fetch(`${API_URL}/api/auth/company-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slug,
            email: credentials.email,
            password: credentials.password,
          }),
        })

        data = await response.json()

        if (data.success && data.data?.requiresOtp) {
          setOtpStep(true)
          setChallengeId(data.data.challengeId)
          return
        }
      } else {
        const response = await fetch(`${API_URL}/api/auth/verify-login-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: credentials.email,
            otp,
            challengeId,
            loginType: "company",
          }),
        })

        data = await response.json()
      }

      if (data.success && data.data) {
        setToken(data.data.token)
        setUser({
          _id: data.data.user._id,
          email: data.data.user.email,
          first_name: data.data.user.firstName || "",
          last_name: data.data.user.lastName || "",
          role: data.data.user.role,
          org_id: data.data.user.org_id,
        })

        const role = data.data.user.role
        if (role === "company_admin" || role === "hr") {
          router.push("/admin")
        } else if (role === "manager") {
          router.push("/manager")
        } else {
          router.push("/employee")
        }
      } else {
        setLoginError(data?.message || (otpStep ? "OTP verification failed" : "Login failed"))
      }
    } catch (err: any) {
      setLoginError(err.message || "An error occurred. Please try again.")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleResendOtp = async () => {
    if (!otpStep || !challengeId || isLoggingIn) {
      return
    }

    try {
      setIsLoggingIn(true)
      setLoginError("")

      const response = await fetch(`${API_URL}/api/auth/resend-login-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.email,
          challengeId,
          loginType: "company",
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        setChallengeId(data.data.challengeId)
        setOtp("")
      } else {
        setLoginError(data?.message || "Failed to resend OTP")
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to resend OTP")
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="p-8 w-full max-w-md border-destructive/50">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push("/")} variant="outline">
              Go to Homepage
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: company?.primaryColor 
          ? `linear-gradient(135deg, ${company.primaryColor}10, ${company.secondaryColor || '#059669'}10)`
          : 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(5, 150, 105, 0.05))'
      }}
    >
      <Card className="w-full max-w-md p-8 border-border">
        {/* Company Logo/Name */}
        <div className="text-center mb-8">
          {company?.logo ? (
            <img src={company.logo} alt={company.name} className="h-16 mx-auto mb-4" />
          ) : (
            <div 
              className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: company?.primaryColor || '#2563eb' }}
            >
              {company?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold">{company?.name}</h1>
          <p className="text-muted-foreground mt-1">Employee Login</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {loginError && (
            <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-sm text-destructive flex items-center gap-2">
              <AlertCircle size={16} />
              {loginError}
            </div>
          )}

          {!otpStep ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    name="email"
                    placeholder="your.email@company.com"
                    value={credentials.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
            </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck size={16} />
                  OTP sent to {credentials.email}
                </div>
                <p className="mt-1 text-muted-foreground">Enter the 6-digit code from your email.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">One-Time Password (OTP)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition"
                disabled={isLoggingIn}
                onClick={() => {
                  setOtpStep(false)
                  setOtp("")
                  setChallengeId("")
                }}
              >
                Use different credentials
              </button>

              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition"
                disabled={isLoggingIn}
                onClick={handleResendOtp}
              >
                Resend OTP
              </button>
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoggingIn}
            style={{ backgroundColor: company?.primaryColor || '#2563eb' }}
          >
            {isLoggingIn ? (otpStep ? "Verifying..." : "Logging in...") : (otpStep ? "Verify OTP" : "Login")}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push(`/company/${slug}/forgot-password`)}
              className="hover:text-foreground transition"
            >
              Forgot password?
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>Powered by Elevate HR Platform</p>
        </div>
      </Card>
    </div>
  )
}
