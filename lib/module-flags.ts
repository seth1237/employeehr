/** Modules still being built locally stay off the production site. */
export function isProcurementEnabled() {
  const flag = process.env.NEXT_PUBLIC_PROCUREMENT_ENABLED
  if (flag === "true") return true
  if (flag === "false") return false
  return process.env.NODE_ENV !== "production"
}
