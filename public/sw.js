const CACHE = "field-app-v2"

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/pwa-icon-192.png", "/pwa-icon-512.png", "/pwa-icon-maskable-512.png"]).catch(() => undefined),
    ),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === "navigate") return
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return
  if (url.pathname === "/sw.js" || url.pathname.endsWith(".webmanifest")) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
      .catch(() => caches.match(request)),
  )
})
