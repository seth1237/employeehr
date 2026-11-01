"use client"

import type { InvoiceDocumentSettings, TenantBranding } from "@/lib/stock-document-pdf"

type TransferLine = {
  lineId?: string
  kind?: string
  name: string
  code?: string
  quantity: number
  notes?: string
}

export type TransferDocumentPreviewData = {
  documentNumber: string
  createdAt?: string
  kind?: string
  status?: string
  fromBranchName: string
  fromBranchCode?: string
  toBranchName: string
  toBranchCode?: string
  issuedByName?: string
  requestedByName?: string
  receivedByName?: string
  reason?: string
  carrier?: string
  vehicleReg?: string
  reference?: string
  lines: TransferLine[]
}

function kindLabel(kind?: string) {
  if (kind === "inventory") return "Inventory"
  if (kind === "asset") return "Fixed asset"
  if (kind === "employee") return "Employee"
  if (kind === "mixed") return "Mixed"
  return kind || "Transfer"
}

function watermarkFor(status?: string) {
  if (status === "draft") return "DRAFT"
  if (status === "in_transit") return "IN TRANSIT"
  if (status === "received") return "RECEIVED"
  if (status === "cancelled") return "CANCELLED"
  return null
}

export function TransferDocumentPreview({
  document,
  branding,
  settings,
  className = "",
}: {
  document: TransferDocumentPreviewData
  branding?: TenantBranding
  settings?: InvoiceDocumentSettings
  className?: string
}) {
  const primary = branding?.primaryColor || "#0f766e"
  const watermark = watermarkFor(document.status)
  const phone = settings?.contactPhone || branding?.phone
  const email = settings?.contactEmail || settings?.invoiceEmail || branding?.email
  const location = settings?.officeLocation || [branding?.city, branding?.country].filter(Boolean).join(", ")

  return (
    <div
      className={`relative mx-auto max-w-[820px] overflow-hidden rounded-lg border bg-white text-slate-800 shadow-sm print:shadow-none print:border-0 ${className}`}
    >
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="rotate-[-30deg] text-6xl font-bold uppercase tracking-widest text-slate-200/80">
            {watermark}
          </span>
        </div>
      )}

      <div className="border-b px-8 py-6" style={{ borderColor: `${primary}33` }}>
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            {branding?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo}
                alt={branding.name || "Company"}
                className="h-12 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <p className="text-lg font-semibold" style={{ color: primary }}>
                {branding?.name || "Your Company"}
              </p>
            )}
            <div className="space-y-0.5 text-xs text-slate-500">
              {location ? <p>{location}</p> : null}
              {phone ? <p>{phone}</p> : null}
              {email ? <p>{email}</p> : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight" style={{ color: primary }}>
              TRANSFER
            </p>
            <p className="mt-2 text-sm">
              <span className="text-slate-500">No:</span>{" "}
              <span className="font-medium">{document.documentNumber}</span>
            </p>
            {document.createdAt ? (
              <p className="text-sm">
                <span className="text-slate-500">Issued:</span>{" "}
                {new Date(document.createdAt).toLocaleDateString("en-KE")}
              </p>
            ) : null}
            <p className="text-sm">
              <span className="text-slate-500">Type:</span> {kindLabel(document.kind)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-8 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">From branch</p>
          <p className="mt-1 font-medium">{document.fromBranchName}</p>
          {document.fromBranchCode ? (
            <p className="text-sm text-slate-600">Code {document.fromBranchCode}</p>
          ) : null}
          <p className="text-sm text-slate-600">
            Issued by {document.issuedByName || document.requestedByName || "—"}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">To branch</p>
          <p className="mt-1 font-medium">{document.toBranchName}</p>
          {document.toBranchCode ? (
            <p className="text-sm text-slate-600">Code {document.toBranchCode}</p>
          ) : null}
          <p className="text-sm text-slate-600">
            Received by {document.receivedByName || "Pending receipt"}
          </p>
        </div>
      </div>

      {(document.reason || document.carrier || document.vehicleReg || document.reference) && (
        <div className="px-8 pb-2 text-sm text-slate-600">
          {[
            document.reason && `Reason: ${document.reason}`,
            document.carrier && `Carrier: ${document.carrier}`,
            document.vehicleReg && `Vehicle: ${document.vehicleReg}`,
            document.reference && `Ref: ${document.reference}`,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </div>
      )}

      <div className="px-8 pb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium w-20 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {(document.lines || []).map((line, idx) => (
              <tr key={line.lineId || `${line.name}-${idx}`} className="border-b">
                <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{line.name}</p>
                  <p className="text-xs text-slate-500">
                    {[kindLabel(line.kind), line.code, line.notes].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-3 py-2 text-right font-medium">{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-8 border-t px-8 py-6 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Issued by (sending branch)
          </p>
          <div className="mt-8 border-b border-slate-300" />
          <p className="mt-2">{document.issuedByName || document.requestedByName || "Name & signature"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Received by (destination branch)
          </p>
          <div className="mt-8 border-b border-slate-300" />
          <p className="mt-2">{document.receivedByName || "Name & signature"}</p>
        </div>
      </div>

      <div className="border-t px-8 py-4 text-xs text-slate-600">
        <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Authorization</p>
        This document authorizes movement of the listed inventory, assets, and/or employees. Goods
        remain in transit until the destination branch records receipt.
      </div>
    </div>
  )
}
