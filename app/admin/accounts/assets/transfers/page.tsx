import { redirect } from "next/navigation"

export default function AssetTransfersPage() {
  redirect("/admin/stock/transfers?type=asset")
}
