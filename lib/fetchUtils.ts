import { API_URL } from './apiBase'
import { getToken } from './auth'

export interface ParsedResponse<T = any> {
  response: Response
  data: T | null
  errorMessage: string | null
  rawText: string
}

function parseRawText(rawText: string): any {
  try {
    return rawText ? JSON.parse(rawText) : null
  } catch {
    return null
  }
}

function getErrorMessage(response: Response, parsedBody: any, rawText: string): string {
  if (parsedBody && typeof parsedBody === 'object') {
    if (typeof parsedBody.message === 'string' && parsedBody.message.trim()) {
      return parsedBody.message
    }
    if (typeof parsedBody.error === 'string' && parsedBody.error.trim()) {
      return parsedBody.error
    }
    if (typeof parsedBody.success === 'boolean' && parsedBody.success === false) {
      if (typeof parsedBody.message === 'string' && parsedBody.message.trim()) {
        return parsedBody.message
      }
      if (typeof parsedBody.error === 'string' && parsedBody.error.trim()) {
        return parsedBody.error
      }
    }
    const stringified = JSON.stringify(parsedBody)
    if (stringified && stringified !== '{}') {
      return stringified
    }
  }

  const trimmedText = rawText?.trim()
  if (trimmedText) {
    // If the server returned HTML (e.g. Next.js notFound page), extract a concise message
    if (/^<!doctype html>/i.test(trimmedText) || /^</.test(trimmedText)) {
      // Prefer the <title> tag if present, else strip tags and trim to a short snippet
      const titleMatch = trimmedText.match(/<title[^>]*>(.*?)<\/title>/i)
      if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim()
      }

      const stripped = trimmedText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const snippet = stripped.substring(0, 200)
      return stripped.length > 200 ? `${snippet}...` : snippet
    }
    return trimmedText
  }
  if (response.statusText) return response.statusText
  return `HTTP ${response.status}`
}

export async function parseResponse<T = any>(response: Response): Promise<ParsedResponse<T>> {
  const rawText = await response.text()
  const data = parseRawText(rawText) as T | null
  const errorMessage = response.ok ? null : getErrorMessage(response, data, rawText)
  return {
    response,
    data,
    errorMessage,
    rawText,
  }
}

export async function fetchJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<ParsedResponse<T>> {
  let url = input
  if (typeof input === 'string' && input.startsWith('/api')) {
    url = `${API_URL}${input}`
  }
  
  // Merge auth headers if token exists
  const token = getToken()
  const headers = {
    ...init?.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
  
  const response = await fetch(url, {
    ...init,
    headers
  })
  
  return parseResponse<T>(response)
}
