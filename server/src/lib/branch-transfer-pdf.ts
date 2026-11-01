import { generateBranchTransferPdf } from "./stock-document-pdf"
import { getCompanyDocumentContext } from "../services/companyDocumentSettings.service"
import type { IBranchTransfer } from "../models/BranchTransfer"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function resolveLogoDataUrl(logo?: string): Promise<string | undefined> {
  if (!logo) return undefined
  const raw = String(logo).trim()
  if (!raw) return undefined
  if (raw.startsWith("data:")) return raw

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const resp = await fetch(raw)
      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "image/png"
        const buffer = Buffer.from(await resp.arrayBuffer())
        return `data:${contentType};base64,${buffer.toString("base64")}`
      }
    } catch {
      return undefined
    }
    return undefined
  }

  try {
    const logoFileName = path.basename(raw)
    const candidatePaths = [
      path.join(process.cwd(), "uploads", "logos", logoFileName),
      path.join(process.cwd(), "server", "uploads", "logos", logoFileName),
      path.join(__dirname, "..", "..", "uploads", "logos", logoFileName),
    ]
    for (const filePath of candidatePaths) {
      try {
        const fileBuf = await fs.readFile(filePath)
        const ext = path.extname(logoFileName).toLowerCase()
        const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png"
        return `data:${mime};base64,${fileBuf.toString("base64")}`
      } catch {
        // try next
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

function kindLabel(kind: string) {
  if (kind === "inventory") return "Inventory"
  if (kind === "asset") return "Fixed asset"
  if (kind === "employee") return "Employee"
  return "Mixed"
}

function watermarkFor(status?: string) {
  if (status === "draft") return "DRAFT"
  if (status === "in_transit") return "IN TRANSIT"
  if (status === "received") return "RECEIVED"
  if (status === "cancelled") return "CANCELLED"
  return undefined
}

export async function buildBranchTransferPdf(docData: IBranchTransfer): Promise<Buffer> {
  const { branding, invoiceSettings } = await getCompanyDocumentContext(docData.org_id)
  const logo = await resolveLogoDataUrl(branding.logo)
  const branded = { ...branding, logo: logo || branding.logo }

  const items = (docData.lines || []).map((line) => {
    const extra = [kindLabel(line.kind), line.code, line.serialNumber, line.notes]
      .filter(Boolean)
      .join(" · ")
    return {
      productName: line.name,
      quantity: Number(line.quantity || 1),
      unitPrice: 0,
      lineTotal: 0,
      description: extra || undefined,
    }
  })

  const pdf = generateBranchTransferPdf({
    documentNumber: docData.documentNumber,
    createdAt: String(docData.issuedAt || docData.createdAt || new Date().toISOString()),
    kind: docData.kind,
    status: docData.status,
    fromBranch: {
      name: docData.fromBranchName,
      code: docData.fromBranchCode,
      issuedBy: docData.issuedByName || docData.requestedByName,
    },
    toBranch: {
      name: docData.toBranchName,
      code: docData.toBranchCode,
      receivedBy: docData.receivedByName,
    },
    items,
    reason: docData.reason,
    carrier: docData.carrier,
    vehicleReg: docData.vehicleReg,
    reference: docData.reference,
    branding: branded,
    invoiceSettings: {
      ...invoiceSettings,
      includePaymentChannels: false,
    },
    preparedBy: docData.issuedByName || docData.requestedByName || branded.name || "Branch admin",
    watermarkText: watermarkFor(docData.status),
    autoSave: false,
  })

  return Buffer.from(pdf.output("arraybuffer"))
}
