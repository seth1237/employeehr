export const ON_THE_GO_PAGES = [
  "CORE",
  "CLIENTS",
  "INVENTORY MANAGER",
  "SYSTEM",
] as const

export function isOnTheGoPageSet(pages?: string[] | null) {
  if (!Array.isArray(pages) || pages.length !== ON_THE_GO_PAGES.length) return false
  return ON_THE_GO_PAGES.every((page) => pages.includes(page))
}
