export type CftExportJob = {
  name: string
  paths: string[]
  tableId?: string | null
}

/** Priority modules for Accord ERP ingest */
export const CFT_PRIORITY_JOBS: CftExportJob[] = [
  {
    name: "invoices",
    paths: [
      "index.php/invoices_header/all_posted_invoices/",
      "index.php/invoices_header/all_cleared_invoices",
      "index.php/invoices_header/all_voided_invoices",
    ],
    tableId: "infotable",
  },
  {
    name: "clients",
    paths: ["index.php/clients/customers"],
    tableId: null,
  },
  {
    name: "quotes",
    paths: ["index.php/quotes"],
    tableId: null,
  },
]

export const CFT_BASE_URL = process.env.CFT_BASE_URL || "https://cloud.cft.co.ke"
export const CFT_RAW_DB = process.env.CFT_RAW_DB || "cft_raw"
export const CFT_TARGET_ORG_ID = process.env.CFT_TARGET_ORG_ID || "6a44f74def187ec13c55c90f"
export const CFT_TARGET_EMAIL = process.env.CFT_TARGET_EMAIL || "accordmedsupplies@gmail.com"
