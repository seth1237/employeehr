import { redirect } from "next/navigation"

export default function DutiesRedirect() {
  redirect("/engineer/work-orders?filter=mine")
}
