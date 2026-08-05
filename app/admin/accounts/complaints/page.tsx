import { redirect } from "next/navigation"

export default function AccountsComplaintsRedirect() {
  redirect("/admin/clients/complaints")
}
