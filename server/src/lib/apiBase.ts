const DEFAULT_LOCAL = "http://localhost:5010"

const API_URL =
  process.env.API_URL ||
  process.env.ERP_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://backend.codewithseth.co.ke"
    : DEFAULT_LOCAL)

export default API_URL
