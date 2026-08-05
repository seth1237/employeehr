import { redirect } from "next/navigation"

export default function AccountsInstalledMachinesRedirect() {
  redirect("/admin/clients/installed-machines")
}
