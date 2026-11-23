type DownloadFxEvent = {
  filename: string
}

type Listener = (event: DownloadFxEvent) => void

const EVENT = "elevate-file-download"

type DownloadFxWindow = Window & {
  __elevateOriginalAnchorClick?: typeof HTMLAnchorElement.prototype.click
  __elevateDownloadFxDoc?: boolean
  __elevateDownloadFxAt?: number
  __elevateDownloadFxKey?: string
}

function fxWindow() {
  return window as DownloadFxWindow
}

export function subscribeDownloadFx(listener: Listener) {
  if (typeof window === "undefined") return () => {}
  const handler = (event: Event) => {
    const filename = String((event as CustomEvent<DownloadFxEvent>).detail?.filename || "Download")
    listener({ filename })
  }
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

export function notifyFileDownload(filename?: string | null) {
  if (typeof window === "undefined") return
  const name = String(filename || "").trim() || "Download"
  const flagged = fxWindow()
  const now = Date.now()
  const key = name.toLowerCase()
  if (key === flagged.__elevateDownloadFxKey && now - (flagged.__elevateDownloadFxAt || 0) < 700) {
    return
  }
  flagged.__elevateDownloadFxKey = key
  flagged.__elevateDownloadFxAt = now
  window.dispatchEvent(new CustomEvent<DownloadFxEvent>(EVENT, { detail: { filename: name } }))
}

function filenameFromAnchor(el: HTMLAnchorElement) {
  const attr = el.getAttribute("download")
  if (attr) return attr
  try {
    const path = decodeURIComponent(new URL(el.href, window.location.href).pathname)
    return path.split("/").pop() || "Download"
  } catch {
    return "Download"
  }
}

export function installDownloadFx() {
  if (typeof window === "undefined") return
  const flagged = fxWindow()
  if (!flagged.__elevateOriginalAnchorClick) {
    flagged.__elevateOriginalAnchorClick = HTMLAnchorElement.prototype.click
  }
  const originalClick = flagged.__elevateOriginalAnchorClick
  HTMLAnchorElement.prototype.click = function patchedAnchorClick(this: HTMLAnchorElement) {
    if (this.hasAttribute("download")) {
      notifyFileDownload(filenameFromAnchor(this))
    }
    return originalClick.call(this)
  }

  if (flagged.__elevateDownloadFxDoc) return
  flagged.__elevateDownloadFxDoc = true
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[download]")
      if (anchor instanceof HTMLAnchorElement) {
        notifyFileDownload(filenameFromAnchor(anchor))
      }
    },
    true,
  )
}
