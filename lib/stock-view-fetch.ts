export type StockView =
  | "add-inventory"
  | "sales"
  | "wms"
  | "status"
  | "analytics"
  | "history"
  | "outsourced"
  | "services"

/** Which API resources each stock view actually needs on first paint */
export const STOCK_VIEW_FETCHES: Record<
  StockView,
  { keys: string[]; productsLite?: boolean }
> = {
  "add-inventory": {
    keys: ["categories", "products", "branches", "manufacturers"],
    productsLite: true,
  },
  sales: {
    keys: [
      "categories",
      "products",
      "branches",
      "users",
      "sales",
      "invoices",
      "quotations",
      "clients",
      "branding",
    ],
  },
  wms: {
    keys: [
      "categories",
      "products",
      "branches",
      "entries",
      "manufacturers",
      "warehouseLocations",
    ],
    productsLite: true,
  },
  status: {
    keys: [
      "categories",
      "products",
      "branches",
      "sales",
      "invoices",
      "entries",
      "manufacturers",
      "warehouseLocations",
    ],
  },
  analytics: {
    keys: ["categories", "products", "sales", "entries", "invoices", "quotations"],
  },
  history: {
    keys: [
      "categories",
      "products",
      "branches",
      "sales",
      "entries",
      "quotations",
      "clients",
      "invoices",
    ],
  },
  outsourced: {
    keys: [
      "categories",
      "products",
      "entries",
      "quotations",
      "clients",
      "sales",
      "invoices",
      "branding",
    ],
  },
  services: {
    keys: ["categories", "products", "quotations", "clients", "branding"],
    productsLite: true,
  },
}
