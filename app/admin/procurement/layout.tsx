import { notFound } from "next/navigation"
import { isProcurementEnabled } from "@/lib/module-flags"

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  if (!isProcurementEnabled()) {
    notFound()
  }

  return <>{children}</>
}
