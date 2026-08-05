"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export function ResetPasswordForm() {
  const search = useSearchParams()
  const router = useRouter()
  const emailParam = search.get("email") || ""
  const otpParam = search.get("otp") || ""

  const [email, setEmail] = useState(emailParam)
  const [otp, setOtp] = useState(otpParam)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    setEmail(emailParam)
    setOtp(otpParam)
  }, [emailParam, otpParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError("")
    if (password.length < 6) return setError("Password must be at least 6 characters")
    if (password !== confirm) return setError("Passwords do not match")

    setLoading(true)
    try {
      const resp = await api.auth.resetPassword({ email, otp, newPassword: password })
      if (resp && resp.success) {
        setSuccess("Password reset successfully. Redirecting to login...")
        setTimeout(() => router.push('/auth/login'), 1500)
      } else {
        setError(resp.message || "Failed to reset password")
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="text-center mb-6">
        <Link href="/auth/login" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
          Back to Login
        </Link>
        <h2 className="text-2xl font-semibold mt-4">Set new password</h2>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
          </div>

          <div>
            <label className="block text-sm font-medium">OTP</label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium">New password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium">Confirm password</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
