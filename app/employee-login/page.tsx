"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import API_URL from "@/lib/apiBase"
import { setToken, setUser } from "@/lib/auth"
import { ShieldCheck } from "lucide-react"

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpStep, setOtpStep] = useState(false)
  const [challengeId, setChallengeId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      let data: any

      if (!otpStep) {
        const response = await fetch(`${API_URL}/api/auth/employee-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee_id: employeeId, password }),
        })

        data = await response.json()

        if (data.success && data.data?.requiresOtp) {
          setOtpStep(true)
          setChallengeId(data.data.challengeId)
          setEmail(data.data.email || "")
          return
        }
      } else {
        const response = await fetch(`${API_URL}/api/auth/verify-login-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            otp,
            challengeId,
            loginType: "employee",
          }),
        })

        data = await response.json()
      }

      if (data.success && data.data) {
        setToken(data.data.token)
        setUser({
          _id: data.data.user._id,
          email: data.data.user.email,
          first_name: data.data.user.firstName || data.data.user.first_name || "",
          last_name: data.data.user.lastName || data.data.user.last_name || "",
          role: data.data.user.role,
          org_id: data.data.user.org_id,
        })
        localStorage.setItem("company", JSON.stringify(data.data.company))
        router.push("/employee")
      } else {
        setError(data?.message || (otpStep ? "OTP verification failed" : "Login failed"))
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!otpStep || !challengeId || loading) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          challengeId,
          loginType: "employee",
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        setChallengeId(data.data.challengeId)
        setOtp("")
      } else {
        setError(data?.message || "Failed to resend OTP")
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Employee Login</CardTitle>
          <CardDescription className="text-center">
            Enter your employee ID and password to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {!otpStep ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="e.g., EMP001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="p-3 text-sm border rounded-md bg-primary/10 border-primary/30">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldCheck size={16} />
                    OTP sent to {email}
                  </div>
                  <p className="mt-1 text-muted-foreground">Enter the 6-digit code from your email.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp">One-Time Password (OTP)</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="button"
                  className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  disabled={loading}
                  onClick={() => {
                    setOtpStep(false)
                    setOtp("")
                    setChallengeId("")
                    setEmail("")
                  }}
                >
                  Use different credentials
                </button>

                <button
                  type="button"
                  className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  disabled={loading}
                  onClick={handleResendOtp}
                >
                  Resend OTP
                </button>
              </>
            )}

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (otpStep ? "Verifying..." : "Signing in...") : (otpStep ? "Verify OTP" : "Sign In")}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              Don't have an employee ID?{" "}
              <a href="/auth/signup" className="text-primary hover:underline">
                Contact your administrator
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
