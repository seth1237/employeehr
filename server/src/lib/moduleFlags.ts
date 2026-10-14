/** Modules still being built locally stay off the production API. */
export function isProcurementEnabled() {
  const flag = process.env.PROCUREMENT_ENABLED || process.env.NEXT_PUBLIC_PROCUREMENT_ENABLED
  if (flag === "true") return true
  if (flag === "false") return false
  return process.env.NODE_ENV !== "production"
}
