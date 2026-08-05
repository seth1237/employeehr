import { redirect } from "next/navigation"

export default function AccountsNewComplaintRedirect() {
  redirect("/admin/clients/complaints/new")
}
