export function qrImageUrl(data: string, size = 360) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&data=${encodeURIComponent(data)}`
}

function escapeHtml(value?: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function printMachineQr(machine: {
  productName?: string
  serialNumber?: string
  client?: { name?: string }
  installationLocation?: string
  publicUrl?: string
}) {
  const url = String(machine.publicUrl || "")
  if (!url) return
  const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=720")
  if (!win) return
  const qr = qrImageUrl(url, 420)
  win.document.write(`<!doctype html>
<html>
  <head>
    <title>QR · ${machine.productName || "Machine"}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 28px; color: #0f172a; }
      .card { border: 2px solid #0f766e; border-radius: 16px; padding: 24px; text-align: center; }
      h1 { font-size: 18px; margin: 0 0 6px; }
      p { margin: 4px 0; font-size: 13px; color: #475569; }
      img { width: 280px; height: 280px; margin: 16px 0; }
      .url { font-size: 11px; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="card">
      <p style="letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:#0f766e;font-weight:700;">Technical Service</p>
      <h1>${escapeHtml(machine.productName || "Machine")}</h1>
      <p>${escapeHtml(machine.client?.name || "")}</p>
      <p>${machine.serialNumber ? `SN ${escapeHtml(machine.serialNumber)}` : ""} ${machine.installationLocation ? `· ${escapeHtml(machine.installationLocation)}` : ""}</p>
      <img src="${escapeHtml(qr)}" alt="Machine QR code" />
      <p><strong>Scan to request service, report a breakdown, or order a product.</strong></p>
      <p class="url">${escapeHtml(url)}</p>
    </div>
    <script>setTimeout(function(){window.print()}, 400)</script>
  </body>
</html>`)
  win.document.close()
}
