import { PageTransition } from "@/components/nav/page-transition"

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
