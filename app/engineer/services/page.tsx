import { redirect } from "next/navigation"

export default function PendingServicesRedirect() {
  redirect("/engineer/work-orders?filter=pending")
}
