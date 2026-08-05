import { redirect } from "next/navigation"

export default async function AccountsComplaintDetailRedirect({
  params,
}: {
  params: Promise<{ complaintId: string }>
}) {
  const { complaintId } = await params
  redirect(`/admin/clients/complaints/${complaintId}`)
}
