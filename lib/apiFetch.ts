import { rewriteApiUrl } from "@/lib/apiBase"

export function withNoStoreHeaders(headers?: HeadersInit): Record<string, string> {
  return {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    ...(headers as Record<string, string>),
  }
}

function withCacheBust(input: RequestInfo) {
  if (typeof input !== "string") return input
  const joiner = input.includes("?") ? "&" : "?"
  return `${input}${joiner}_=${Date.now()}`
}

export async function fetchNoStore(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  const method = String(init?.method || "GET").toUpperCase()
  let url = typeof input === "string" ? rewriteApiUrl(input) : input
  if (method === "GET" && typeof url === "string") {
    url = withCacheBust(url)
  }
  const headers = withNoStoreHeaders(init?.headers)

  let response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  })

  if (response.status === 304) {
    response = await fetch(withCacheBust(url), {
      ...init,
      cache: "reload",
      headers,
    })
  }

  return response
}

export async function readResponseText(response: Response) {
  try {
    return await response.text()
  } catch {
    return ""
  }
}
