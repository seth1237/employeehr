"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import SignupForm from "@/components/auth/signup-form"
import { ArrowLeft, Building2, ArrowRight } from "lucide-react"

export default function SignupPage() {
  const [step, setStep] = useState<"choice" | "register">("choice")

  return (
    <div>
      {step === "choice" && (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur-sm text-center">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start your company workspace and onboard your team in minutes.
            </p>
          </div>

          <Card className="space-y-4 border-border/80 p-6 shadow-md">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
              <Building2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Company admin signup</p>
                <p className="mt-1 text-xs text-muted-foreground">Create your organization and continue to setup.</p>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-base py-6"
              onClick={() => setStep("register")}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Sign Up as Company Admin
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                Log in
              </Link>
            </p>
          </Card>
        </div>
      )}

      {step === "register" && <SignupForm onBack={() => setStep("choice")} />}
    </div>
  )
}
