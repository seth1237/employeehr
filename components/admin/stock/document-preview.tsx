"use client"

import type {
  DocumentClient,
  DocumentItem,
  InvoiceDocumentSettings,
  TenantBranding,
} from "@/lib/stock-document-pdf"

export type StockDocumentData = {
  kind: "invoice" | "quotation"
  number: string
  deliveryNoteNumber?: string
  quotationNumber?: string
  createdAt?: string
  client: DocumentClient
  items: DocumentItem[]
  subTotal: number
  status?: string
  preparedBy?: string
}

function formatMoney(value: number) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function StockDocumentPreview({
  document,
  branding,
  settings,
  className = "",
}: {
  document: StockDocumentData
  branding?: TenantBranding
  settings?: InvoiceDocumentSettings
  className?: string
}) {
  const primary = branding?.primaryColor || "#0f766e"
  const title = document.kind === "invoice" ? "Invoice" : "Quotation"
  const watermark =
    document.status === "paid"
      ? "PAID"
      : document.status === "cancelled"
        ? "CANCELLED"
        : null

  return (
    <div
      id="stock-document-preview"
      className={`relative mx-auto max-w-[820px] rounded-lg border bg-white text-slate-800 shadow-sm print:shadow-none print:border-0 ${className}`}
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
            <div className="text-xs text-slate-500 space-y-0.5">
              {settings?.officeLocation && <p>{settings.officeLocation}</p>}
              {(settings?.contactPhone || branding?.phone) && (
                <p>{settings?.contactPhone || branding?.phone}</p>
              )}
              {(settings?.contactEmail || branding?.email) && (
                <p>{settings?.contactEmail || branding?.email}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight" style={{ color: primary }}>
              {title.toUpperCase()}
            </p>
            <p className="mt-2 text-sm">
              <span className="text-slate-500">No:</span>{" "}
              <span className="font-medium">{document.number}</span>
            </p>
            {document.createdAt && (
              <p className="text-sm">
                <span className="text-slate-500">Date:</span>{" "}
                {new Date(document.createdAt).toLocaleDateString("en-KE")}
              </p>
            )}
            {document.deliveryNoteNumber && settings?.includeDeliveryNoteNumber !== false && (
              <p className="text-sm">
                <span className="text-slate-500">DN:</span> {document.deliveryNoteNumber}
              </p>
            )}
            {document.quotationNumber && settings?.includeQuotationReference !== false && (
              <p className="text-sm">
                <span className="text-slate-500">Quote ref:</span> {document.quotationNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-8 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bill to
          </p>
          <p className="mt-1 font-medium">{document.client.name}</p>
          {document.client.number && (
            <p className="text-sm text-slate-600">{document.client.number}</p>
          )}
          {document.client.location && (
            <p className="text-sm text-slate-600">{document.client.location}</p>
          )}
        </div>
        {document.preparedBy && settings?.includePreparedBy !== false && (
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prepared by
            </p>
            <p className="mt-1 font-medium">{document.preparedBy}</p>
          </div>
        )}
      </div>

      <div className="px-8 pb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium w-16">Qty</th>
              <th className="px-3 py-2 font-medium w-28">Unit price</th>
              <th className="px-3 py-2 font-medium w-28 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {document.items.map((item, idx) => (
              <tr key={`${item.productName}-${idx}`} className="border-b">
                <td className="px-3 py-2">
                  <p className="font-medium">{item.productName}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500">{item.description}</p>
                  )}
                </td>
                <td className="px-3 py-2">{item.quantity}</td>
                <td className="px-3 py-2">{formatMoney(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatMoney(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="min-w-[220px] space-y-1 text-sm">
            <div className="flex justify-between gap-8 border-t pt-2 font-semibold">
              <span>Subtotal</span>
              <span>{formatMoney(document.subTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {settings?.termsAndConditions && (
        <div className="border-t px-8 py-4 text-xs text-slate-600 whitespace-pre-wrap">
          <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
            Terms & conditions
          </p>
          {settings.termsAndConditions}
        </div>
      )}
    </div>
  )
}
