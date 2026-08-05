"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
import { api } from "@/lib/api"

export function VerifyOtpForm() {
  const search = useSearchParams()
  const router = useRouter()
  const emailParam = search.get("email") || ""

  const [email, setEmail] = useState(emailParam)
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setEmail(emailParam)
  }, [emailParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError("")
    setLoading(true)
    try {
      const resp = await api.auth.verifyOtp({ email, otp })
      if (resp && resp.success) {
        const params = new URLSearchParams({ email, otp })
        router.push(`/auth/reset-password?${params.toString()}`)
      } else {
        setError(resp.message || "Invalid OTP")
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP")
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
        <h2 className="text-2xl font-semibold mt-4">Verify code</h2>
        <p className="text-sm text-slate-500">Enter the 6-digit code we sent to your email</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
          </div>

          <div>
            <label className="block text-sm font-medium">OTP Code</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input className="pl-10" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify Code"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
