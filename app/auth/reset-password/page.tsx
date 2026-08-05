"use client"

import { Suspense } from "react"
import { ResetPasswordForm } from "./reset-password-form"

function ResetPasswordFallback() {
  return (
    <div className="text-center">
      <p className="text-slate-600">Loading...</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
