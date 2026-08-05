"use client"

import { Suspense } from "react"
import { VerifyOtpForm } from "./verify-otp-form"

function VerifyOtpFallback() {
  return (
    <div className="text-center">
      <p className="text-slate-600">Loading...</p>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<VerifyOtpFallback />}>
      <VerifyOtpForm />
    </Suspense>
  )
}
