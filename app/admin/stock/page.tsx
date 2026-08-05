import { redirect } from "next/navigation"

export default function StockIndexPage() {
  redirect("/admin/stock/add-inventory")
}
