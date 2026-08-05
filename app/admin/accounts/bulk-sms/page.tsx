import { redirect } from "next/navigation"

export default function AccountsBulkSmsRedirect() {
  redirect("/admin/clients/bulk-sms")
}
