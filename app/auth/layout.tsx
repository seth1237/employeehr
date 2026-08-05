import type React from "react"
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 md:p-8">
      <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  )
}
