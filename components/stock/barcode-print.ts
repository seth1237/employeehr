"use client"

import { stockApi } from "@/lib/api"

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function printBarcodeLabels(
  items: Array<{
    name: string
    sku: string
    sellingPrice?: number
    copies?: number
  }>,
) {
  const mod: any = await import("jsbarcode")
  const JsBarcode = mod.default || mod
  const labels = items.flatMap((item) => {
    const copies = Math.max(1, Number(item.copies || 1))
    return Array.from({ length: copies }, () => item)
  })
  if (!labels.length) return

  const markup = labels
    .map((item) => {
      const sku = String(item.sku || "").trim()
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      JsBarcode(svg, sku, {
        format: "CODE128",
        displayValue: true,
        fontSize: 12,
        height: 48,
        margin: 4,
        width: 1.6,
      })
      const price =
        item.sellingPrice != null && Number.isFinite(Number(item.sellingPrice))
          ? `<div class="price">KES ${Number(item.sellingPrice).toLocaleString("en-KE")}</div>`
          : ""
      return `<div class="label">${svg.outerHTML}<div class="name">${escapeHtml(item.name)}</div>${price}<div class="sku">${escapeHtml(sku)}</div></div>`
    })
    .join("")

  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  frame.style.position = "fixed"
  frame.style.right = "0"
  frame.style.bottom = "0"
  frame.style.width = "0"
  frame.style.height = "0"
  frame.style.border = "0"
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) {
    frame.remove()
    return
  }
  doc.open()
  doc.write(`<!doctype html><html><head><title>Barcode labels</title>
    <style>
      @page { margin: 10mm; }
      body { font-family: sans-serif; margin: 0; }
      .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
      .label { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
      .name { font-size: 12px; font-weight: 600; margin-top: 4px; }
      .price, .sku { font-size: 11px; color: #334155; }
      svg { max-width: 100%; height: auto; }
    </style></head><body><div class="sheet">${markup}</div></body></html>`)
  doc.close()
  await new Promise((resolve) => setTimeout(resolve, 250))
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  setTimeout(() => frame.remove(), 1000)
}

export async function printProductLabels(product: {
  _id?: string
  id?: string
  name: string
  sku?: string
  sellingPrice?: number
  unitPrice?: number
  currentQuantity?: number
}, copies?: number) {
  await printSelectedProductLabels([product], copies)
}

export async function printSelectedProductLabels(
  products: Array<{
    _id?: string
    id?: string
    name: string
    sku?: string
    sellingPrice?: number
    unitPrice?: number
  }>,
  copies = 1,
) {
  const count = Math.max(1, Number(copies || 1))
  const printable = products
    .map((product) => ({
      id: String(product._id || product.id || ""),
      name: product.name,
      sku: String(product.sku || "").trim(),
      sellingPrice: product.sellingPrice ?? product.unitPrice,
    }))
    .filter((product) => product.sku)

  if (!printable.length) {
    throw new Error("Select products that already have a SKU")
  }

  await printBarcodeLabels(
    printable.map((product) => ({
      name: product.name,
      sku: product.sku,
      sellingPrice: product.sellingPrice,
      copies: count,
    })),
  )

  await Promise.all(
    printable.map(async (product) => {
      if (!product.id) return
      try {
        await stockApi.recordProductLabelsPrinted(product.id, count)
      } catch {
        // Printing still succeeded.
      }
    }),
  )

  return { printed: printable.length, skipped: products.length - printable.length }
}

export async function printBinLabels(
  locations: Array<{ code?: string; name?: string }>,
) {
  await printBarcodeLabels(
    locations
      .filter((row) => row.code)
      .map((row) => ({
        name: row.name || row.code || "Bin",
        sku: String(row.code),
        copies: 1,
      })),
  )
}
