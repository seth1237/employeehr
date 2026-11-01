import { redirect } from "next/navigation"

export default function EmployeeTransfersPage() {
  redirect("/admin/stock/transfers?type=employee")
}
