import { redirect } from "next/navigation"

/** Accounts CRM routes redirect to Clients — finance stays under Accounts. */
export default function AccountsClientsRedirect() {
  redirect("/admin/clients/clients-list")
}
