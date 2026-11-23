"use client"

import { EngineerHeader, EngineerPage } from "@/components/engineer/engineer-ui"
import { PayslipWorkspace } from "@/components/payroll/payslip-workspace"
import { useEngineerBranding } from "@/components/engineer/branding"

export default function EngineerPayrollPage() {
  const branding = useEngineerBranding()
  const primary = branding.primaryColor?.startsWith("#") ? branding.primaryColor : "#0f766e"

  return (
    <EngineerPage>
      <EngineerHeader
        title="Payroll"
        description="Open a month for the breakdown, or download the slip."
      />
      <PayslipWorkspace primaryColor={primary} />
    </EngineerPage>
  )
}
