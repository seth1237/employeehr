"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react"
import { api } from "@/lib/api"
import { setToken, setUser } from "@/lib/auth"

interface InvitationFormProps {
  inviteToken: string
  invitedEmail: string
  companyName: string
  orgId: string
}

export default function InvitationForm({
  inviteToken,
  invitedEmail,
  companyName,
  orgId,
}: InvitationFormProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const validateForm = () => {
    if (!firstName.trim()) {
      setError("First name is required")
      return false
    }
    if (!lastName.trim()) {
      setError("Last name is required")
      return false
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters")
      return false
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Accept invitation and create account
      const response = await api.invitations.accept({
        invite_token: inviteToken,
        email: invitedEmail,
        firstName,
        lastName,
        password,
      })

      if (response.success && response.data) {
        setSuccess(true)

        // Log the user in after accepting invitation
        const loginResponse = await api.auth.login({
          email: invitedEmail,
          password,
        })

        if (loginResponse.success && loginResponse.data) {
          setToken(loginResponse.data.token)
          setUser({
            _id: loginResponse.data.user._id,
            email: loginResponse.data.user.email,
            first_name: loginResponse.data.user.firstName || loginResponse.data.user.first_name,
            last_name: loginResponse.data.user.lastName || loginResponse.data.user.last_name,
            role: loginResponse.data.user.role,
            org_id: loginResponse.data.user.org_id,
          })

          // Redirect based on role
          const role = loginResponse.data.user.role
          if (role === "company_admin" || role === "hr") {
            router.push("/admin")
          } else if (role === "manager") {
            router.push("/manager")
          } else {
            router.push("/employee")
          }
        }
      } else {
        setError(response.message || "Failed to accept invitation")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Join {companyName}</h1>
        <p className="text-muted-foreground mt-2">Complete your account setup to get started</p>
      </div>

      <Card className="p-8 border-border">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50 mb-6">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Invitation accepted</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  You were invited to join {companyName}. Complete your profile to continue.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                value={invitedEmail}
                className="pl-10 bg-muted"
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">This email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? "Setting up account..." : "Complete Setup & Sign In"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
