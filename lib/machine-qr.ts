export const MACHINE_QR_PUBLIC_ORIGIN = "https://elevatehub.co.ke"

export function machineQrPublicOrigin() {
  return MACHINE_QR_PUBLIC_ORIGIN
}

export function qrImageUrl(data: string, size = 360) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&data=${encodeURIComponent(data)}`
}

function qrFilename(machine: { productName?: string; serialNumber?: string }) {
  const parts = [machine.productName, machine.serialNumber].map((value) =>
    String(value || "")
      .trim()
      .replace(/[^\w]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
  )
  const slug = parts.filter(Boolean).join("-") || "machine"
  return `QR-${slug}.png`
}

async function qrImageBlob(src: string) {
  try {
    const response = await fetch(src, { mode: "cors" })
    if (!response.ok) throw new Error("Could not fetch QR")
    return await response.blob()
  } catch {
    return new Promise<Blob>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth || 800
        canvas.height = img.naturalHeight || 800
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not save QR"))
          return
        }
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Could not save QR"))
        }, "image/png")
      }
      img.onerror = () => reject(new Error("Could not load QR"))
      img.src = src
    })
  }
}

export async function downloadMachineQr(machine: {
  productName?: string
  serialNumber?: string
  publicUrl?: string
}) {
  const url = String(machine.publicUrl || "")
  if (!url) throw new Error("This machine has no QR yet.")
  const blob = await qrImageBlob(qrImageUrl(url, 800))
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = qrFilename(machine)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}
