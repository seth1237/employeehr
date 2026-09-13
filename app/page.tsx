import type { Metadata } from "next"
import { LandingPage } from "@/components/home/landing-page"

export const metadata: Metadata = {
  title: "Elevate — Turn Manual Tasks into Automations",
  description:
    "Elevate ERP: inventory, payroll, procurement, and manufacturing workflows flowing into one automation hub. Signup or login to your company system.",
}

export default function Home() {
  return <LandingPage />
}
