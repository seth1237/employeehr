import { notFound, redirect } from "next/navigation"
import { AccountsPlannedPage } from "@/components/accounts/accounts-planned-page"
import {
  ACCOUNTS_EXPLICIT_PATHS,
  getAccountsPageBySlug,
} from "@/lib/accounts-nav"

type PageProps = {
  params: Promise<{ slug: string[] }>
}

export default async function AccountsCatchAllPage({ params }: PageProps) {
  const { slug } = await params
  const path = `/admin/accounts/${slug.join("/")}`

  if (ACCOUNTS_EXPLICIT_PATHS.has(path)) {
    notFound()
  }

  const page = getAccountsPageBySlug(slug)
  if (!page) {
    notFound()
  }

  if (page.redirectTo) {
    redirect(page.redirectTo)
  }

  if (page.status === "planned") {
    return <AccountsPlannedPage page={page} />
  }

  // Live pages with dedicated routes should not reach here
  if (page.status === "live") {
    redirect(page.href)
  }

  notFound()
}
