const TARGET_BYTES = 160 * 1024
const HARD_MAX_BYTES = 200 * 1024
const EDGE_STEPS = [1080, 880, 720, 560]
const QUALITY_STEPS = [0.5, 0.4, 0.32, 0.24]

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function yieldUi() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

function scaleToEdge(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

async function bitmapFromElement(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not read photo")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "medium"
  ctx.drawImage(source, 0, 0, width, height)
  return createImageBitmap(canvas)
}

async function loadScaledFromImage(file: File, maxEdge: number) {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Could not read photo"))
      img.src = url
    })
    const naturalW = image.naturalWidth || image.width
    const naturalH = image.naturalHeight || image.height
    const sized = scaleToEdge(naturalW, naturalH, maxEdge)
    try {
      return await createImageBitmap(image, {
        resizeWidth: sized.width,
        resizeHeight: sized.height,
        resizeQuality: "medium",
        imageOrientation: "from-image",
      } as ImageBitmapOptions)
    } catch {
      return bitmapFromElement(image, sized.width, sized.height)
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function loadImageBitmap(file: File) {
  if (file.size > 1.5 * 1024 * 1024) {
    return loadScaledFromImage(file, 2400)
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)
  } catch {
    try {
      return await createImageBitmap(file)
    } catch {
      return loadScaledFromImage(file, 2400)
    }
  }
}

async function downscaleBitmap(bitmap: ImageBitmap, maxEdge: number) {
  let current = bitmap
  let ownsCurrent = false
  let width = current.width
  let height = current.height

  while (Math.max(width, height) > maxEdge * 1.6) {
    width = Math.max(1, Math.round(width / 2))
    height = Math.max(1, Math.round(height / 2))
    const next = await bitmapFromElement(current, width, height)
    if (ownsCurrent) current.close?.()
    current = next
    ownsCurrent = true
    await yieldUi()
  }

  const target = scaleToEdge(current.width, current.height, maxEdge)
  if (target.width === current.width && target.height === current.height) return current
  const next = await bitmapFromElement(current, target.width, target.height)
  if (ownsCurrent) current.close?.()
  return next
}

function drawBitmap(bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not compress image")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "medium"
  ctx.drawImage(bitmap, 0, 0)
  return canvas
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality: number) {
  const webp = await canvasToBlob(canvas, "image/webp", quality)
  if (webp && webp.size > 0) return webp
  const jpeg = await canvasToBlob(canvas, "image/jpeg", Math.min(0.72, quality + 0.12))
  if (jpeg && jpeg.size > 0) return jpeg
  return null
}

function asFile(blob: Blob, originalName: string) {
  const extension = blob.type === "image/webp" ? "webp" : "jpg"
  const base = originalName.replace(/\.[^.]+$/, "") || "job-card"
  return new File([blob], `${base}.${extension}`, {
    type: blob.type || `image/${extension}`,
    lastModified: Date.now(),
  })
}

export async function compressJobCardPhoto(file: File) {
  if ((file.type === "image/webp" || file.type === "image/jpeg") && file.size <= TARGET_BYTES) {
    return file
  }

  const source = await loadImageBitmap(file)
  let best: Blob | null = null

  try {
    for (const edge of EDGE_STEPS) {
      const bitmap = await downscaleBitmap(source, edge)
      const canvas = drawBitmap(bitmap)
      if (bitmap !== source) bitmap.close?.()
      await yieldUi()

      for (const quality of QUALITY_STEPS) {
        const blob = await encodeCanvas(canvas, quality)
        if (!blob) continue
        if (!best || blob.size < best.size) best = blob
        if (blob.size <= TARGET_BYTES) return asFile(blob, file.name)
        await yieldUi()
      }

      if (best && best.size <= HARD_MAX_BYTES) return asFile(best, file.name)
    }
  } finally {
    source.close?.()
  }

  if (!best) throw new Error("Could not convert photo")
  return asFile(best, file.name)
}
